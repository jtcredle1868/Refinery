"""Tests for manuscript upload and listing routes."""
import io
import pytest


async def _get_token(client) -> str:
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": "manu@example.com", "password": "pass1234", "full_name": "Manu"},
    )
    return resp.json()["access_token"]


@pytest.mark.anyio
async def test_list_manuscripts_empty(client):
    token = await _get_token(client)
    resp = await client.get(
        "/api/v1/manuscripts/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"manuscripts": [], "total": 0}


@pytest.mark.anyio
async def test_upload_txt_manuscript(client):
    token = await _get_token(client)
    content = b"Chapter 1\n\nThis is the first chapter with some content.\n\n" * 100
    resp = await client.post(
        "/api/v1/manuscripts/upload",
        files={"file": ("my_novel.txt", io.BytesIO(content), "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["title"] == "my_novel"
    assert data["file_type"] == "txt"
    assert data["word_count"] > 0
    assert data["status"] == "ready"


@pytest.mark.anyio
async def test_upload_unsupported_extension(client):
    token = await _get_token(client)
    resp = await client.post(
        "/api/v1/manuscripts/upload",
        files={"file": ("essay.html", io.BytesIO(b"<html></html>"), "text/html")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    assert "Unsupported" in resp.json()["detail"]


@pytest.mark.anyio
async def test_get_manuscript_not_found(client):
    token = await _get_token(client)
    resp = await client.get(
        "/api/v1/manuscripts/99999",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_upload_then_list(client):
    token = await _get_token(client)
    content = b"Hello world content " * 200
    await client.post(
        "/api/v1/manuscripts/upload",
        files={"file": ("book.txt", io.BytesIO(content), "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get(
        "/api/v1/manuscripts/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["manuscripts"][0]["title"] == "book"


@pytest.mark.anyio
async def test_delete_manuscript(client):
    token = await _get_token(client)
    content = b"Delete me " * 300
    upload = await client.post(
        "/api/v1/manuscripts/upload",
        files={"file": ("todelete.txt", io.BytesIO(content), "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    mid = upload.json()["id"]
    del_resp = await client.delete(
        f"/api/v1/manuscripts/{mid}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_resp.status_code == 204
    # Confirm gone
    get_resp = await client.get(
        f"/api/v1/manuscripts/{mid}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_resp.status_code == 404
