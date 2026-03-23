from datetime import datetime
from zoneinfo import ZoneInfo
from app.domains.ingestion.mf_ingest import run_ingestion
from app.domains.metrics.metrics import run_metrics
from app.domains.mutual_fund.repository.write import run_store_in_db, create_pipeline_run, update_pipeline_run
from app.core.logging import logger

def run_pipeline():
    """Execute full ingestion, metrics, and storage pipeline"""
    ist = ZoneInfo("Asia/Kolkata")
    run_id = create_pipeline_run("Mutual Fund Screener Pipeline")
    update_pipeline_run(run_id, pipeline_status="running", started_at=datetime.now(ist))

    try:
        logger.info("Starting pipeline execution")

        try:
            update_pipeline_run(run_id, ingestion_status="running")
            raw_data = run_ingestion()
            update_pipeline_run(run_id, ingestion_status="success", ingestion_records=len(raw_data))
        except Exception as e:
            update_pipeline_run(run_id, pipeline_status="failed", ingestion_status="failed", completed_at=datetime.now(ist))
            raise

        try:
            update_pipeline_run(run_id, metrics_status="running")
            metrics = run_metrics(raw_data)
            update_pipeline_run(run_id, metrics_status="success", metrics_records=len(metrics))
        except Exception as e:
            update_pipeline_run(run_id, pipeline_status="failed", metrics_status="failed", completed_at=datetime.now(ist))
            raise

        try:
            update_pipeline_run(run_id, db_status="running")
            db_records = run_store_in_db(metrics)
            update_pipeline_run(run_id, db_status="success", db_records=db_records)
        except Exception as e:
            update_pipeline_run(run_id, pipeline_status="failed", db_status="failed", completed_at=datetime.now(ist))
            raise

        update_pipeline_run(run_id, pipeline_status="success", completed_at=datetime.now(ist))
        logger.info("Pipeline execution completed successfully")
    except Exception as e:
        logger.error(f"Fatal error in pipeline execution: {e}")
        raise


# if __name__ == "__main__":
#     run_pipeline() 
