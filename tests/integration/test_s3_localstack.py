"""Integration tests against real LocalStack S3 (no unittest.mock).

Uses an existing LocalStack when ``S3_ENDPOINT_URL`` is set (e.g. docker-compose
on http://localhost:4566), otherwise starts ``localstack/localstack:3`` via
testcontainers — same pattern as ``pg_container`` in ``tests/conftest.py``.
"""

import json
import os

import boto3
import httpx
import pytest

from src.config import settings
from src.services import s3_service

_EXTERNAL_ENDPOINT = os.getenv("S3_ENDPOINT_URL")


def _docker_available() -> bool:
    """Return True if a Docker daemon is reachable via the docker SDK."""
    try:
        import docker

        docker.from_env().ping()
        return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def localstack_container():
    if _EXTERNAL_ENDPOINT:
        yield None
        return

    if not _docker_available():
        pytest.skip("Docker yok — LocalStack S3 integration testleri atlanıyor")

    try:
        from testcontainers.localstack import LocalStackContainer
    except ImportError:
        pytest.skip("testcontainers[localstack] kurulu değil")

    image = os.getenv("LOCALSTACK_IMAGE", "localstack/localstack:3")
    try:
        with LocalStackContainer(image=image) as ls:
            yield ls
    except Exception as e:
        pytest.skip(f"LocalStack başlatılamadı: {e}")


@pytest.fixture(scope="session")
def s3_endpoint_url(localstack_container):
    if localstack_container is None:
        return _EXTERNAL_ENDPOINT
    return localstack_container.get_url()


@pytest.fixture()
def s3_bucket(monkeypatch, s3_endpoint_url):
    bucket = os.getenv("S3_BUCKET_NAME", "bakoda-confirmations")
    monkeypatch.setattr(settings, "s3_endpoint_url", s3_endpoint_url)
    monkeypatch.setattr(settings, "s3_bucket_name", bucket)
    s3_service.ensure_bucket()
    yield bucket


def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_default_region,
    )


@pytest.mark.localstack
def test_upload_confirmation_stores_json_in_bucket(s3_bucket):
    booking_id = 9001
    payload = {
        "booking_id": booking_id,
        "guest_name": "Integration Test",
        "status": "confirmed",
    }

    key = s3_service.upload_confirmation(booking_id, payload)
    assert key == f"confirmations/{booking_id}.json"

    obj = _s3_client().get_object(Bucket=s3_bucket, Key=key)
    assert json.loads(obj["Body"].read()) == payload


@pytest.mark.localstack
def test_get_presigned_url_allows_download(s3_bucket):
    booking_id = 9002
    payload = {"booking_id": booking_id, "status": "confirmed"}
    key = s3_service.upload_confirmation(booking_id, payload)

    url = s3_service.get_presigned_url(key, expires_in=300)
    assert url

    resp = httpx.get(url, follow_redirects=True)
    resp.raise_for_status()
    assert resp.json() == payload
