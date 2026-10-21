"""Tests for the live telemetry and analytics aggregation endpoint."""

import pytest
from httpx import AsyncClient, ASGITransport
from codesentinel.main import app
from codesentinel.database.models import Review, Installation
from codesentinel.database.session import get_db


@pytest.mark.asyncio
async def test_telemetry_empty_db(fake_session_factory):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.dependency_overrides[get_db] = fake_session_factory
        try:
            resp = await client.get("/api/analytics/telemetry")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total_reviews"] == 0
            assert data["total_repos"] == 0
            assert data["pass_rate_pct"] == 0.0
            assert data["blocker_defects"] == 0
            assert data["total_cost_usd"] == 0.0
            assert data["total_findings"] == 0
            assert len(data["agent_fleet"]) == 6
            assert data["agent_fleet"][0]["invocations"] == 0
        finally:
            app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_telemetry_with_reviews(fake_session_factory, store):
    # Insert installation and review directly into store
    inst = Installation(
        installation_id=999,
        repo_full_name="acme/my-real-service",
        github_user_id=1,
    )
    store.installations.append(inst)

    r1 = Review(
        installation_id=999,
        repo_full_name="acme/my-real-service",
        pr_number=1,
        commit_sha="abc1234",
        pr_number_commit_sha="1_abc1234",
        status="complete",
        verdict="merge_ready",
        merge_score=5,
        estimated_cost_usd=0.045,
        input_tokens=1000,
        output_tokens=500,
        findings=[
            {"category": "security", "severity": "info", "title": "Sec finding"},
            {"category": "bugs", "severity": "critical", "title": "Bug finding"},
        ],
    )
    store.reviews.append(r1)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.dependency_overrides[get_db] = fake_session_factory
        try:
            resp = await client.get("/api/analytics/telemetry")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total_reviews"] == 1
            assert data["total_repos"] == 1
            assert data["pass_rate_pct"] == 100.0
            assert data["blocker_defects"] == 1
            assert data["avg_merge_score"] == 10.0
            assert data["total_cost_usd"] == 0.045
            assert data["findings_by_module"]["security"] == 1
            assert data["findings_by_module"]["bugs"] == 1
            assert data["total_findings"] == 2
            assert data["agent_fleet"][0]["invocations"] == 1
        finally:
            app.dependency_overrides.pop(get_db, None)
