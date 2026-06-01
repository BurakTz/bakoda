import json
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError

from src.config import settings
from src.services import s3_service


def test_ensure_bucket_creates_when_missing():
    client = MagicMock()
    client.head_bucket.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadBucket")
    with patch("src.services.s3_service._get_client", return_value=client):
        s3_service.ensure_bucket()
    client.create_bucket.assert_called_once_with(Bucket=settings.s3_bucket_name)


def test_ensure_bucket_skips_create_when_exists():
    client = MagicMock()
    with patch("src.services.s3_service._get_client", return_value=client):
        s3_service.ensure_bucket()
    client.create_bucket.assert_not_called()


def test_upload_confirmation_puts_json():
    client = MagicMock()
    with patch("src.services.s3_service._get_client", return_value=client):
        key = s3_service.upload_confirmation(5, {"booking_id": 5, "status": "confirmed"})
    assert key == "confirmations/5.json"
    client.put_object.assert_called_once()
    body = client.put_object.call_args.kwargs["Body"]
    assert json.loads(body) == {"booking_id": 5, "status": "confirmed"}


def test_get_presigned_url_delegates_to_client():
    client = MagicMock()
    client.generate_presigned_url.return_value = "http://signed"
    with patch("src.services.s3_service._get_client", return_value=client):
        url = s3_service.get_presigned_url("confirmations/1.json", expires_in=120)
    assert url == "http://signed"
    client.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": "confirmations/1.json"},
        ExpiresIn=120,
    )
