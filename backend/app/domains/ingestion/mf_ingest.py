from os import name

import requests
import asyncio
import aiohttp
import nest_asyncio
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.domains.ingestion.schemas import (
    InstrumentType,
    MutualFundNavResponse,
    SchemeMeta,
    SchemeClass,
    OptionType,
    PlanType,
    SchemeSubCategory
)
from app.core.logging import logger

nest_asyncio.apply()


class MFAPIFetcher:
    """Fetch filtered latest schemes and fetch scheme-wise NAV data asynchronously."""

    def __init__(self, base_url: str = "https://api.mfapi.in/mf", max_concurrent: int = 5):
        """Initialize API base url and concurrency control."""
        self.base_url = base_url
        self.max_concurrent = max_concurrent
        logger.info("MFAPIFetcher initialized")

    def fetch_recent_active_schemes(self, days: int) -> List[Dict[str, Any]]:
        """Return Direct Growth Open Ended funds updated within given days."""
        url = f"{self.base_url}/latest"
        logger.info(f"Fetching latest schemes (last {days} days)")

        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            logger.error(f"Failed to fetch latest schemes: {e}")
            return []

        funds = []
        cutoff_date = datetime.now() - timedelta(days=days)

        for item in data:
            try:
                scheme_type = item.get("schemeType", "")
                scheme_name = item.get("schemeName", "")
                scheme_category = item.get("schemeCategory", "")
                scheme_code = item.get("schemeCode")
                date_str = item.get("date", "")

                if scheme_type != "Open Ended Schemes":
                    continue

                name_lower = scheme_name.lower()

                if "direct" not in name_lower:
                    continue

                if "growth" not in name_lower:
                    continue

                if any(x in name_lower for x in [
                    "regular", "idcw", "bonus", "segregated", "seg. portfolio", "seg portfolio", "unclaimed"
                ]):
                    continue

                try:
                    parsed_date = datetime.strptime(date_str, "%d-%m-%Y")
                except ValueError:
                    logger.warning(f"Invalid date format for scheme_code={scheme_code}")
                    continue

                if parsed_date >= cutoff_date:
                    funds.append({
                        "scheme_code": scheme_code,
                        "scheme_name": scheme_name,
                        "scheme_category": scheme_category
                    })

            except Exception as e:
                logger.warning(f"Skipping scheme due to processing error: {e}")
                continue

        logger.info(f"Filtered {len(funds)} eligible schemes")
        return funds
    
    ## Normalizing Hard codes so new Fund houses are not affected 
    @staticmethod
    def normalize_fund_house(name: str) -> str:
        """Normalize fund house name by fixing quant casing only"""
        if not name:
            return name

        name = name.strip()

        if name == "quant Mutual Fund":
            return "Quant Mutual Fund"

        return name

    @staticmethod
    def normalize_scheme_sub_category(value: str, is_enum: bool) -> str:
        """Normalize scheme sub-category string for consistent enum matching"""
        if not value:
            return value

        v = value.lower().strip()

        # Basic cleanup
        v = v.replace("&", "and")
        v = v.replace("/", " ")
        v = v.replace("-", " ")
        v = v.replace("funds", "fund")

        # Remove possessive forms ('s and ’s)
        v = v.replace("'s", "")
        v = v.replace("’s", "")
        
        # Remove brackets but keep content
        v = v.replace("(", " ")
        v = v.replace(")", " ")

        v = " ".join(v.split())

        # Apply mapping ONLY for API values, Match to ENUM SchemeSubCategory, After Normalization
        # Right we have values for ENUMS normalized and left keys we have API values normalized. We want to match them.
        if not is_enum:
            normalization_map = {
                "dynamic asset allocation or balanced advantage": "dynamic asset allocation fund",
                "retirement fund": "solution oriented retirement fund",
                "children fund": "solution oriented children fund",
                "sectoral thematic": "sectoral thematic fund",
                "multi asset allocation": "multi asset allocation fund",
                "elss": "elss fund",
                "dynamic bond": "dynamic bond fund",
                "equity savings": "equity savings fund",
                "fund of funds domestic": "fofs domestic",
                "fof domestic": "fofs domestic",
                "fund of funds overseas": "fofs overseas",
                "fof overseas": "fofs overseas",
            }

            v = normalization_map.get(v, v)

        return v

    def _build_scheme_meta(self, raw: dict) -> Optional[SchemeMeta]:
        """Derive and construct SchemeMeta from raw meta dictionary."""

        meta_raw = raw.get("meta", {})

        scheme_name = self._none_if_missing(meta_raw.get("scheme_name") or meta_raw.get("schemeName"))
        scheme_category = self._none_if_missing(
            meta_raw.get("scheme_category") or meta_raw.get("schemeCategory")
        )
        fund_house = self._none_if_missing(meta_raw.get("fund_house") or meta_raw.get("fundHouse"))
        if fund_house:
            fund_house = self.normalize_fund_house(fund_house)
        scheme_code = self._none_if_missing(meta_raw.get("scheme_code") or meta_raw.get("schemeCode"))

        name_lower = (scheme_name or "").lower()
        scheme_sub_name = self._none_if_missing(self._extract_scheme_sub_name(scheme_name))

        # Compute launch_date/current_date and age fields from NAV history
        nav_data = raw.get("data", [])

        if not nav_data:
            raise ValueError("NAV data empty")

        sorted_nav = sorted(
            nav_data,
            key=lambda x: self._parse_nav_date(x["date"])
        )

        launch_date = self._parse_nav_date(sorted_nav[0]["date"])
        current_date = self._parse_nav_date(sorted_nav[-1]["date"])
        current_nav = float(sorted_nav[-1]["nav"])
        prev_nav = float(sorted_nav[-2]["nav"]) if len(sorted_nav) >= 2 else None
        nav_change_1d = (
            round(((current_nav - prev_nav) / prev_nav) * 100, 2)
            if prev_nav not in (None, 0.0)
            else None
        )
        total_active_days = (current_date - launch_date).days
        time_since_inception_years = round(total_active_days / 365.25, 2)
        nav_record_count = len(nav_data)

        # Asset Class Mapping
        scheme_class = SchemeClass.OTHER
        scheme_sub_category = scheme_category

        if scheme_category and "-" in scheme_category:
            left, right = scheme_category.split("-", 1)
            scheme_sub_category_str = right.strip()

            # Normalize API value
            api_value_normalized = self.normalize_scheme_sub_category(scheme_sub_category_str, is_enum=False)

            matched_enum = None

            # 1. Exact match FIRST (highest priority)
            for enum_member in SchemeSubCategory:
                enum_value_normalized = self.normalize_scheme_sub_category(enum_member.value, is_enum=True)
                if enum_value_normalized == api_value_normalized:
                    matched_enum = enum_member
                    break

            # 2. Contains match (only if exact not found)
            if not matched_enum:
                for enum_member in SchemeSubCategory:
                    enum_value_normalized = self.normalize_scheme_sub_category(enum_member.value, is_enum=True)
                    if enum_value_normalized in api_value_normalized:
                        matched_enum = enum_member
                        break

            # 3. Assign result
            if matched_enum:
                scheme_sub_category = matched_enum
            else:
                scheme_sub_category = self._none_if_missing(scheme_sub_category_str)  # fallback instead of breaking

            # Scheme Class Detection
            left = left.strip().lower()

            if "equity" in left:
                scheme_class = SchemeClass.EQUITY
            elif "debt" in left:
                scheme_class = SchemeClass.DEBT
            elif "hybrid" in left:
                scheme_class = SchemeClass.HYBRID
            elif "solution oriented" in left:
                scheme_class = SchemeClass.OTHER
            elif "other" in left:
                scheme_class = SchemeClass.OTHER
            else:
                scheme_class = None

        # Fix: If class is OTHER but sub-category is INDEX, treat as EQUITY
        if (
            scheme_class == SchemeClass.OTHER
            and isinstance(scheme_sub_category, SchemeSubCategory)
            and scheme_sub_category == SchemeSubCategory.INDEX
        ):
            scheme_class = SchemeClass.EQUITY

        # Commodity override based on scheme_sub_name
        sub_name_lower = (scheme_sub_name or "").lower()
        if "gold" in sub_name_lower:
            scheme_class = SchemeClass.COMODITY
            scheme_sub_category = SchemeSubCategory.GOLD
        elif "silver" in sub_name_lower:
            scheme_class = SchemeClass.COMODITY
            scheme_sub_category = SchemeSubCategory.SILVER

        # Option Type
        if "growth" in name_lower:
            option_type = OptionType.GROWTH.value
        elif "idcw" in name_lower:
            option_type = OptionType.IDCW.value
        elif "bonus" in name_lower:
            option_type = OptionType.BONUS.value
        else:
            option_type = OptionType.OTHER.value

        # Plan Type
        if "direct" in name_lower:
            plan_type = PlanType.DIRECT.value
        elif "regular" in name_lower:
            plan_type = PlanType.REGULAR.value
        else:
            plan_type = PlanType.OTHER.value

        required_meta = {
            "instrument_type": InstrumentType.MUTUAL_FUND.value,
            "scheme_code": scheme_code,
            "fund_house": fund_house,
            "scheme_class": scheme_class,
            "scheme_category": scheme_category,
            "scheme_sub_category": scheme_sub_category,
            "scheme_name": scheme_name,
            "scheme_sub_name": scheme_sub_name,
            "launch_date": launch_date,
            "current_date": current_date,
            "current_nav": current_nav,
            "nav_change_1d": nav_change_1d,
            "time_since_inception_years": time_since_inception_years,
            "total_active_days": total_active_days,
            "nav_record_count": nav_record_count,
        }

        missing_fields = [k for k, v in required_meta.items() if v is None]
        if missing_fields:
            logger.warning(
                "Skipping scheme due to missing required meta fields | "
                f"scheme_code={scheme_code} | missing={missing_fields}"
            )
            return None

        return SchemeMeta(
            instrument_type=InstrumentType.MUTUAL_FUND.value,
            scheme_code=scheme_code,
            fund_house=fund_house,
            scheme_class=scheme_class,
            scheme_category=scheme_category,
            scheme_sub_category=scheme_sub_category,
            scheme_name=scheme_name,
            scheme_sub_name=scheme_sub_name,
            launch_date=launch_date,
            current_date=current_date,
            current_nav=current_nav,
            nav_change_1d=nav_change_1d,
            time_since_inception_years=time_since_inception_years,
            total_active_days=total_active_days,
            nav_record_count=nav_record_count,
            option_type=option_type,
            plan_type=plan_type,
            scheme_type=self._none_if_missing(meta_raw.get("scheme_type") or meta_raw.get("schemeType")),
            isin_growth=self._none_if_missing(meta_raw.get("isin_growth") or meta_raw.get("isinGrowth")),
            isin_div_reinvestment=self._none_if_missing(
                meta_raw.get("isin_div_reinvestment") or meta_raw.get("isinDivReinvestment")
            ),
        )

    @staticmethod
    def _parse_nav_date(date_str: str) -> datetime:
        """Parse NAV date from either DD-MM-YYYY or YYYY-MM-DD."""
        for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        raise ValueError(f"Unsupported date format: {date_str}")

    def _filter_weekend_nav(self, nav_data: List[Dict[str, Any]]):
        """Remove Saturday/Sunday NAVs and return filtered data + removed dates."""
        filtered = []
        removed_dates = []

        for item in nav_data:
            try:
                parsed_date = self._parse_nav_date(item.get("date", ""))
            except Exception:
                # Keep unknown formats to avoid accidental data loss
                filtered.append(item)
                continue

            if parsed_date.weekday() >= 5:
                removed_dates.append(parsed_date.date())
            else:
                filtered.append(item)

        return filtered, removed_dates

    def _normalize_nav_splits(
        self,
        nav_data: List[Dict[str, Any]],
        ratio_threshold: float = 20.0
    ):
        """
        Detect abnormal NAV ratio jumps (> ratio_threshold) between consecutive entries and
        adjust historical NAVs using a cumulative scaling factor to normalize split events.
        """
        if not nav_data or len(nav_data) < 2:
            return nav_data, []

        indexed = []
        for idx, item in enumerate(nav_data):
            date_str = item.get("date", "")
            nav_raw = item.get("nav")
            try:
                parsed_date = self._parse_nav_date(date_str)
                nav_val = float(nav_raw)
            except Exception:
                indexed.append((idx, None, None))
                continue
            indexed.append((idx, parsed_date, nav_val))

        valid = [row for row in indexed if row[1] is not None and row[2] is not None and row[2] > 0]
        if len(valid) < 2:
            return nav_data, []

        valid_sorted = sorted(valid, key=lambda x: x[1])

        cumulative_scale = 1.0
        last_nav_raw = None
        adjustments = []
        normalized_values = {}

        # Walk backwards so we scale historical NAVs to the latest scale.
        for idx, date, nav_val in reversed(valid_sorted):
            if last_nav_raw is None:
                normalized_values[idx] = nav_val / cumulative_scale
                last_nav_raw = nav_val
                continue

            # Detect split-like jumps where older NAV is abnormally larger than newer NAV.
            if nav_val > last_nav_raw:
                jump_ratio = nav_val / last_nav_raw
                if jump_ratio > ratio_threshold:
                    cumulative_scale *= jump_ratio
                    adjustments.append({
                        "date": date.strftime("%Y-%m-%d"),
                        "factor": round(jump_ratio, 6),
                        "cumulative_factor": round(cumulative_scale, 6)
                    })

            normalized_values[idx] = nav_val / cumulative_scale
            last_nav_raw = nav_val

        normalized_data = []
        for idx, item in enumerate(nav_data):
            if idx in normalized_values:
                new_item = dict(item)
                new_item["nav"] = f"{normalized_values[idx]:.4f}"
                normalized_data.append(new_item)
            else:
                normalized_data.append(item)

        return normalized_data, adjustments

    @staticmethod
    def _extract_scheme_sub_name(scheme_name: str) -> str:
        """Return base scheme name in title case by removing brackets, plan words and hyphen."""
        if not scheme_name:
            return ""

        cleaned = scheme_name.strip()

        # remove anything inside parentheses
        cleaned = re.sub(r"\(.*?\)", "", cleaned).strip()

        # remove plan/option related words
        cleaned = re.sub(
            r"\b(direct|regular|plan|growth|option|idcw|bonus|segregated|unclaimed)\b",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )

        # remove hyphen
        cleaned = cleaned.replace("-", " ")

        # remove pipe symbol
        cleaned = cleaned.replace("|", " ")

        # remove commas
        cleaned = cleaned.replace(",", " ")

        # normalize 'and' to '&'
        cleaned = re.sub(r"\band\b", "&", cleaned, flags=re.IGNORECASE)

        # standardize FoF naming
        cleaned = re.sub(r"\bfof\b", "Fund of Funds", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bfund of fund\b", "Fund of Funds", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bfund of funds\b", "Fund of Funds", cleaned, flags=re.IGNORECASE)

        # normalize common category words
        cleaned = re.sub(r"\bmidcap\b", "Mid Cap", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bsmallcap\b", "Small Cap", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\blargecap\b", "Large Cap", cleaned, flags=re.IGNORECASE)

        # fix 'largemidcap'
        cleaned = re.sub(r"\blargemidcap\b", "Large Midcap", cleaned, flags=re.IGNORECASE)

        # normalize Nifty naming
        cleaned = re.sub(r"\bnifty\s*50\b", "Nifty 50", cleaned, flags=re.IGNORECASE)

        # fix Nifty IT
        cleaned = re.sub(r"\bniftyit\b", "Nifty IT", cleaned, flags=re.IGNORECASE)

        # fix 3 6 → 3-6 Months
        cleaned = re.sub(r"\b(\d)\s+(\d)\s+Months\b", r"\1-\2 Months", cleaned, flags=re.IGNORECASE)

        # fix 9 12 → 9-12 Months
        cleaned = re.sub(r"\b(\d)\s+(\d{2})\s+Months\b", r"\1-\2 Months", cleaned, flags=re.IGNORECASE)

        # remove consecutive duplicate 'fund fund'
        cleaned = re.sub(r"\b(fund)\s+\1\b", r"\1", cleaned, flags=re.IGNORECASE)

        # remove any duplicate words (extra safety)
        cleaned = re.sub(r"\b(\w+)\s+\1\b", r"\1", cleaned, flags=re.IGNORECASE)

        # normalize spaces
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # hardcoded corrections
        if "uti mmf" in cleaned.lower():
            cleaned = re.sub(r"\buti mmf\b", "UTI Money Market Fund", cleaned, flags=re.IGNORECASE)

        if "motilal oswal large cap" in cleaned.lower():
            cleaned = re.sub(
                r"\b(motilal oswal large cap)(?!\s+fund)\b",
                r"\1 Fund",
                cleaned,
                flags=re.IGNORECASE,
            )

        # fix typo
        cleaned = re.sub(r"\bcomma fund\b", "Commodity Fund", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bheathcare\b", "Healthcare", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\boff\s+shore\b", "Offshore", cleaned, flags=re.IGNORECASE)

        # fix spacing around +
        cleaned = re.sub(r"\s*\+\s*", " + ", cleaned)

        # fix numeric formats like 60 40 → 60:40
        cleaned = re.sub(r"\b60\s*40\b", "60:40", cleaned)
        cleaned = re.sub(r"\b70\s*30\b", "70:30", cleaned)
        cleaned = re.sub(r"\b50\s*50\b", "50:50", cleaned)

        # remove trailing dots
        cleaned = re.sub(r"\.+$", "", cleaned)

        # apply title case first
        cleaned = cleaned.title()

        # fix fund house casing (VERY IMPORTANT)
        replacements = {
            "Hdfc": "HDFC",
            "Icici": "ICICI",
            "Sbi": "SBI",
            "Uti": "UTI",
            "Hsbc": "HSBC",
            "Lic": "LIC",
            "Dsp": "DSP",
            "Psu": "PSU",
            "Bnp": "BNP",
            "Esg": "ESG",
            "Etf": "ETF",
            "Etfs": "ETFs",
            "Mnc": "MNC",
            "Aaa": "AAA",
            "Sdl": "SDL",
            "Mf": "MF",
            "Jm": "JM",
            "Trustmf": "TrustMF",
            "Jioblackrock": "JioBlackRock",
            "Fof": "Fund of Funds",
            "Elss": "ELSS",
            "Bse": "BSE",
            "Crisil Ibx": "CRISIL IBX",
            "Us": "US",
            "it": "IT",
            "pgim": "PGIM",
        }

        for k, v in replacements.items():
            cleaned = re.sub(rf"\b{k}\b", v, cleaned)

        # fix Fund Of Funds casing
        cleaned = re.sub(r"\bFund Of Funds\b", "Fund of Funds", cleaned)

        # fix 'Fund Of Funds Fund'
        cleaned = re.sub(r"\bFund Of Funds Fund\b", "Fund of Funds", cleaned)

        # optional: standardize G-Sec
        cleaned = re.sub(r"\bG\s?Sec\b", "G-Sec", cleaned)

        # fix specific broken names (hardcoded edge cases)
        cleaned = re.sub(r"\bAssethang\b", "Asset Hang", cleaned)
        cleaned = re.sub(r"\bChildren'S\b", "Children's", cleaned)

        # fix duplicate 'Index Fund'
        cleaned = re.sub(r"\bIndex Fund Index Fund\b", "Index Fund", cleaned)

        # fix BSE Sensex naming
        cleaned = re.sub(r"\bIndex Fund Bse Sensex\b", "BSE Sensex Index Fund", cleaned)

        # add missing "Fund"
        if cleaned in {
            "Aditya Birla Sun Life Medium Term",
            "Kotak Debt Hybrid",
            "Kotak Business Cycle",
            "Kotak Banking & PSU Debt",
        }:
            cleaned += " Fund"

        # fix specific incorrect naming
        if cleaned == "Kotak Bond Short Term":
            cleaned = "Kotak Short Term Bond Fund"

        if cleaned == "UTI Liquid Cash":
            cleaned = "UTI Liquid Fund"

        if cleaned == "Franklin India Index Fund Nse Nifty 50 Index Fund":
            cleaned = "Franklin India Nifty 50 Index Fund"

        if cleaned == "Nippon India Index Fund Nifty 50":
            cleaned = "Nippon India Nifty 50 Index Fund"

        if cleaned == "SBI Nifty Index Fund":
            cleaned = "SBI Nifty 50 Index Fund"

        if cleaned == "Kotak Manufacture In India Fund":
            cleaned = "Kotak Manufacturing In India Fund"

        if cleaned == "Bandhan Gilt Fund With 10 Year Constant Duration Fund":
            cleaned = "Bandhan Gilt Fund With 10 Year Constant Duration"

        return cleaned

    @staticmethod
    def _none_if_missing(value):
        """Normalize missing/empty values to None for consistent downstream handling."""
        if value is None:
            return None
        if isinstance(value, str) and value.strip() == "":
            return None
        return value
    
    async def fetch_scheme(self, session, semaphore, scheme_code):
        """Fetch NAV data, enrich meta from raw, then validate full response."""
        async with semaphore:
            max_retries = 4
            for attempt in range(1, max_retries + 1):
                try:
                    async with session.get(f"{self.base_url}/{scheme_code}", timeout=60) as response:
                        if response.status != 200:
                            logger.warning(
                                f"Non-200 response for scheme_code={scheme_code} "
                                f"on attempt {attempt}/{max_retries} (status={response.status})"
                            )
                            if attempt < max_retries:
                                await asyncio.sleep(min(0.5 * attempt, 3))
                                continue
                            return None

                        raw = await response.json()

                        try:
                            nav_data = raw.get("data", [])
                            filtered_nav, removed_dates = self._filter_weekend_nav(nav_data)
                            normalized_nav, split_adjustments = self._normalize_nav_splits(filtered_nav)
                            raw["data"] = normalized_nav
                            raw["removed_weekend_dates"] = [d.strftime("%Y-%m-%d") for d in removed_dates]
                            if split_adjustments:
                                logger.info(
                                    f"Normalized {len(split_adjustments)} split-like NAV jumps "
                                    f"for scheme_code={scheme_code}"
                                )

                            # STEP 1: Enrich meta directly from raw
                            enriched_meta = self._build_scheme_meta(raw)
                            if enriched_meta is None:
                                return None

                            # STEP 2: Inject enriched meta
                            raw["meta"] = enriched_meta.model_dump(mode="json")

                            # STEP 3: Final validation (only once)
                            validated = MutualFundNavResponse.model_validate(raw)

                            return validated.model_dump(mode="json")

                        except Exception as e:
                            logger.warning(f"Validation failed for scheme_code={scheme_code}: {e}")
                            return None

                except Exception as e:
                    logger.warning(
                        f"Error fetching scheme_code={scheme_code} on attempt "
                        f"{attempt}/{max_retries} | type={type(e).__name__} | repr={repr(e)}"
                    )
                    if attempt < max_retries:
                        await asyncio.sleep(min(0.5 * attempt, 3))
                        continue
                    return None

    async def fetch_schemes_from_list(self, schemes_list):
        """Extract scheme_code from dict list and fetch NAV data."""
        connector = aiohttp.TCPConnector(limit=100)
        timeout = aiohttp.ClientTimeout(total=30)

        scheme_codes = [
            item["scheme_code"]
            for item in schemes_list
            if isinstance(item.get("scheme_code"), int) and item["scheme_code"] > 0
        ]
        logger.info(f"Starting NAV fetch for {len(scheme_codes)} schemes")

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            semaphore = asyncio.Semaphore(self.max_concurrent)

            tasks = [
                self.fetch_scheme(session, semaphore, code)
                for code in scheme_codes
            ]

            try:
                results = await asyncio.gather(*tasks, return_exceptions=True)
            except Exception as e:
                logger.error(f"Unexpected async execution error: {e}")
                return []

            final_results = []
            failed_count = 0

            for result in results:
                if isinstance(result, Exception):
                    failed_count += 1
                    continue
                if result is not None:
                    final_results.append(result)
                else:
                    failed_count += 1

            logger.info(
                f"NAV fetch completed | Success: {len(final_results)} | Failed/Skipped: {failed_count}"
            )

            # Post-filter for allowed SchemeSubCategory and SchemeClass enums
            allowed_sub_categories = {e.value for e in SchemeSubCategory}
            allowed_scheme_classes = {e.value for e in SchemeClass}
            invalid_sub_category_counts = {}
            invalid_scheme_class_counts = {}
            removed_scheme_codes = []

            filtered_results = []
            for item in final_results:
                meta = item.get("meta", {})
                sub_category = meta.get("scheme_sub_category")
                scheme_class = meta.get("scheme_class")

                invalid_sub = sub_category not in allowed_sub_categories
                invalid_class = scheme_class not in allowed_scheme_classes

                if invalid_sub:
                    invalid_sub_category_counts[sub_category] = invalid_sub_category_counts.get(sub_category, 0) + 1
                if invalid_class:
                    invalid_scheme_class_counts[scheme_class] = invalid_scheme_class_counts.get(scheme_class, 0) + 1

                if invalid_sub or invalid_class:
                    scheme_code = meta.get("scheme_code")
                    if scheme_code is not None:
                        removed_scheme_codes.append(scheme_code)
                    continue

                filtered_results.append(item)

            removed_count = len(final_results) - len(filtered_results)
            if removed_count:
                logger.warning(
                    f"Removed {removed_count} schemes due to invalid SchemeSubCategory/SchemeClass"
                )
                if removed_scheme_codes:
                    logger.warning(
                        f"Removed scheme_code list: {removed_scheme_codes}"
                    )
                if invalid_sub_category_counts:
                    logger.warning(
                        f"Invalid SchemeSubCategory counts: {invalid_sub_category_counts}"
                    )
                if invalid_scheme_class_counts:
                    logger.warning(
                        f"Invalid SchemeClass counts: {invalid_scheme_class_counts}"
                    )

            logger.info(f"Final schemes ready: {len(filtered_results)}")
            return filtered_results

def run_ingestion():
    """Run mutual fund ingestion pipeline"""
    try:
        fetcher = MFAPIFetcher()
        days = 7
        schemes_list = fetcher.fetch_recent_active_schemes(days)
        data = asyncio.run(fetcher.fetch_schemes_from_list(schemes_list))
        # data = asyncio.run(fetcher.fetch_schemes_from_list(schemes_list[:10]))
        logger.info("NAV fetch | Execution completed successfully")
        return data
    except Exception as e:
        logger.error(f"Fatal error in ingestion execution: {e}")
        raise

# raw_data = run_ingestion()
# print(json.dumps(raw_data, indent=2))
