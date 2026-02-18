"""
Claude API Client
Manages all interactions with the Anthropic Claude API for manuscript analysis.
Handles long-context document processing as specified in the RDD.
"""
import json
from typing import Optional
from anthropic import Anthropic
from app.config import get_settings

settings = get_settings()


class ClaudeClient:
    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL
        self.max_tokens = settings.CLAUDE_MAX_TOKENS

    async def analyze(self, system_prompt: str, user_prompt: str, max_tokens: Optional[int] = None) -> str:
        """Send a prompt to Claude and return the response text."""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or self.max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text

    async def analyze_json(self, system_prompt: str, user_prompt: str, max_tokens: Optional[int] = None) -> dict:
        """Send a prompt to Claude and parse the response as JSON."""
        raw = await self.analyze(system_prompt, user_prompt, max_tokens)
        # Extract JSON from response (handle markdown code blocks)
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())


def get_claude_client() -> ClaudeClient:
    return ClaudeClient()
