from datetime import datetime
from zoneinfo import ZoneInfo
from app.ingestion.mfapi_data import run_ingestion
from app.metrics.metrics import run_metrics
from app.db.write import run_store_in_db, create_workflow_run, update_workflow_run
from app.shared.logger import logger

def run_workflow():
    """Execute full ingestion, metrics, and storage workflow"""
    ist = ZoneInfo("Asia/Kolkata")
    run_id = create_workflow_run("Mutual Fund Screener Workflow")
    update_workflow_run(run_id, workflow_status="running", started_at=datetime.now(ist))

    try:
        logger.info("Starting workflow execution")

        try:
            update_workflow_run(run_id, ingestion_status="running")
            raw_data = run_ingestion()
            update_workflow_run(run_id, ingestion_status="success", ingestion_records=len(raw_data), ingestion_error=None)
        except Exception as e:
            update_workflow_run(run_id, workflow_status="failed", ingestion_status="failed", ingestion_error=str(e), completed_at=datetime.now(ist))
            raise

        try:
            update_workflow_run(run_id, metrics_status="running")
            metrics = run_metrics(raw_data)
            update_workflow_run(run_id, metrics_status="success", metrics_records=len(metrics), metrics_error=None)
        except Exception as e:
            update_workflow_run(run_id, workflow_status="failed", metrics_status="failed", metrics_error=str(e), completed_at=datetime.now(ist))
            raise

        try:
            update_workflow_run(run_id, db_status="running")
            db_records = run_store_in_db(metrics)
            update_workflow_run(run_id, db_status="success", db_records=db_records, db_error=None)
        except Exception as e:
            update_workflow_run(run_id, workflow_status="failed", db_status="failed", db_error=str(e), completed_at=datetime.now(ist))
            raise

        update_workflow_run(run_id, workflow_status="success", completed_at=datetime.now(ist))
        logger.info("Pipeline execution completed successfully")
    except Exception as e:
        logger.error(f"Fatal error in workflow execution: {e}")
        raise


# if __name__ == "__main__":
#     run_workflow() 
