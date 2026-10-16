"""Tests for the manual "Review PR" endpoint (POST /api/reviews/{id}/retry).

Verifies that a review only starts on an explicit user request: ownership and
repo access are enforced, in-flight/queued reviews and closed PRs are
rejected, the latest head SHA is fetched from GitHub, and exactly one review
job is enqueued for that PR.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from conftest import FakeSession, make_pr, make_review
from fastapi.testclient import TestClient

import codesentinel.api.routers.reviews as reviews_module
import codesentinel.github.webhook as webhook_module
from codesentinel.database.models import Installation, ReviewJob
from codesentinel.database.session import get_db
from codesentinel.github.sync import JOB_TYPE_SYNC_PRS
from codesentinel.main import app

USER_HEADERS = {"X-GitHub-User-Id": "42"}


@pytest.fixture
def api_client(store, monkeypatch):
    """TestClient wired to the in-memory store + mocked GitHub API."""
    session = FakeSession(store)

    async def fake_get_db():
        yield session

    app.dependency_overrides[get_db] = fake_get_db

    fake_gc = MagicMock()
    fake_gc.get_pr = AsyncMock(return_value=make_pr(5, sha="b" * 40))
    fake_gc.create_check_run = AsyncMock(return_value={"id": 999})
    # reviews.py builds its own client for get_pr; webhook.py builds one for
    # the queued check run inside request_pr_review.
    for mod in (reviews_module, webhook_module):
        monkeypatch.setattr(mod, "GitHubClient", lambda *a, **k: fake_gc)
        monkeypatch.setattr(mod, "get_github_auth", lambda: MagicMock())

    yield TestClient(app), fake_gc
    app.dependency_overrides.clear()


def _install(store, user: int = 42, repo: str = "acme/widgets") -> None:
    store.installations.append(
        Installation(
            id=1,
            installation_id=7,
            repo_full_name=repo,
            github_user_id=user,
        )
    )


def _review_row(store, status="not_reviewed", pr_state="open", **kw):
    row = make_review(
        installation_id=7,
        repo_full_name="acme/widgets",
        pr_number=5,
        commit_sha="a" * 40,
        status=status,
        **kw,
    )
    row.id = 1
    row.pr_state = pr_state
    store.reviews.append(row)
    return row


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_retry_enqueues_review_for_that_pr_only(api_client, store):
    client, fake_gc = api_client
    _install(store)
    row = _review_row(store)
    # A second PR must remain untouched
    _review_row2 = make_review(
        installation_id=7,
        repo_full_name="acme/widgets",
        pr_number=9,
        commit_sha="c" * 40,
        status="not_reviewed",
    )
    _review_row2.id = 2
    store.reviews.append(_review_row2)

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "enqueued"
    assert data["review"]["status"] == "pending"

    # exactly one review job, at the fresh head sha from GitHub
    assert len(store.jobs) == 1
    job = store.jobs[0]
    assert job.payload.get("job_type") != JOB_TYPE_SYNC_PRS
    assert job.payload["pr_number"] == 5
    assert job.payload["repo_full_name"] == "acme/widgets"
    assert job.payload["commit_sha"] == "b" * 40
    assert job.payload["review_mode"] == "review"
    assert job.payload["check_run_id"] == 999

    # the clicked row moved to the new sha and is pending
    assert row.status == "pending"
    assert row.commit_sha == "b" * 40
    # the other PR is still untouched / unreviewed
    assert _review_row2.status == "not_reviewed"
    assert store.jobs[0].pr_number == 5


def test_retry_allows_review_again_on_complete(api_client, store):
    client, _ = api_client
    _install(store)
    row = _review_row(store, status="complete")
    row.merge_score = 4

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 200
    assert len(store.jobs) == 1


def test_retry_allows_retry_on_failed(api_client, store):
    client, _ = api_client
    _install(store)
    _review_row(store, status="failed")

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 200
    assert len(store.jobs) == 1


# ---------------------------------------------------------------------------
# Guards / rejections
# ---------------------------------------------------------------------------


def test_retry_rejects_when_pending(api_client, store):
    client, _ = api_client
    _install(store)
    _review_row(store, status="pending")

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 409
    assert store.jobs == []


def test_retry_rejects_when_running(api_client, store):
    client, _ = api_client
    _install(store)
    _review_row(store, status="running")

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 409
    assert store.jobs == []


def test_retry_rejects_when_review_job_already_queued(api_client, store):
    """Duplicate protection must not rely on the review row status alone."""
    client, _ = api_client
    _install(store)
    _review_row(store, status="not_reviewed")
    store.jobs.append(
        ReviewJob(
            installation_id=7,
            repo_full_name="acme/widgets",
            pr_number=5,
            commit_sha="a" * 40,
            payload={"installation_id": 7, "pr_number": 5},
            status="queued",
        )
    )

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 409
    assert len(store.jobs) == 1


def test_retry_allowed_when_only_sync_job_queued(api_client, store):
    """A queued PR-sync job must not block a manual review."""
    client, _ = api_client
    _install(store)
    _review_row(store)
    store.jobs.append(
        ReviewJob(
            installation_id=7,
            repo_full_name="acme/widgets",
            pr_number=0,
            commit_sha="",
            payload={"job_type": JOB_TYPE_SYNC_PRS, "installation_id": 7},
            status="queued",
        )
    )

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 200
    assert len(store.jobs) == 2


def test_retry_rejects_closed_pr(api_client, store):
    client, fake_gc = api_client
    _install(store)
    _review_row(store, pr_state="closed")

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 409
    # no GitHub call needed — the stored state already says closed
    assert not fake_gc.get_pr.called
    assert store.jobs == []


def test_retry_marks_state_and_rejects_if_pr_closed_on_github(api_client, store):
    client, fake_gc = api_client
    _install(store)
    row = _review_row(store, pr_state="open")
    fake_gc.get_pr = AsyncMock(
        return_value=make_pr(5, sha="a" * 40, state="closed")
    )

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 409
    assert row.pr_state == "closed"  # stale state synced opportunistically
    assert store.jobs == []


def test_retry_404_for_other_users_review(api_client, store):
    client, _ = api_client
    _install(store, user=99)  # installation belongs to a different user
    _review_row(store)

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 404
    assert store.jobs == []


def test_retry_404_when_row_missing(api_client, store):
    client, _ = api_client
    _install(store)
    resp = client.post("/api/reviews/999/retry", headers=USER_HEADERS)
    assert resp.status_code == 404


def test_retry_401_without_user_header(api_client, store):
    client, _ = api_client
    _install(store)
    _review_row(store)
    resp = client.post("/api/reviews/1/retry")
    assert resp.status_code == 401


def test_retry_404_when_pr_deleted_on_github(api_client, store):
    client, fake_gc = api_client
    _install(store)
    _review_row(store)
    request = httpx.Request("GET", "https://api.github.com/x")
    fake_gc.get_pr = AsyncMock(
        side_effect=httpx.HTTPStatusError(
            "not found",
            request=request,
            response=httpx.Response(404, request=request),
        )
    )

    resp = client.post("/api/reviews/1/retry", headers=USER_HEADERS)
    assert resp.status_code == 404
    assert store.jobs == []


# ---------------------------------------------------------------------------
# queued → running transition
# ---------------------------------------------------------------------------


async def test_mark_review_running(store, fake_session_factory):
    from codesentinel.github.sync import mark_review_running

    row = make_review(pr_number=5, commit_sha="a" * 40, status="pending")
    store.reviews.append(row)
    await mark_review_running("acme/widgets", 5, "a" * 40)
    assert row.status == "running"

    # complete rows are untouched
    done = make_review(pr_number=6, commit_sha="c" * 40, status="complete")
    store.reviews.append(done)
    await mark_review_running("acme/widgets", 6, "c" * 40)
    assert done.status == "complete"
