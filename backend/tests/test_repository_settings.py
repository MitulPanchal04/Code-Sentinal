"""Tests for the repository-level rulebook and settings feature."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from codesentinel.api.routers.installations import get_repo_settings, update_repo_settings
from codesentinel.database.models import RepositorySettings, Installation
from codesentinel.agents.pipeline import (
    load_context_node,
    security_agent_node,
    style_agent_node,
    orchestration_node,
    PROFILE_PRESETS,
    ReviewState,
)
from conftest import FakeSession, Store


@pytest.mark.asyncio
async def test_get_repo_settings_defaults(store: Store):
    """When no repository_settings row exists, default settings are returned."""
    session = FakeSession(store)
    # Add an installation so ownership check passes
    session.store.installations.append(
        Installation(
            id=1,
            installation_id=123,
            repo_full_name="org/test-repo",
            github_user_id=456,
        )
    )

    resp = await get_repo_settings(
        installation_id=123,
        repo_full_name="org/test-repo",
        db=session,
        github_user_id=456,
    )

    assert resp["installation_id"] == 123
    assert resp["repo_full_name"] == "org/test-repo"
    assert resp["settings"]["profile"] == "standard"
    assert "security" in resp["settings"]["enabled_agents"]
    assert "style" in resp["settings"]["enabled_agents"]
    assert resp["settings"]["rulebook"] == ""


@pytest.mark.asyncio
async def test_update_repo_settings(store: Store):
    """Users can update profile, rulebook, and active agents for a repository."""
    session = FakeSession(store)
    session.store.installations.append(
        Installation(
            id=1,
            installation_id=123,
            repo_full_name="org/client-repo",
            github_user_id=456,
        )
    )

    body = {
        "profile": "strict",
        "rulebook": "All DB queries must include tenant_id. Never log PII.",
        "enabled_agents": ["security", "bugs", "error_handling"],
        "min_severity": "warning",
        "min_confidence": 80,
    }

    update_resp = await update_repo_settings(
        installation_id=123,
        repo_full_name="org/client-repo",
        body=body,
        db=session,
        github_user_id=456,
    )
    assert update_resp["status"] == "updated"

    # Now get_repo_settings should return the updated settings
    get_resp = await get_repo_settings(
        installation_id=123,
        repo_full_name="org/client-repo",
        db=session,
        github_user_id=456,
    )
    assert get_resp["settings"]["profile"] == "strict"
    assert get_resp["settings"]["rulebook"] == "All DB queries must include tenant_id. Never log PII."
    assert get_resp["settings"]["enabled_agents"] == ["security", "bugs", "error_handling"]
    assert get_resp["settings"]["min_severity"] == "warning"
    assert get_resp["settings"]["min_confidence"] == 80


@pytest.mark.asyncio
async def test_repo_settings_ownership_enforcement(store: Store):
    """Users cannot view or edit repository settings for an installation they do not own."""
    session = FakeSession(store)
    session.store.installations.append(
        Installation(
            id=1,
            installation_id=123,
            repo_full_name="org/other-repo",
            github_user_id=999,  # different user
        )
    )

    with pytest.raises(HTTPException) as exc_info:
        await get_repo_settings(
            installation_id=123,
            repo_full_name="org/other-repo",
            db=session,
            github_user_id=456,  # unauthorized user
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_load_context_node_applies_lenient_preset():
    """load_context_node applies lenient profile preset defaults."""
    mock_gc = AsyncMock()
    mock_gc.get_pr_diff.return_value = "diff --git a/test.py b/test.py"
    mock_gc.get_pr.return_value = {"title": "Test PR"}
    mock_gc.get_conventions.return_value = ""
    mock_gc.get_repo_config.return_value = {}

    state: ReviewState = {
        "github_client": mock_gc,
        "owner": "org",
        "repo": "dev-repo",
        "pr_number": 1,
        "commit_sha": "abc1234",
        "pr_title": "WIP PR",
        "pr_body": "",
        "diff": "",
        "pr_context": {},
        "config": {},
        "conventions": "",
        "repo_settings": {
            "profile": "lenient",
            "rulebook": "Internal prototype, speed is priority.",
        },
        "profile": "lenient",
        "rulebook": "Internal prototype, speed is priority.",
        "enabled_agents": ["security", "bugs"],
        "review_mode": "review",
        "raw_findings": [],
        "verified_findings": [],
        "disputed_keys": [],
        "previous_findings": [],
        "final_findings": [],
        "summary": "",
        "diagram": "",
        "delta_caption": "",
        "merge_score": 5,
        "merge_score_reason": "",
        "tokens_used": {"input": 0, "output": 0},
        "cost_usd": 0.0,
        "enabled_agent_count": 0,
        "errors": [],
    }

    result = await load_context_node(state)
    assert result["profile"] == "lenient"
    assert result["rulebook"] == "Internal prototype, speed is priority."
    assert result["config"]["min_confidence"] == 85
    assert result["config"]["min_severity"] == "warning"
    assert result["config"]["enabled_agents"] == ["security", "bugs"]
    assert "style" not in result["enabled_agents"]


@pytest.mark.asyncio
async def test_agent_skipped_when_disabled():
    """Agent nodes exit immediately without burning tokens when disabled."""
    state: ReviewState = {
        "github_client": AsyncMock(),
        "owner": "org",
        "repo": "test",
        "pr_number": 1,
        "commit_sha": "abc",
        "pr_title": "Test",
        "pr_body": "",
        "diff": "+line",
        "pr_context": {},
        "config": {},
        "conventions": "",
        "repo_settings": {},
        "profile": "lenient",
        "rulebook": "",
        # Only security enabled; style is omitted
        "enabled_agents": ["security"],
        "review_mode": "review",
        "raw_findings": [],
        "verified_findings": [],
        "disputed_keys": [],
        "previous_findings": [],
        "final_findings": [],
        "summary": "",
        "diagram": "",
        "delta_caption": "",
        "merge_score": 5,
        "merge_score_reason": "",
        "tokens_used": {"input": 0, "output": 0},
        "cost_usd": 0.0,
        "enabled_agent_count": 0,
        "errors": [],
    }

    style_output = await style_agent_node(state)
    assert style_output["raw_findings"] == []
    assert style_output["enabled_agent_count"] == 0
    assert style_output["tokens_used"] == {"input": 0, "output": 0}
