"""
Tests for the ClaudeClient — verifies AsyncAnthropic is used (not the
blocking sync Anthropic client) and that analyze_json strips markdown fences.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.claude_client import ClaudeClient


def _make_client_with_mock(response_text: str) -> tuple[ClaudeClient, MagicMock]:
    """Return a ClaudeClient whose underlying AsyncAnthropic is mocked."""
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text=response_text)]

    mock_anthropic = MagicMock()
    mock_anthropic.messages.create = AsyncMock(return_value=mock_message)

    client = ClaudeClient()
    client.client = mock_anthropic
    return client, mock_anthropic


def test_claude_client_uses_async_anthropic():
    """The client must be AsyncAnthropic, not the blocking Anthropic class."""
    from anthropic import AsyncAnthropic
    c = ClaudeClient()
    assert isinstance(c.client, AsyncAnthropic), (
        "ClaudeClient must use AsyncAnthropic to avoid blocking the event loop"
    )


@pytest.mark.anyio
async def test_analyze_returns_text():
    client, mock = _make_client_with_mock("Hello from Claude")
    result = await client.analyze("system", "user prompt")
    assert result == "Hello from Claude"
    mock.messages.create.assert_awaited_once()


@pytest.mark.anyio
async def test_analyze_json_parses_clean_json():
    payload = {"score": 85, "notes": "good structure"}
    client, _ = _make_client_with_mock(json.dumps(payload))
    result = await client.analyze_json("system", "prompt")
    assert result == payload


@pytest.mark.anyio
async def test_analyze_json_strips_markdown_fence():
    payload = {"score": 72}
    fenced = f"```json\n{json.dumps(payload)}\n```"
    client, _ = _make_client_with_mock(fenced)
    result = await client.analyze_json("system", "prompt")
    assert result == payload


@pytest.mark.anyio
async def test_analyze_json_strips_bare_fence():
    payload = {"ok": True}
    fenced = f"```\n{json.dumps(payload)}\n```"
    client, _ = _make_client_with_mock(fenced)
    result = await client.analyze_json("system", "prompt")
    assert result == payload


@pytest.mark.anyio
async def test_analyze_is_truly_async():
    """analyze() must be awaitable (i.e. it returns a coroutine)."""
    import inspect
    client, _ = _make_client_with_mock("{}")
    coro = client.analyze("sys", "usr")
    assert inspect.iscoroutine(coro)
    await coro
