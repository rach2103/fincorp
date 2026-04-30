"""Initialize PostgreSQL tables and seed synthetic source data."""

from data_sources.connectors import (
    IndustryDataConnector,
    InstituteDataConnector,
    RealTimeSignalsConnector,
    StudentDataConnector,
)
from ingestion.loaders import DataLoader


def main() -> None:
    loader = DataLoader()
    students = StudentDataConnector().fetch_student_profiles(n=1000)
    loader.upsert_dataframe(students, "raw_student_profiles", ["student_id"])

    student_ids = students["student_id"].head(300).tolist()
    signals = RealTimeSignalsConnector().fetch_student_activity(student_ids)
    loader.upsert_dataframe(signals, "raw_realtime_signals", ["student_id"])

    sectors = ["IT", "Finance", "Healthcare", "Manufacturing", "FMCG", "Consulting"]
    trends = IndustryDataConnector().fetch_sector_trends(sectors, months_back=6)
    loader.upsert_dataframe(trends, "raw_industry_trends", ["sector", "month"])

    institute = InstituteDataConnector()
    for institute_id in ["INST001", "INST002", "INST003"]:
        placements = institute.fetch_historical_placements(institute_id)
        loader.upsert_dataframe(placements, "raw_institute_placements", ["institute_id", "year"])

    print("Database seed complete.")


if __name__ == "__main__":
    main()
