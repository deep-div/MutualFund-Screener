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
    SchemeType,
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
        """Return Direct Growth Open Ended funds updated within given days, with AMFI fallback."""
        logger.info(f"Fetching latest schemes (last {days} days)")

        data = self._fetch_latest_schemes_from_mfapi()
        source = "mfapi"
        if not data:
            logger.warning("Primary latest-schemes source unavailable. Falling back to AMFI NAVAll.txt")
            data = self._fetch_latest_schemes_from_amfi()
            source = "amfi"

        if not data:
            logger.error("Failed to fetch latest schemes from both primary and fallback sources")
            return []

        funds = []
        cutoff_date = datetime.now() - timedelta(days=days)

        for item in data:
            try:
                scheme_type = self._normalize_scheme_type(item.get("schemeType", ""))
                scheme_name = item.get("schemeName", "")
                scheme_category = item.get("schemeCategory", "")
                scheme_code = item.get("schemeCode")
                fund_house = item.get("fundHouse") or item.get("fund_house")
                isin_div_reinvestment = item.get("isin_div_reinvestment") or item.get("isinDivReinvestment")
                date_str = item.get("date", "")
                isin_code = self._extract_isin_from_latest_item(item)

                if scheme_type != SchemeType.OPEN_ENDED.value:
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

                parsed_date = self._parse_latest_date(date_str)
                if parsed_date is None:
                    logger.warning(f"Invalid date format for scheme_code={scheme_code}")
                    continue

                if parsed_date >= cutoff_date:
                    row = self._build_scheme_list_row(
                        scheme_code=scheme_code,
                        scheme_name=scheme_name,
                        scheme_category=scheme_category,
                        isin_code=isin_code,
                        fund_house=fund_house,
                        scheme_type=scheme_type,
                        isin_div_reinvestment=isin_div_reinvestment,
                    )
                    if row:
                        funds.append(row)

            except Exception as e:
                logger.warning(f"Skipping scheme due to processing error: {e}")
                continue

        logger.info(f"Filtered {len(funds)} eligible schemes from {source}")
        return funds

    def _fetch_latest_schemes_from_mfapi(self) -> List[Dict[str, Any]]:
        """Fetch latest schemes list from MFAPI."""
        url = f"{self.base_url}/latest"

        try:
            response = requests.get(url, timeout=300)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, list):
                logger.error("Unexpected MFAPI latest payload format (expected list)")
                return []

            # Keep only Open Ended rows from source payload.
            open_ended_payload = []
            for item in payload:
                if not isinstance(item, dict):
                    continue
                normalized_type = self._normalize_scheme_type(
                    item.get("schemeType") or item.get("scheme_type")
                )
                if normalized_type == SchemeType.OPEN_ENDED.value:
                    open_ended_payload.append(item)

            return open_ended_payload
        except Exception as e:
            logger.error(f"Failed to fetch latest schemes: {e}")
            return []

    def _fetch_latest_schemes_from_amfi(self) -> List[Dict[str, Any]]:
        """
        Parse AMFI NAVAll.txt into MFAPI-like rows so downstream filtering remains unchanged.
        Expected output keys: schemeCode, schemeName, schemeCategory, schemeType, date
        """
        url = "https://portal.amfiindia.com/spages/NAVAll.txt"
        parsed_rows: List[Dict[str, Any]] = []
        current_category = ""
        current_fund_house = ""

        try:
            response = requests.get(url, timeout=300)
            response.raise_for_status()
            lines = response.text.splitlines()
        except Exception as e:
            logger.error(f"Failed to fetch AMFI NAVAll fallback: {e}")
            return []

        for raw_line in lines:
            try:
                line = raw_line.strip()
                if not line:
                    continue

                # Skip the tabular header line.
                if line.lower().startswith("scheme code;"):
                    continue

                # Section headers like:
                # Open Ended Schemes(Debt Scheme - Banking and PSU Fund)
                if ";" not in line:
                    if line.lower().startswith("open ended schemes"):
                        current_category = line
                        current_fund_house = ""
                    else:
                        current_fund_house = line
                    continue

                parts = line.split(";")
                if len(parts) < 6:
                    continue

                scheme_code_raw = parts[0].strip()
                isin_primary = parts[1].strip() if len(parts) > 1 else ""
                isin_div_reinvestment = parts[2].strip() if len(parts) > 2 else ""
                scheme_name = parts[3].strip()
                date_str = parts[5].strip()

                if not scheme_code_raw.isdigit() or not scheme_name:
                    continue

                # AMFI file also contains close-ended/interval rows depending on section.
                if not current_category.lower().startswith("open ended schemes"):
                    continue

                parsed_rows.append({
                    "schemeCode": int(scheme_code_raw),
                    "schemeName": scheme_name,
                    "schemeCategory": current_category,
                    "schemeType": "Open Ended Schemes",
                    "date": date_str,
                    "isin_growth": isin_primary,
                    "isin_div_reinvestment": isin_div_reinvestment,
                    "fund_house": current_fund_house,
                })

            except Exception as e:
                logger.warning(f"Skipping AMFI line due to parsing error: {e}")
                continue

        return parsed_rows

    @staticmethod
    def _parse_latest_date(date_str: str) -> Optional[datetime]:
        """Parse latest list date from multiple known formats."""
        for fmt in ("%d-%m-%Y", "%d-%b-%Y"):
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None

    @staticmethod
    def _extract_isin_from_latest_item(item: Dict[str, Any]) -> Optional[str]:
        """
        Extract ISIN from latest-scheme row using source-of-truth key.
        """
        for key in ("isin_growth", "isinGrowth"):
            value = item.get(key)
            if value is None:
                continue
            v = str(value).strip()
            if v and v != "-":
                return v
        return None

    @staticmethod
    def _build_scheme_list_row(
        scheme_code: Any,
        scheme_name: Any,
        scheme_category: Any,
        isin_code: Any,
        fund_house: Any = None,
        scheme_type: Any = None,
        isin_div_reinvestment: Any = None,
    ) -> Dict[str, Any]:
        """
        Return only present fields for scheme list output.
        If a field is missing/blank/'-', it is omitted.
        """
        out: Dict[str, Any] = {}

        if isinstance(scheme_code, int):
            out["scheme_code"] = scheme_code
        elif isinstance(scheme_code, str) and scheme_code.strip().isdigit():
            out["scheme_code"] = int(scheme_code.strip())

        if isinstance(scheme_name, str):
            v = scheme_name.strip()
            if v and v != "-":
                out["scheme_name"] = v

        if isinstance(scheme_category, str):
            v = scheme_category.strip()
            if v and v != "-":
                out["scheme_category"] = v

        if isinstance(isin_code, str):
            v = isin_code.strip()
            if v and v != "-":
                out["isin_code"] = v

        if isinstance(fund_house, str):
            v = fund_house.strip()
            if v and v != "-":
                out["fund_house"] = v

        if isinstance(scheme_type, str):
            v = scheme_type.strip()
            if v and v != "-":
                out["scheme_type"] = v

        if isinstance(isin_div_reinvestment, str):
            v = isin_div_reinvestment.strip()
            if v and v != "-":
                out["isin_div_reinvestment"] = v

        return out

    @staticmethod
    def _normalize_scheme_type(value: Any, default: Optional[str] = None) -> Optional[str]:
        """Normalize arbitrary scheme type strings to supported enum values."""
        if isinstance(value, SchemeType):
            return value.value
        if not isinstance(value, str):
            return default

        v = value.strip().lower()
        if not v or v == "-":
            return default

        if "open ended" in v:
            return SchemeType.OPEN_ENDED.value
        if "close ended" in v or "closed ended" in v:
            return SchemeType.CLOSE_ENDED.value
        if "interval" in v:
            return SchemeType.INTERVAL.value

        return default
    
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
                "money market": "money market fund",
                "fund of funds domestic": "fofs domestic",
                "fof domestic": "fofs domestic",
                "fund of funds overseas": "fofs overseas",
                "fof overseas": "fofs overseas",
            }

            v = normalization_map.get(v, v)

        return v

    def _match_scheme_sub_category(self, value: Any) -> Optional[SchemeSubCategory]:
        """Best-effort match from raw API text to SchemeSubCategory enum."""
        if not isinstance(value, str):
            return None
        raw = value.strip()
        if not raw or raw == "-":
            return None

        api_value_normalized = self.normalize_scheme_sub_category(raw, is_enum=False)

        # 1) Exact normalized match
        for enum_member in SchemeSubCategory:
            enum_value_normalized = self.normalize_scheme_sub_category(enum_member.value, is_enum=True)
            if enum_value_normalized == api_value_normalized:
                return enum_member

        # 2) Contains match in either direction for loose API strings
        for enum_member in SchemeSubCategory:
            enum_value_normalized = self.normalize_scheme_sub_category(enum_member.value, is_enum=True)
            if (
                enum_value_normalized in api_value_normalized
                or api_value_normalized in enum_value_normalized
            ):
                return enum_member

        return None

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

        if scheme_category:
            normalized_scheme_category = (
                scheme_category.replace("–", "-").replace("—", "-")
                if isinstance(scheme_category, str)
                else scheme_category
            )
        else:
            normalized_scheme_category = scheme_category

        if normalized_scheme_category and "-" in normalized_scheme_category:
            left, right = normalized_scheme_category.split("-", 1)
            scheme_sub_category_str = right.strip()
            matched_enum = self._match_scheme_sub_category(scheme_sub_category_str)

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
        elif normalized_scheme_category:
            matched_enum = self._match_scheme_sub_category(normalized_scheme_category)
            if matched_enum:
                scheme_sub_category = matched_enum

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
            scheme_type=self._normalize_scheme_type(
                meta_raw.get("scheme_type") or meta_raw.get("schemeType"),
                default=SchemeType.CLOSE_ENDED.value,
            ),
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

    @staticmethod
    def _derive_fund_house_from_scheme_name(scheme_name: str) -> Optional[str]:
        """Best-effort fund house derivation when API meta is unavailable."""
        if not scheme_name:
            return None
        m = re.match(r"^\s*(.+?\bMutual Fund)\b", scheme_name, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip()
        return None

    def _build_captnemo_raw(self, captnemo_payload: Dict[str, Any], scheme_item: Dict[str, Any]) -> Dict[str, Any]:
        """Convert captnemo payload into MFAPI-like raw shape expected downstream."""
        hist = captnemo_payload.get("historical_nav") or []
        nav_rows = []
        for entry in hist:
            if not isinstance(entry, (list, tuple)) or len(entry) < 2:
                continue
            dt, nav = entry[0], entry[1]
            nav_rows.append({
                "date": str(dt),
                "nav": str(nav),
            })
        if not nav_rows and captnemo_payload.get("date") is not None and captnemo_payload.get("nav") is not None:
            nav_rows.append({
                "date": str(captnemo_payload.get("date")),
                "nav": str(captnemo_payload.get("nav")),
            })

        scheme_name = scheme_item.get("scheme_name") or captnemo_payload.get("name")
        fund_house = (
            scheme_item.get("fund_house")
            or self._derive_fund_house_from_scheme_name(scheme_name or "")
        )

        return {
            "meta": {
                "scheme_name": scheme_name,
                "scheme_category": scheme_item.get("scheme_category"),
                "fund_house": fund_house,
                "scheme_code": scheme_item.get("scheme_code"),
                "scheme_type": self._normalize_scheme_type(
                    scheme_item.get("scheme_type"),
                    default=SchemeType.CLOSE_ENDED.value,
                ),
                "isin_growth": scheme_item.get("isin_code") or captnemo_payload.get("ISIN"),
                "isin_div_reinvestment": scheme_item.get("isin_div_reinvestment"),
            },
            "data": nav_rows,
        }

    async def _fetch_scheme_raw_from_mfapi(self, session, scheme_code: Optional[int]):
        """Primary NAV source: MFAPI scheme endpoint."""
        if not isinstance(scheme_code, int) or scheme_code <= 0:
            return None
        async with session.get(f"{self.base_url}/{scheme_code}", timeout=60) as response:
            if response.status != 200:
                return None
            return await response.json()

    async def _fetch_scheme_raw_from_captnemo(self, session, isin_code: Optional[str], scheme_item: Dict[str, Any]):
        """Fallback NAV source: captnemo endpoint by ISIN."""
        if not isinstance(isin_code, str) or not isin_code.strip():
            return None

        isin = isin_code.strip()
        async with session.get(f"https://mf.captnemo.in/nav/{isin}", timeout=60) as response:
            if response.status != 200:
                return None
            payload = await response.json()
            return self._build_captnemo_raw(payload, scheme_item)

    def _finalize_raw_scheme_response(self, raw: Dict[str, Any]):
        """Run post-processing, enrich meta, validate, and return schema-compatible dict."""
        nav_data = raw.get("data", [])
        filtered_nav, removed_dates = self._filter_weekend_nav(nav_data)
        raw["data"] = filtered_nav
        raw["removed_weekend_dates"] = [d.strftime("%Y-%m-%d") for d in removed_dates]

        enriched_meta = self._build_scheme_meta(raw)
        if enriched_meta is None:
            return None

        raw["meta"] = enriched_meta.model_dump(mode="json")
        validated = MutualFundNavResponse.model_validate(raw)
        return validated.model_dump(mode="json")

    async def fetch_scheme(self, session, semaphore, scheme_item):
        """Fetch NAV data with MFAPI primary and captnemo(ISIN) fallback, then validate."""
        async with semaphore:
            max_retries = 4
            scheme_code = scheme_item.get("scheme_code")
            isin_code = scheme_item.get("isin_code")
            scheme_type = self._normalize_scheme_type(
                scheme_item.get("scheme_type"),
                default=SchemeType.CLOSE_ENDED.value,
            )

            if scheme_type != SchemeType.OPEN_ENDED.value:
                logger.info(f"Skipping non-open-ended scheme_code={scheme_code} | scheme_type={scheme_type}")
                return None

            for attempt in range(1, max_retries + 1):
                try:
                    raw = await self._fetch_scheme_raw_from_mfapi(session, scheme_code)
                    if raw is None:
                        raw = await self._fetch_scheme_raw_from_captnemo(session, isin_code, scheme_item)
                        if raw is None:
                            logger.warning(
                                f"Both NAV sources failed for scheme_code={scheme_code}, isin={isin_code} "
                                f"on attempt {attempt}/{max_retries}"
                            )
                            if attempt < max_retries:
                                await asyncio.sleep(min(0.5 * attempt, 3))
                                continue
                            return None

                    # Ensure key meta fields are present for fallback-built raws too.
                    meta = raw.get("meta", {}) if isinstance(raw, dict) else {}
                    if isinstance(meta, dict):
                        meta.setdefault("scheme_code", scheme_item.get("scheme_code"))
                        meta.setdefault("scheme_name", scheme_item.get("scheme_name"))
                        meta.setdefault("scheme_category", scheme_item.get("scheme_category"))
                        # Enforce open-ended scheme type for this ingestion flow.
                        meta["scheme_type"] = SchemeType.OPEN_ENDED.value
                        meta.setdefault("isin_growth", scheme_item.get("isin_code"))
                        meta.setdefault("isin_div_reinvestment", scheme_item.get("isin_div_reinvestment"))
                        meta.setdefault("fund_house", scheme_item.get("fund_house"))
                        raw["meta"] = meta

                    return self._finalize_raw_scheme_response(raw)

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
        """Fetch NAV data for schemes list with MFAPI primary and captnemo fallback."""
        connector = aiohttp.TCPConnector(limit=100)
        timeout = aiohttp.ClientTimeout(total=30)

        scheme_items = [
            item
            for item in schemes_list
            if (
                (isinstance(item.get("scheme_code"), int) and item["scheme_code"] > 0)
                or (isinstance(item.get("isin_code"), str) and item["isin_code"].strip())
            )
            and self._normalize_scheme_type(
                item.get("scheme_type"),
                default=SchemeType.CLOSE_ENDED.value,
            ) == SchemeType.OPEN_ENDED.value
        ]
        logger.info(f"Starting NAV fetch for {len(scheme_items)} schemes")

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            semaphore = asyncio.Semaphore(self.max_concurrent)

            tasks = [
                asyncio.create_task(self.fetch_scheme(session, semaphore, item))
                for item in scheme_items
            ]

            final_results = []
            failed_count = 0
            processed_count = 0

            try:
                for done_task in asyncio.as_completed(tasks):
                    result = await done_task
                    processed_count += 1

                    if processed_count % 500 == 0:
                        logger.info(
                            f"NAV fetch progress: completed processing for {processed_count} schemes"
                        )

                    if result is not None:
                        final_results.append(result)
                    else:
                        failed_count += 1
            except Exception as e:
                logger.error(f"Unexpected async execution error: {e}")
                return []

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
