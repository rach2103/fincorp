"""
ingestion/airflow/dags/placement_pipeline_dag.py
Main ETL orchestration DAG for the placement prediction platform.
Runs daily to ingest all data sources and trigger feature engineering.
"""
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.utils.dates import days_ago

default_args = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "start_date": days_ago(1),
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}


def ingest_student_data(**context):
    """Ingest student data from source systems into PostgreSQL."""
    import sys
    sys.path.insert(0, "/opt/airflow/dags/../../../")
    from data_sources.connectors import StudentDataConnector
    from ingestion.loaders import DataLoader

    connector = StudentDataConnector()
    df = connector.fetch_student_profiles(n=1000)
    loader = DataLoader()
    rows = loader.upsert_dataframe(df, table="raw_student_profiles", key_cols=["student_id"])
    print(f"Upserted {rows} student records")
    context["ti"].xcom_push(key="student_count", value=len(df))


def ingest_industry_data(**context):
    """Ingest industry trends and salary benchmarks."""
    from data_sources.connectors import IndustryDataConnector
    from ingestion.loaders import DataLoader

    connector = IndustryDataConnector()
    sectors = ["IT", "Finance", "Healthcare", "Manufacturing", "FMCG", "Consulting"]
    df = connector.fetch_sector_trends(sectors, months_back=6)
    loader = DataLoader()
    loader.upsert_dataframe(df, table="raw_industry_trends", key_cols=["sector", "month"])
    print(f"Ingested {len(df)} industry trend records")


def ingest_institute_data(**context):
    """Ingest historical placement data from institutes."""
    from data_sources.connectors import InstituteDataConnector
    from ingestion.loaders import DataLoader

    connector = InstituteDataConnector()
    loader = DataLoader()
    for institute_id in ["INST001", "INST002", "INST003"]:
        df = connector.fetch_historical_placements(institute_id)
        loader.upsert_dataframe(df, table="raw_institute_placements", key_cols=["institute_id", "year"])
    print("Institute data ingested")


def ingest_realtime_signals(**context):
    """Ingest real-time activity signals for students."""
    from data_sources.connectors import RealTimeSignalsConnector, StudentDataConnector
    from ingestion.loaders import DataLoader

    student_connector = StudentDataConnector()
    students_df = student_connector.fetch_student_profiles(n=200)
    student_ids = students_df["student_id"].tolist()

    rt_connector = RealTimeSignalsConnector()
    signals_df = rt_connector.fetch_student_activity(student_ids)

    loader = DataLoader()
    loader.upsert_dataframe(signals_df, table="raw_realtime_signals", key_cols=["student_id"])
    print(f"Ingested signals for {len(signals_df)} students")


def run_feature_engineering(**context):
    """Trigger feature engineering pipeline."""
    import subprocess
    result = subprocess.run(
        ["python", "-m", "feature_engineering.pipeline", "--run-all"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"Feature engineering failed: {result.stderr}")
    print(result.stdout)


def trigger_model_training(**context):
    """Trigger model retraining if data drift is detected or on schedule."""
    from feature_engineering.drift_detector import DriftDetector
    detector = DriftDetector()
    drift_detected = detector.check_drift()

    day_of_week = datetime.now().weekday()
    should_retrain = drift_detected or day_of_week == 0  # Monday or drift

    if should_retrain:
        import subprocess
        print("Triggering model retraining...")
        subprocess.Popen(["python", "-m", "models.train_all", "--log-mlflow"])
    else:
        print("No drift detected, skipping retraining")
    context["ti"].xcom_push(key="retrained", value=should_retrain)


with DAG(
    "placement_main_pipeline",
    default_args=default_args,
    description="Daily ingestion and feature engineering for placement prediction",
    schedule_interval="0 2 * * *",  # 2 AM daily
    catchup=False,
    tags=["placement", "etl", "ml"],
) as dag:

    t_student = PythonOperator(
        task_id="ingest_student_data",
        python_callable=ingest_student_data,
    )

    t_industry = PythonOperator(
        task_id="ingest_industry_data",
        python_callable=ingest_industry_data,
    )

    t_institute = PythonOperator(
        task_id="ingest_institute_data",
        python_callable=ingest_institute_data,
    )

    t_signals = PythonOperator(
        task_id="ingest_realtime_signals",
        python_callable=ingest_realtime_signals,
    )

    t_dbt = BashOperator(
        task_id="run_dbt_transformations",
        bash_command="cd /opt/airflow/dags/../../../ingestion/dbt && dbt run --profiles-dir . --target prod",
    )

    t_features = PythonOperator(
        task_id="run_feature_engineering",
        python_callable=run_feature_engineering,
    )

    t_train = PythonOperator(
        task_id="trigger_model_training",
        python_callable=trigger_model_training,
    )

    # DAG dependencies
    [t_student, t_industry, t_institute, t_signals] >> t_dbt >> t_features >> t_train
