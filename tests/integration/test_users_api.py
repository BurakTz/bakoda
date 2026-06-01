import pytest
from httpx import AsyncClient

from src.models import Hotel


async def _register(client: AsyncClient, email: str) -> str:
    resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": "Secure123",
        "first_name": "Test",
        "last_name": "User",
    })
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/users/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    token = await _register(client, "getme@bakoda.com")
    resp = await client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "getme@bakoda.com"


@pytest.mark.asyncio
async def test_update_me(client: AsyncClient):
    token = await _register(client, "update@bakoda.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.put("/api/users/me", json={"first_name": "Güncellendi"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["first_name"] == "Güncellendi"


@pytest.mark.asyncio
async def test_my_bookings_empty(client: AsyncClient):
    token = await _register(client, "nobookings@bakoda.com")
    resp = await client.get("/api/users/me/bookings", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_favorites_add_list_remove(client: AsyncClient, sample_hotel: Hotel):
    token = await _register(client, "favs@bakoda.com")
    headers = {"Authorization": f"Bearer {token}"}
    hotel_id = sample_hotel.id

    # Boş başlat
    resp = await client.get("/api/users/me/favorites", headers=headers)
    assert resp.status_code == 200

    # Favoriye ekle
    resp = await client.post(f"/api/users/me/favorites/{hotel_id}", headers=headers)
    assert resp.status_code == 201
    assert resp.json()["hotel"]["id"] == hotel_id

    # Listede görünsün
    resp = await client.get("/api/users/me/favorites", headers=headers)
    assert any(f["hotel"]["id"] == hotel_id for f in resp.json())

    # Favoriden çıkar
    resp = await client.delete(f"/api/users/me/favorites/{hotel_id}", headers=headers)
    assert resp.status_code == 204

    # Listede yok
    resp = await client.get("/api/users/me/favorites", headers=headers)
    assert not any(f["hotel"]["id"] == hotel_id for f in resp.json())


@pytest.mark.asyncio
async def test_delete_me(client: AsyncClient):
    token = await _register(client, "deleteme@bakoda.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.delete("/api/users/me", headers=headers)
    assert resp.status_code == 204
    # Silinen kullanıcı artık giriş yapamaz
    login_resp = await client.post("/api/auth/login", json={
        "email": "deleteme@bakoda.com",
        "password": "Secure123",
    })
    assert login_resp.status_code == 401
