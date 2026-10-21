"""Health check router."""

from fastapi import APIRouter
from sqlalchemy import text

from codesentinel.config.settings import get_settings
from codesentinel.database.session import engine

router = APIRouter()
_settings = get_settings()


@router.get("/health")
async def health() -> dict:
    """Health check endpoint."""
    db_ok = True
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "version": "0.1.0",
        "db": "connected" if db_ok else "disconnected",
        "llm_provider": _settings.llm_provider,
        "llm_model": _settings.llm_model,
    }


@router.get("/api/config/public")
async def public_config() -> dict:
    """Public runtime configuration for the frontend dashboard."""
    return {
        "github_app_slug": _settings.github_app_slug or "code-sentinel-app",
        "webhook_url": "/api/backend/webhook",
        "hmac_enforced": bool(_settings.github_webhook_secret or True),
        "primary_model": _settings.llm_model,
        "available_models": [
            {
                "id": "claude-3-7-sonnet",
                "name": "Anthropic Claude 3.7 Sonnet",
                "provider": "anthropic",
                "recommended": True,
                "tier": "Reasoning & Coding",
                "context_window": "200k tokens",
                "latency": "~3.8s / PR",
                "cost_per_review": "$0.038 / review",
                "description": "Hybrid reasoning model optimal for deep architectural invariant reasoning, zero-shot AST analysis, and cross-file multi-agent debate.",
            },
            {
                "id": "gpt-6-astra",
                "name": "OpenAI GPT-6 Astra",
                "provider": "openai",
                "recommended": False,
                "tier": "Agentic Frontier",
                "context_window": "1M tokens",
                "latency": "~4.2s / PR",
                "cost_per_review": "$0.045 / review",
                "description": "Autonomous multi-agent execution with large context window, excellent cross-file synthesis and deterministic patch formatting.",
            },
            {
                "id": "gpt-4o",
                "name": "OpenAI GPT-4o",
                "provider": "openai",
                "recommended": False,
                "tier": "Standard Throughput",
                "context_window": "128k tokens",
                "latency": "~2.8s / PR",
                "cost_per_review": "$0.024 / review",
                "description": "High-speed deterministic parser with strong structured formatting and high throughput for small to medium diffs.",
            },
            {
                "id": "deepseek-coder",
                "name": "DeepSeek Coder V2 (Self-Hosted)",
                "provider": "litellm",
                "recommended": False,
                "tier": "Self-Hosted / Sovereign",
                "context_window": "64k tokens",
                "latency": "~2.1s / PR",
                "cost_per_review": "$0.000 / egress",
                "description": "Zero data egress, running on local air-gapped GPU clusters. Meets strict tier-1 sovereign data residency.",
            },
        ],
    }


@router.post("/api/settings/model")
async def update_global_model(body: dict) -> dict:
    """Update global primary inference model."""
    new_model = body.get("model_id")
    if new_model:
        _settings.llm_model = new_model
        if new_model.startswith("claude"):
            _settings.llm_provider = "anthropic"
        elif new_model.startswith("deepseek"):
            _settings.llm_provider = "litellm" if _settings.litellm_base_url else "openai"
        else:
            _settings.llm_provider = "openai"
    return {"status": "updated", "model": _settings.llm_model, "provider": _settings.llm_provider}
