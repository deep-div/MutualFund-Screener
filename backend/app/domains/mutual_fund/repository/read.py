from sqlalchemy import asc, desc, and_, func, Integer, Float, BigInteger

from app.db.session import get_session
from app.domains.mutual_fund.models import SchemeMetaORM, SchemeAnalyticsORM
from app.domains.ingestion.schemas import SchemeSubCategory

ALLOWED_OPERATORS = {"gte", "lte", "gt", "lt", "eq", "in"}

ALL_COLUMNS = {c.name: getattr(SchemeMetaORM, c.name) for c in SchemeMetaORM.__table__.columns}

"""Build SQLAlchemy screens dynamically using model columns"""
def build_dynamic_screens(query, screens):
    """Build validated SQLAlchemy screen conditions from model columns"""
    for field, value in screens.items():
        if field not in ALL_COLUMNS:
            raise ValueError(f"Invalid filter field: {field}")
        column = ALL_COLUMNS[field]
        if isinstance(value, dict):
            for op, val in value.items():
                if op not in ALLOWED_OPERATORS:
                    raise ValueError(f"Invalid operator '{op}' for field '{field}'")
                if op == "gte":
                    query = query.filter(column >= val)
                elif op == "lte":
                    query = query.filter(column <= val)
                elif op == "gt":
                    query = query.filter(column > val)
                elif op == "lt":
                    query = query.filter(column < val)
                elif op == "eq":
                    query = query.filter(column == val)
                elif op == "in": ## Select multiple values for a column, e.g. scheme_sub_category__in=["Large Cap", "Mid Cap"]
                    if isinstance(val, (list, tuple, set)) and len(val) > 0:
                        query = query.filter(column.in_(val))
        else:
            query = query.filter(column == value)

    return query


"""Apply safe sorting with NULL handling"""
def apply_sorting(query, sort_field, sort_order):
    """Apply validated sorting with NULL placement"""
    if sort_field not in ALL_COLUMNS:
        raise ValueError(f"Invalid sort field: {sort_field}")
    column = ALL_COLUMNS[sort_field]
    if sort_order == "asc":
        query = query.order_by(asc(column).nullsfirst())
    elif sort_order == "desc":
        query = query.order_by(desc(column).nullslast())
    else:
        raise ValueError("sort_order must be 'asc' or 'desc'")
    return query


"""Convert ORM row to dictionary"""
def orm_to_dict(row):
    """Convert SQLAlchemy ORM row into dictionary"""
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


"""Fetch schemes using dynamic screener screens and sorting"""
def get_filtered_schemes(
    screens: dict,
    limit: int,
    offset: int,
    sort_field: str,
    sort_order: str,
    scheme_external_ids: list[str] | None = None,
):
    """Fetch schemes with screens, sorting, and pagination"""
    with get_session() as db:
        base_query = db.query(SchemeMetaORM)
        if screens:
            base_query = build_dynamic_screens(base_query, screens)
        if scheme_external_ids:
            base_query = base_query.filter(SchemeMetaORM.external_id.in_(scheme_external_ids))
        total = base_query.count()

        remove_fields = { 
            "id", "instrument_type", "scheme_name", "scheme_category", 
            "scheme_type", "launch_date", "current_date", "total_active_days", "nav_record_count", 
            "isin_growth", "isin_div_reinvestment", "created_at", "updated_at",
        }

        numeric_columns = {
            name: col
            for name, col in ALL_COLUMNS.items()
            if isinstance(col.type, (Integer, Float, BigInteger)) and name not in remove_fields
        }

        meta = {}
        if numeric_columns:
            agg_expressions = []
            for name, col in numeric_columns.items():
                agg_expressions.append(func.min(col).label(f"{name}__min"))
                agg_expressions.append(func.max(col).label(f"{name}__max"))

            # Compute min/max on the full table (no screens)
            agg_row = db.query(*agg_expressions).select_from(SchemeMetaORM).first()
            if agg_row is not None:
                for name in numeric_columns.keys():
                    meta[name] = {
                        "min": getattr(agg_row, f"{name}__min"),
                        "max": getattr(agg_row, f"{name}__max"),
                    }

        query = apply_sorting(base_query, sort_field, sort_order)
        results = (
            query.offset(offset)
            .limit(limit)
            .all()
        )

        json_results = []
        for row in results:
            data = orm_to_dict(row)
            filtered_data = {k: v for k, v in data.items() if k not in remove_fields}
            json_results.append(filtered_data)

        return {
            "limit": limit,
            "offset": offset,
            "total": total,
            "meta": meta,
            "items": json_results
        }

