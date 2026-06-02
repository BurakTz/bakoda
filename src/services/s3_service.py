import json
import logging

import boto3
from botocore.exceptions import ClientError

from src.config import settings

logger = logging.getLogger(__name__)


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_default_region,
    )


def ensure_bucket() -> None:
    client = _get_client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket_name)
    except ClientError:
        client.create_bucket(Bucket=settings.s3_bucket_name)
        logger.info("Created S3 bucket: %s", settings.s3_bucket_name)


def upload_confirmation(booking_id: int, payload: dict) -> str:
    """Upload booking confirmation JSON to S3. Returns the object key."""
    client = _get_client()
    key = f"confirmations/{booking_id}.json"
    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=json.dumps(payload),
        ContentType="application/json",
    )
    logger.info(
        "Uploaded confirmation for booking %d to s3://%s/%s",
        booking_id,
        settings.s3_bucket_name,
        key,
    )
    return key


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Return a pre-signed URL for the given S3 object key."""
    client = _get_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )


def upload_image(key: str, data: bytes, content_type: str = "image/jpeg") -> str:
    """Upload raw image bytes to S3. Returns the object key."""
    client = _get_client()
    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    logger.info("Uploaded image to s3://%s/%s", settings.s3_bucket_name, key)
    return key


def resolve_thumbnail(key: str | None) -> str | None:
    """Convert an S3 key to a 1-hour pre-signed URL. Returns None on failure."""
    if not key:
        return None
    try:
        url = get_presigned_url(key, expires_in=3600)
        public = settings.s3_public_endpoint_url
        if public and public != settings.s3_endpoint_url:
            url = url.replace(settings.s3_endpoint_url, public, 1)
        return url
    except Exception:
        logger.warning("Could not resolve thumbnail for key %s", key)
        return None
