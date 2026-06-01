import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "newuser@bakoda.com",
            "password": "Secure123",
            "first_name": "Yeni",
            "last_name": "Kullanici",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newuser@bakoda.com"
    assert data["user"]["first_name"] == "Yeni"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "dup@bakoda.com",
        "password": "Secure123",
        "first_name": "A",
        "last_name": "B",
    }
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "weak@bakoda.com",
            "password": "short",
            "first_name": "A",
            "last_name": "B",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "email": "login_test@bakoda.com",
            "password": "Secure123",
            "first_name": "Login",
            "last_name": "User",
        },
    )
    resp = await client.post(
        "/api/auth/login",
        json={
            "email": "login_test@bakoda.com",
            "password": "Secure123",
        },
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "email": "wrongpw@bakoda.com",
            "password": "Correct123",
            "first_name": "A",
            "last_name": "B",
        },
    )
    resp = await client.post(
        "/api/auth/login",
        json={
            "email": "wrongpw@bakoda.com",
            "password": "Wrong999",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    resp = await client.post(
        "/api/auth/login",
        json={
            "email": "ghost@bakoda.com",
            "password": "Any123456",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_forgot_password_sends_code(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "email": "fp@bakoda.com",
            "password": "Secure123",
            "first_name": "FP",
            "last_name": "User",
        },
    )
    resp = await client.post("/api/auth/forgot-password", json={"email": "fp@bakoda.com"})
    assert resp.status_code == 200
    data = resp.json()
    assert "dev_code" in data
    code = data["dev_code"]

    verify_resp = await client.post(
        "/api/auth/verify-reset-code",
        json={
            "email": "fp@bakoda.com",
            "code": code,
        },
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["valid"] is True
    reset_token = verify_resp.json()["reset_token"]

    reset_resp = await client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": reset_token,
            "new_password": "NewSecure456",
        },
    )
    assert reset_resp.status_code == 200

    login_resp = await client.post(
        "/api/auth/login",
        json={
            "email": "fp@bakoda.com",
            "password": "NewSecure456",
        },
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_verify_wrong_code(client: AsyncClient):
    await client.post("/api/auth/forgot-password", json={"email": "fp@bakoda.com"})
    resp = await client.post(
        "/api/auth/verify-reset-code",
        json={
            "email": "fp@bakoda.com",
            "code": "000000",
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_invalid_token_format(client: AsyncClient):
    resp = await client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": "not-valid",
            "new_password": "NewSecure789",
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_expired_or_unknown_token(client: AsyncClient):
    resp = await client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": "99999:000000",
            "new_password": "NewSecure789",
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_user_not_found(client: AsyncClient, session_factory):
    from datetime import datetime, timedelta

    from sqlalchemy import select

    from src.models import PasswordResetCode

    email = "orphan-reset@bakoda.com"
    async with session_factory() as session:
        session.add(
            PasswordResetCode(
                email=email,
                code="123456",
                expires_at=datetime.utcnow() + timedelta(minutes=15),
            )
        )
        await session.commit()
        result = await session.execute(
            select(PasswordResetCode).where(PasswordResetCode.email == email)
        )
        record = result.scalar_one()

    resp = await client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": f"{record.id}:123456",
            "new_password": "NewSecure789",
        },
    )
    assert resp.status_code == 404
