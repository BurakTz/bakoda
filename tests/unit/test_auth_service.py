from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from jose import jwt

from src.config import settings
from src.models import User
from src.services.auth_service import (
    create_access_token,
    get_current_user,
    get_optional_user,
    hash_password,
    verify_password,
)


def _user(**kwargs) -> User:
    u = User()
    defaults = dict(
        id=1,
        email="u@test.com",
        password_hash=hash_password("secret"),
        first_name="A",
        last_name="B",
        is_active=True,
    )
    defaults.update(kwargs)
    for k, v in defaults.items():
        setattr(u, k, v)
    return u


def _db_with_user(user: User | None) -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = user
    db.execute.return_value = result
    return db


def test_hash_and_verify_password():
    hashed = hash_password("MyPass123!")
    assert hashed != "MyPass123!"
    assert verify_password("MyPass123!", hashed)
    assert not verify_password("wrong", hashed)


def test_create_access_token_roundtrip():
    token = create_access_token(42)
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    assert payload["sub"] == "42"


@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    with pytest.raises(HTTPException) as exc:
        await get_current_user(token="not-a-jwt", db=_db_with_user(_user()))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_missing_sub():
    token = jwt.encode(
        {"exp": 9999999999}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )
    with pytest.raises(HTTPException) as exc:
        await get_current_user(token=token, db=_db_with_user(_user()))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_inactive_or_missing():
    token = create_access_token(99)
    with pytest.raises(HTTPException) as exc:
        await get_current_user(token=token, db=_db_with_user(None))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_success():
    user = _user(id=7)
    token = create_access_token(7)
    result = await get_current_user(token=token, db=_db_with_user(user))
    assert result.id == 7


@pytest.mark.asyncio
async def test_get_optional_user_no_token():
    assert await get_optional_user(token=None, db=_db_with_user(_user())) is None


@pytest.mark.asyncio
async def test_get_optional_user_invalid_token():
    assert await get_optional_user(token="bad", db=_db_with_user(_user())) is None


@pytest.mark.asyncio
async def test_get_optional_user_missing_sub():
    token = jwt.encode(
        {"exp": 9999999999}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )
    assert await get_optional_user(token=token, db=_db_with_user(_user())) is None


@pytest.mark.asyncio
async def test_get_optional_user_success():
    user = _user(id=3)
    token = create_access_token(3)
    result = await get_optional_user(token=token, db=_db_with_user(user))
    assert result is not None
    assert result.id == 3
