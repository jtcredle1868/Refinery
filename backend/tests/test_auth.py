"""Tests for auth routes: signup, login, /me."""
import pytest


SIGNUP_PAYLOAD = {
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
}


@pytest.mark.anyio
async def test_signup(client):
    resp = await client.post("/api/v1/auth/signup", json=SIGNUP_PAYLOAD)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == SIGNUP_PAYLOAD["email"]
    assert data["user"]["tier"] == "free"


@pytest.mark.anyio
async def test_signup_duplicate_email(client):
    await client.post("/api/v1/auth/signup", json=SIGNUP_PAYLOAD)
    resp = await client.post("/api/v1/auth/signup", json=SIGNUP_PAYLOAD)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


@pytest.mark.anyio
async def test_login(client):
    await client.post("/api/v1/auth/signup", json=SIGNUP_PAYLOAD)
    resp = await client.post(
        "/api/v1/auth/login",
        content=f"username={SIGNUP_PAYLOAD['email']}&password={SIGNUP_PAYLOAD['password']}",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data


@pytest.mark.anyio
async def test_login_wrong_password(client):
    await client.post("/api/v1/auth/signup", json=SIGNUP_PAYLOAD)
    resp = await client.post(
        "/api/v1/auth/login",
        content=f"username={SIGNUP_PAYLOAD['email']}&password=wrongpassword",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_get_profile(client):
    # Signup and get token
    signup_resp = await client.post("/api/v1/auth/signup", json=SIGNUP_PAYLOAD)
    token = signup_resp.json()["access_token"]

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == SIGNUP_PAYLOAD["email"]
    assert data["full_name"] == SIGNUP_PAYLOAD["full_name"]


@pytest.mark.anyio
async def test_get_profile_unauthenticated(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