def get_scheme_analytics_by_external_id(external_id: str):
    """Fetch scheme analytics JSON directly using external id"""
    with get_session() as db:
        result = (
            db.query(SchemeAnalyticsORM.full_data)
            .join(SchemeMetaORM, SchemeAnalyticsORM.scheme_id == SchemeMetaORM.id)
            .filter(SchemeMetaORM.external_id == external_id)
            .first()
        )

        if result:
            data = result.full_data

            remove_fields = {
                "id", "instrument_type", "scheme_name", "scheme_category",
                "scheme_type", "total_active_days", "nav_record_count",
                "isin_growth", "isin_div_reinvestment", "created_at", "updated_at"
            }

            if isinstance(data, dict) and "meta" in data and isinstance(data["meta"], dict):
                meta = data["meta"]

                for field in remove_fields:
                    meta.pop(field, None)

        else:
            data = None

        return data

def search_schemes(query: str, limit: int, offset: int):
    """Incremental search by scheme_sub_name."""
    if not query:
        return {
            "limit": limit,
            "offset": offset,
            "total": 0,
            "items": [],
        }

    # Match all terms independently so "smallcap index" finds "smallcap 250 index"
    terms = [t for t in query.strip().split() if t]

    with get_session() as db:
        if terms:
            term_filters = [
                SchemeMetaORM.scheme_sub_name.ilike(f"%{t}%")
                for t in terms
            ]
            base = db.query(SchemeMetaORM).filter(and_(*term_filters))
        else:
            base = db.query(SchemeMetaORM).filter(SchemeMetaORM.scheme_sub_name.ilike("%%"))
        total = base.count()
        results = (
            base.order_by(SchemeMetaORM.scheme_sub_name.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        items = [
            {
                "external_id": row.external_id,
                "scheme_code": row.scheme_code,
                "fund_house": row.fund_house,
                "scheme_sub_name": row.scheme_sub_name,
                "option_type": row.option_type,
                "plan_type": row.plan_type,
                "scheme_sub_category": row.scheme_sub_category,
                "current_nav": row.current_nav,
                "nav_change_1d": row.nav_change_1d,
            }
            for row in results
        ]

        return {
            "limit": limit,
            "offset": offset,
            "total": total,
            "items": items,
        }

def _scheme_row_to_gainer_loser_item(row):
    return {
        "external_id": row.external_id,
        "scheme_code": row.scheme_code,
        "scheme_sub_name": row.scheme_sub_name,
        "current_nav": row.current_nav,
        "nav_change_1d": row.nav_change_1d,
    }


def _scheme_row_to_best_performer_item(row):
    return {
        "external_id": row.external_id,
        "scheme_code": row.scheme_code,
        "scheme_sub_name": row.scheme_sub_name,
        "current_nav": row.current_nav,
        "cagr_3y": row.cagr_3y,
    }


def get_leaderboards():
    """Fetch top gainers, losers, and best performers across scheme sub-categories."""
    top_gainers_limit = 1
    top_losers_limit = 1
    best_performers_limit = 1
    allowed_sub_categories = [
        SchemeSubCategory.LARGE_CAP,
        SchemeSubCategory.MID_CAP,
        SchemeSubCategory.SMALL_CAP,
        SchemeSubCategory.FLEXI_CAP,
    ]
    with get_session() as db:
        top_gainers_items = []
        top_losers_items = []
        best_performers_items = []

        for sub_category in allowed_sub_categories:
            sub_category_value = sub_category.value

            gainers = (
                db.query(SchemeMetaORM)
                .filter(
                    SchemeMetaORM.scheme_sub_category == sub_category_value,
                    SchemeMetaORM.nav_change_1d.isnot(None),
                )
                .order_by(desc(SchemeMetaORM.nav_change_1d).nullslast())
                .limit(top_gainers_limit)
                .all()
            )

            losers = (
                db.query(SchemeMetaORM)
                .filter(
                    SchemeMetaORM.scheme_sub_category == sub_category_value,
                    SchemeMetaORM.nav_change_1d.isnot(None),
                )
                .order_by(asc(SchemeMetaORM.nav_change_1d).nullslast())
                .limit(top_losers_limit)
                .all()
            )

            best_performers = (
                db.query(SchemeMetaORM)
                .filter(
                    SchemeMetaORM.scheme_sub_category == sub_category_value,
                    SchemeMetaORM.cagr_3y.isnot(None),
                )
                .order_by(desc(SchemeMetaORM.cagr_3y).nullslast())
                .limit(best_performers_limit)
                .all()
            )

            top_gainers_items.extend([_scheme_row_to_gainer_loser_item(r) for r in gainers])
            top_losers_items.extend([_scheme_row_to_gainer_loser_item(r) for r in losers])
            best_performers_items.extend([_scheme_row_to_best_performer_item(r) for r in best_performers])

        return {
            "limits": {
                "top_gainers": top_gainers_limit,
                "top_losers": top_losers_limit,
                "best_performers": best_performers_limit,
            },
            "items": {
                "top_gainers": top_gainers_items,
                "top_losers": top_losers_items,
                "best_performers": best_performers_items,
            },
        }
