from app.db.schema import SchemeMetaORM, SchemeAnalyticsORM
from app.db.session import SessionLocal


"""Builds SQLAlchemy filters dynamically from user filters"""
def build_dynamic_filters(query, filters):
    for field, value in filters.items():
        column = getattr(SchemeMetaORM, field, None)
        if column is None:
            continue
        if isinstance(value, dict):
            if "gte" in value:
                query = query.filter(column >= value["gte"])
            if "lte" in value:
                query = query.filter(column <= value["lte"])
            if "gt" in value:
                query = query.filter(column > value["gt"])
            if "lt" in value:
                query = query.filter(column < value["lt"])
            if "eq" in value:
                query = query.filter(column == value["eq"])
        else:
            query = query.filter(column == value)

    return query


"""Converts ORM row to dictionary"""
def orm_to_dict(row):
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


"""Fetch schemes using dynamic screener filters and print results"""
def get_filtered_schemes(filters: dict, limit: int = 10):
    db = SessionLocal()
    try:
        query = db.query(SchemeMetaORM)
        query = build_dynamic_filters(query, filters)
        query = query.limit(limit)

        results = query.all()
        json_results = [orm_to_dict(row) for row in results]

        return json_results
    finally:
        db.close()

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
#         "scheme_class": "Equity",
#         "cagr_3y": {"gte": 15},
#     }
# get_filtered_schemes(filters)
