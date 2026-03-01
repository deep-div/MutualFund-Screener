from sqlalchemy.dialects.postgresql import insert
from app.db.schema import SchemeMetaORM
from backend.app.db.session import get_session


"""Bulk insert or update scheme metadata"""
def bulk_upsert_meta(data: list[dict]):
    session = get_session()

    try:
        # Extract only "meta" part from each item
        filtered_data = [item["meta"] for item in data if "meta" in item]

        if not filtered_data:
            return

        stmt = insert(SchemeMetaORM).values(filtered_data)

        update_columns = {
            c.name: getattr(stmt.excluded, c.name)
            for c in SchemeMetaORM.__table__.columns
            if c.name != "id"
        }

        stmt = stmt.on_conflict_do_update(
            index_elements=["scheme_code"],
            set_=update_columns
        )

        session.execute(stmt)
        session.commit()

    except Exception:
        session.rollback()
        raise

    finally:
        session.close()


# if __name__ == "__main__":
#     data = [
#         {
#             "meta": {
#                 "instrument_type": "Mutual Fund",
#                 "scheme_code": 103490,
#                 "fund_house": "Quantum Mutual Fund",
#                 "scheme_name": "Quantum Value Fund - Direct Plan Growth Option",
#                 "scheme_sub_name": "Quantum Value Fund",
#                 "option_type": "Growth",
#                 "plan_type": "Direct",
#                 "scheme_category": "Equity Scheme - Value Fund",
#                 "scheme_class": "Equity",
#                 "scheme_sub_category": "Value Fund",
#                 "launch_date": "2006-04-03",
#                 "current_date": "2026-02-27",
#                 "current_nav": 128.83,
#                 "time_since_inception_years": 19.9,
#                 "total_active_days": 7270,
#                 "nav_record_count": 4904,
#                 "scheme_type": "Open Ended Schemes",
#                 "isin_growth": "INF082J01036",
#                 "isin_div_reinvestment": None
#             }
#         }
#     ]

#     bulk_upsert_meta(data)