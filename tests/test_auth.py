import pytest


@pytest.mark.anyio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.anyio
async def test_login_success(client, require_db):
    r = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"


@pytest.mark.anyio
async def test_login_wrong_password(client, require_db):
    r = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrong"},
    )
    assert r.status_code == 401


@pytest.mark.anyio
async def test_me_requires_auth(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.anyio
async def test_me_with_token(client, require_db):
    login = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login.json()["access_token"]
    r = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json()["username"] == "admin"


@pytest.mark.anyio
async def test_admin_stats_requires_admin(client, require_db):
    # Create regular user
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    admin_token = admin_login.json()["access_token"]
    await client.post(
        "/api/v1/admin/users",
        json={"username": "testuser", "password": "pass123", "role": "user"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    user_login = await client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "pass123"},
    )
    user_token = user_login.json()["access_token"]
    r = await client.get(
        "/api/v1/admin/stats",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 403


@pytest.mark.anyio
async def test_admin_stats_success(client, require_db):
    login = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login.json()["access_token"]
    r = await client.get(
        "/api/v1/admin/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "total_users" in data
    assert "total_knowledge_bases" in data
