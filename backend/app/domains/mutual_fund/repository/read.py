from sqlalchemy import asc, desc, and_

from app.db.session import get_session
from app.domains.mutual_fund.models import SchemeMetaORM, SchemeAnalyticsORM

ALLOWED_OPERATORS = {"gte", "lte", "gt", "lt", "eq"}

ALL_COLUMNS = {c.name: getattr(SchemeMetaORM, c.name) for c in SchemeMetaORM.__table__.columns}

"""Build SQLAlchemy filters dynamically using model columns"""
def build_dynamic_filters(query, filters):
    """Build validated SQLAlchemy filter conditions from model columns"""
    for field, value in filters.items():
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


"""Fetch schemes using dynamic screener filters and sorting"""
def get_filtered_schemes(filters: dict, limit: int, offset: int, sort_field: str, sort_order: str):
    """Fetch schemes with filters, sorting, and pagination"""
    with get_session() as db:
        query = db.query(SchemeMetaORM)
        if filters:
            query = build_dynamic_filters(query, filters)
        total = query.count()
        query = apply_sorting(query, sort_field, sort_order)
        results = (
            query.offset(offset)
            .limit(limit)
            .all()
        )

        remove_fields = { 
            "id", "instrument_type", "scheme_name", "scheme_category", 
            "scheme_type", "launch_date", "current_date", "total_active_days", "nav_record_count", 
            "isin_growth", "isin_div_reinvestment", "created_at", "updated_at",
        }

        json_results = []
        for row in results:
            data = orm_to_dict(row)
            filtered_data = {k: v for k, v in data.items() if k not in remove_fields}
            json_results.append(filtered_data)

        return {
            "limit": limit,
            "offset": offset,
            "total": total,
            "items": json_results
        }


def get_scheme_analytics(scheme_code: int):
    """Fetch scheme analytics JSON directly using scheme code"""
    with get_session() as db:
        result = (
            db.query(SchemeAnalyticsORM.full_data)
            .filter(SchemeAnalyticsORM.scheme_code == scheme_code)
            .first()
        )

        if result:
            data = result.full_data

            remove_fields = {
                "id", "instrument_type", "scheme_name", "scheme_category",
                "scheme_type", "launch_date", "total_active_days", "nav_record_count",
                "isin_growth", "isin_div_reinvestment", "created_at", "updated_at"
            }

            if isinstance(data, dict) and "meta" in data and isinstance(data["meta"], dict):
                meta = data["meta"]

                for field in remove_fields:
                    meta.pop(field, None)

        else:
            data = None

        return data


def get_scheme_basic_details(scheme_code: int):
    """Fetch basic scheme information by scheme code."""
    with get_session() as db:
        row = (
            db.query(
                SchemeMetaORM.scheme_code,
                SchemeMetaORM.scheme_name,
                SchemeMetaORM.scheme_sub_name,
                SchemeMetaORM.fund_house,
                SchemeMetaORM.scheme_category,
                SchemeMetaORM.scheme_class,
                SchemeMetaORM.scheme_sub_category,
                SchemeMetaORM.option_type,
                SchemeMetaORM.plan_type,
                SchemeMetaORM.current_nav,
                SchemeMetaORM.current_date,
            )
            .filter(SchemeMetaORM.scheme_code == scheme_code)
            .first()
        )

        if row is None:
            return None

        return {
            "scheme_code": row.scheme_code,
            "scheme_name": row.scheme_name,
            "scheme_sub_name": row.scheme_sub_name,
            "plan_type": row.plan_type,
            "option_type": row.option_type,
            "scheme_category": row.scheme_category,
            "scheme_class": row.scheme_class,
            "scheme_sub_category": row.scheme_sub_category,
            "fund_house": row.fund_house,
            "current_nav": row.current_nav,
            "launch_date": row.current_date,
        }


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
