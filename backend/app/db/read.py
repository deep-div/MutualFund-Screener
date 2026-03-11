from app.db.schema import SchemeMetaORM, SchemeAnalyticsORM
from app.db.session import SessionLocal
from sqlalchemy import asc, desc

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
    with SessionLocal() as db:
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
        json_results = [orm_to_dict(row) for row in results]
        return {
            "items": json_results,
            "limit": limit,
            "offset": offset,
            "total": total,
        }

def get_scheme_analytics(scheme_code: int):
    """Fetch scheme analytics JSON directly using scheme code"""
    db = SessionLocal()
    try:
        result = (
            db.query(SchemeAnalyticsORM.full_data)
            .filter(SchemeAnalyticsORM.scheme_code == scheme_code)
            .first()
        )

        if result:
            data = result.full_data
        else:
            data = None

        return data
    finally:
        db.close()

# filters = {
#     "scheme_class": {"eq": "Equity"},
#     "cagr_3y": {"gte": 15},
# }

# get_filtered_schemes(
#     filters=filters,
#     limit=15,
#     offset=0,
#     sort_field="cagr_3y",
#     sort_order="desc"
# )