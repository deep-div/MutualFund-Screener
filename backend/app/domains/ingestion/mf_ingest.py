import requests
import asyncio
import aiohttp
import nest_asyncio
import re
from typing import List, Dict, Any
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
                    "regular", "idcw", "bonus", "segregated", "unclaimed"
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

    @staticmethod
    def normalize_fund_house(name: str) -> str:
        """Normalize fund house name with correct casing rules and special handling"""
        if not name:
            return name

        name = name.strip().lower()

        # Words that should always be uppercase
        UPPER_WORDS = {
            "sbi", "hdfc", "dsp", "uti", "lic", "hsbc",
            "icici", "ppfas", "iti", "nj", "bnp",
            "pgim", "jm"
        }

        # Words that should always be lowercase
        LOWER_WORDS = {"of"}

        # Special brand casing fixes
        SPECIAL_WORDS = {
            "whiteoak": "WhiteOak",
            "blackrock": "BlackRock",
        }

        words = name.split()
        normalized = []

        for i, word in enumerate(words):
            # Special case: 360 ONE
            if i > 0 and words[i - 1] == "360" and word == "one":
                normalized.append("ONE")
            elif word in SPECIAL_WORDS:
                normalized.append(SPECIAL_WORDS[word])
            elif word in UPPER_WORDS:
                normalized.append(word.upper())
            elif word in LOWER_WORDS:
                normalized.append(word.lower())
            else:
                normalized.append(word.capitalize())

        return " ".join(normalized)

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

    def _build_scheme_meta(self, raw: dict) -> SchemeMeta:
        """Derive and construct SchemeMeta from raw meta dictionary."""

        meta_raw = raw.get("meta", {})

        scheme_name = meta_raw.get("scheme_name") or meta_raw.get("schemeName")
        scheme_category = meta_raw.get("scheme_category") or meta_raw.get("schemeCategory") or ""
        fund_house = meta_raw.get("fund_house") or meta_raw.get("fundHouse")
        if fund_house:
            fund_house = self.normalize_fund_house(fund_house)
        scheme_code = meta_raw.get("scheme_code") or meta_raw.get("schemeCode")

        name_lower = (scheme_name or "").lower()
        scheme_sub_name = self._extract_scheme_sub_name(scheme_name)

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
            round(((current_nav - prev_nav) / prev_nav) * 100, 4)
            if prev_nav not in (None, 0.0)
            else None
        )
        total_active_days = (current_date - launch_date).days
        time_since_inception_years = round(total_active_days / 365.25, 2)
        nav_record_count = len(nav_data)

        # Asset Class Mapping
        scheme_class = SchemeClass.OTHER
        scheme_sub_category = scheme_category

        if "-" in scheme_category:
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
                scheme_sub_category = scheme_sub_category_str  # fallback instead of breaking

            # Scheme Class Detection
            left = left.strip().lower()

            if "equity" in left:
                scheme_class = SchemeClass.EQUITY
            elif "debt" in left:
                scheme_class = SchemeClass.DEBT
            elif "hybrid" in left:
                scheme_class = SchemeClass.HYBRID
            else:
                scheme_class = SchemeClass.OTHER

        # Fix: If class is OTHER but sub-category is INDEX, treat as EQUITY
        if (
            scheme_class == SchemeClass.OTHER
            and isinstance(scheme_sub_category, SchemeSubCategory)
            and scheme_sub_category == SchemeSubCategory.INDEX
        ):
            scheme_class = SchemeClass.EQUITY

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
            scheme_type=meta_raw.get("scheme_type") or meta_raw.get("schemeType"),
            isin_growth=meta_raw.get("isin_growth") or meta_raw.get("isinGrowth"),
            isin_div_reinvestment=meta_raw.get("isin_div_reinvestment") or meta_raw.get("isinDivReinvestment"),
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
            r"\b(direct|regular|plan|growth|option)\b",
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
        # remove consecutive duplicate 'fund fund'
        cleaned = re.sub(r"\b(fund)\s+\1\b", r"\1", cleaned, flags=re.IGNORECASE)
        # normalize spaces
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        # hardcoded corrections
        if "uti mmf" in cleaned.lower():
            cleaned = re.sub(r"\buti mmf\b", "Uti Money Market Fund", cleaned, flags=re.IGNORECASE)
        if "motilal oswal large cap" in cleaned.lower():
            cleaned = re.sub(
                r"\b(motilal oswal large cap)(?!\s+fund)\b",
                r"\1 Fund",
                cleaned,
                flags=re.IGNORECASE,
            )
        # remove trailing dots
        cleaned = re.sub(r"\.+$", "", cleaned)
        return cleaned.title()
    
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
                            raw["data"] = filtered_nav
                            raw["removed_weekend_dates"] = [d.strftime("%Y-%m-%d") for d in removed_dates]

                            # STEP 1: Enrich meta directly from raw
                            enriched_meta = self._build_scheme_meta(raw)

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

            return final_results

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
