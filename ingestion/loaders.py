"""
ingestion/loaders.py
Handles loading data into PostgreSQL and MinIO/S3.
"""
import os
import io
import json
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import insert
from minio import Minio
from loguru import logger
from dotenv import load_dotenv

load_dotenv()


class DataLoader:
    """Loads DataFrames into PostgreSQL with upsert support."""

    def __init__(self):
        self.engine = create_engine(
            os.getenv("DATABASE_URL", "postgresql://placement_user:placement_pass@localhost:5432/placement_db")
        )

    def upsert_dataframe(self, df: pd.DataFrame, table: str, key_cols: list[str]) -> int:
        """Upsert a DataFrame into a PostgreSQL table."""
        if df.empty:
            logger.warning(f"Empty DataFrame, skipping upsert to {table}")
            return 0

        # Convert list columns to JSON strings
        for col in df.columns:
            if df[col].dtype == object:
                sample = df[col].dropna().iloc[0] if not df[col].dropna().empty else None
                if isinstance(sample, list):
                    df[col] = df[col].apply(lambda x: json.dumps(x) if isinstance(x, list) else x)

        df["ingested_at"] = pd.Timestamp.now()

        try:
            df.to_sql(table, self.engine, if_exists="append", index=False, method="multi")
            logger.info(f"Loaded {len(df)} rows into {table}")
            return len(df)
        except Exception as e:
            logger.error(f"Failed to load into {table}: {e}")
            raise


class MinIOStorage:
    """Handles raw file storage in MinIO/S3."""

    def __init__(self):
        endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
        self.client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=False)

    def upload_dataframe(self, df: pd.DataFrame, bucket: str, object_name: str, fmt: str = "parquet"):
        """Upload DataFrame to MinIO as parquet or CSV."""
        if not self.client.bucket_exists(bucket):
            self.client.make_bucket(bucket)

        buf = io.BytesIO()
        if fmt == "parquet":
            df.to_parquet(buf, index=False)
            content_type = "application/octet-stream"
        else:
            df.to_csv(buf, index=False)
            content_type = "text/csv"
        buf.seek(0)

        self.client.put_object(
            bucket, object_name, buf, length=buf.getbuffer().nbytes, content_type=content_type
        )
        logger.info(f"Uploaded {len(df)} rows to s3://{bucket}/{object_name}")

    def download_dataframe(self, bucket: str, object_name: str, fmt: str = "parquet") -> pd.DataFrame:
        """Download DataFrame from MinIO."""
        response = self.client.get_object(bucket, object_name)
        data = response.read()
        buf = io.BytesIO(data)
        if fmt == "parquet":
            return pd.read_parquet(buf)
        return pd.read_csv(buf)
