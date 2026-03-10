from app.ingestion.mfapi_data import run_ingestion
from app.metrics.metrics import run_metrics
from app.db.write import run_store_in_db
from app.shared.logger import logger

def run_pipeline():
    """Execute full ingestion, metrics, and storage pipeline"""
    try:
        logger.info("Starting pipeline execution")
        raw_data = run_ingestion()
        metrics = run_metrics(raw_data)
        run_store_in_db(metrics)
        logger.info("Pipeline execution completed successfully")
    except Exception as e:
        logger.error(f"Fatal error in pipeline execution: {e}")
        raise


# if __name__ == "__main__":
#     run_pipeline() 
