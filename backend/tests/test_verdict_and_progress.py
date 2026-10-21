"""Tests for review verdict state machine, live progress, and LiteLLM cost accounting."""

import pytest
from codesentinel.api.routers.reviews import _compute_verdict, _serialize_review
from codesentinel.database.models import Review
from codesentinel.queue.processor import calculate_review_cost


def test_verdict_in_progress():
    r = Review(status="pending", verdict="in_progress")
    assert _compute_verdict(r) == "in_progress"

    r2 = Review(status="in_progress")
    assert _compute_verdict(r2) == "in_progress"


def test_verdict_merge_ready():
    r = Review(
        status="complete",
        merge_score=9,
        findings=[{"severity": "info", "title": "Style note"}],
    )
    assert _compute_verdict(r) == "merge_ready"


def test_verdict_blocked_on_critical():
    r = Review(
        status="complete",
        merge_score=8,
        findings=[
            {"severity": "critical", "title": "SQL Injection"},
            {"severity": "info", "title": "Style note"},
        ],
    )
    assert _compute_verdict(r) == "blocked"


def test_verdict_blocked_on_low_score():
    r = Review(
        status="complete",
        merge_score=3,
        findings=[{"severity": "warning", "title": "Minor warning"}],
    )
    assert _compute_verdict(r) == "blocked"


def test_verdict_changes_requested():
    r = Review(
        status="complete",
        merge_score=6,
        findings=[{"severity": "warning", "title": "Unchecked error"}],
    )
    assert _compute_verdict(r) == "changes_requested"


def test_serialize_review_progress():
    r = Review(
        id=1,
        installation_id=123,
        repo_full_name="org/repo",
        pr_number=42,
        commit_sha="abcdef123456",
        status="in_progress",
        verdict="in_progress",
        progress={
            "completed_agents": 4,
            "total_agents": 6,
            "current_step": "test_coverage",
            "step_label": "Testing",
        },
    )
    data = _serialize_review(r)
    assert data["verdict"] == "in_progress"
    assert data["progress"]["completed_agents"] == 4
    assert data["progress"]["total_agents"] == 6


def test_calculate_review_cost():
    tokens = {"input": 1000, "output": 500}
    cost = calculate_review_cost("gpt-4o", tokens)
    assert cost > 0.0
    assert cost < 0.1
