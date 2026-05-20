from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bakoda"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    aws_default_region: str = "us-east-1"
    s3_endpoint_url: str = "http://localhost:4566"
    s3_bucket_name: str = "bakoda-confirmations"
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"
    log_level: str = "INFO"
    jwt_secret_key: str = "change-me-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080


settings = Settings()
