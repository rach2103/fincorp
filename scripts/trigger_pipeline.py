"""Run the local feature and training pipeline without Airflow."""

from feature_engineering.pipeline import run_pipeline
from models.train_all import train_all


def main() -> None:
    run_pipeline()
    train_all(log_mlflow=False)
    print("Local pipeline complete.")


if __name__ == "__main__":
    main()
