from src.config import Settings, settings


def test_settings_defaults():
    s = Settings()
    assert s.database_url.startswith("postgresql+asyncpg://")
    assert s.s3_bucket_name == "bakoda-confirmations"
    assert s.jwt_algorithm == "HS256"
    assert s.jwt_expire_minutes == 10080
    assert s.log_level == "INFO"


def test_settings_singleton_instance():
    assert settings.jwt_secret_key
