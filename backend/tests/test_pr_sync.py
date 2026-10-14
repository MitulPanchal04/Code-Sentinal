"""Tests for the initial PR-sync feature.

Covers webhook signature verification, paginated PR fetching, idempotent
upserts, install/repo-added webhook handling, PR state tracking, and the
background sync job path — all with mocked GitHub API and session layers.
"""

from __future__ import annotations

import hashlib
import hmac
from unittest.mock import AsyncMock, MagicMock

import pytest
from conftest import FakeSession, make_pr, make_repo, make_review
from fastapi import HTTPException

import codesentinel.github.sync as sync_module
import codesentinel.github.webhook as webhook_module
import codesentinel.queue.processor as processor_module
from codesentinel.database.models import ReviewJob
from codesentinel.github.sync import (
    JOB_TYPE_SYNC_PRS,
    _upsert_row,
    enqueue_pr_sync,
    pr_state_of,
    sync_installation_pull_requests,
    upsert_pull_request_row,
)
from codesentinel.github.webhook import handle_webhook_event, verify_signature

# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------


def test_verify_signature_valid():
    webhook_module._settings.github_webhook_secret = "whsec"
    body = b'{"action": "opened"}'
    sig = "sha256=" + hmac.new(b"whsec", body, hashlib.sha256).hexdigest()
    verify_signature(body, sig)  # no raise


def test_verify_signature_invalid():
    webhook_module._settings.github_webhook_secret = "whsec"
    with pytest.raises(HTTPException):
        verify_signature(b"{}", "sha256=deadbeef")
    with pytest.raises(HTTPException):
        verify_signature(b"{}", None)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def test_pr_state_of():
    assert pr_state_of(make_pr(1)) == "open"
    assert pr_state_of(make_pr(1, state="closed")) == "closed"
    assert pr_state_of(make_pr(1, state="closed", merged_at="2026-01-03T00:00:00Z")) == "merged"


def test_parse_gh_timestamp():
    from codesentinel.github.sync import parse_gh_timestamp

    assert parse_gh_timestamp(None) is None
    assert parse_gh_timestamp("") is None
    ts = parse_gh_timestamp("2026-01-01T10:00:00Z")
    assert ts is not None and ts.year == 2026 and ts.tzinfo is None


# ---------------------------------------------------------------------------
# Upsert logic
# ---------------------------------------------------------------------------


async def test_upsert_creates_not_reviewed_row(store):
    session = FakeSession(store)
    pr = make_pr(5, sha="a" * 40)
    row = _upsert_row(
        [], session, 7, "acme/widgets", pr, state="open", mark_pending=False
    )
    assert row.status == "not_reviewed"
    assert row.pr_state == "open"
    assert row.pr_title == "Test PR"
    assert row.author == "octocat"
    assert row.head_branch == "feature-x"
    assert row.base_branch == "main"
    assert row.github_pr_id == 50
    assert row.repo_id == 555
    assert row.pr_number_commit_sha == f"5#{'a' * 40}"
    assert row in store.reviews


async def test_upsert_is_idempotent(store):
    session = FakeSession(store)
    pr = make_pr(5)
    rows: list = []
    _upsert_row(rows, session, 7, "acme/widgets", pr, state="open", mark_pending=False)
    _upsert_row(rows, session, 7, "acme/widgets", pr, state="open", mark_pending=False)
    assert len(store.reviews) == 1


async def test_upsert_moves_stale_row_to_new_sha(store):
    session = FakeSession(store)
    rows: list = []
    _upsert_row(rows, session, 7, "acme/widgets", make_pr(5, sha="a" * 40),
                state="open", mark_pending=False)
    _upsert_row(rows, session, 7, "acme/widgets", make_pr(5, sha="b" * 40),
                state="open", mark_pending=False)
    assert len(store.reviews) == 1
    assert store.reviews[0].commit_sha == "b" * 40
    assert store.reviews[0].pr_number_commit_sha == f"5#{'b' * 40}"


async def test_upsert_preserves_existing_review(store):
    session = FakeSession(store)
    existing = make_review(pr_number=5, commit_sha="c" * 40, status="complete")
    existing.merge_score = 4
    existing.findings = [{"severity": "warning"}]
    store.reviews.append(existing)
    rows = [existing]

    target = _upsert_row(
        rows, session, 7, "acme/widgets", make_pr(5, sha="c" * 40),
        state="open", mark_pending=False,
    )
    assert target is existing
    assert target.status == "complete"
    assert target.merge_score == 4
    assert target.findings == [{"severity": "warning"}]
    # metadata still refreshed
    assert target.pr_title == "Test PR"
    assert target.pr_state == "open"


async def test_upsert_drops_stale_not_reviewed_when_review_exists(store):
    session = FakeSession(store)
    stale = make_review(pr_number=5, commit_sha="a" * 40, status="not_reviewed")
    reviewed = make_review(pr_number=5, commit_sha="b" * 40, status="complete")
    store.reviews.extend([stale, reviewed])
    rows = list(store.reviews)

    _upsert_row(rows, session, 7, "acme/widgets", make_pr(5, sha="b" * 40),
                state="open", mark_pending=False)
    assert stale not in store.reviews
    assert reviewed in store.reviews
    assert reviewed.status == "complete"


async def test_upsert_mark_pending(store):
    session = FakeSession(store)
    rows: list = []
    _upsert_row(rows, session, 7, "acme/widgets", make_pr(5),
              state="open", mark_pending=True)
    assert rows[0].status == "pending"


async def test_upsert_pull_request_row_filters_by_pr(store):
    """Rows for other PRs in the same repo must not be touched."""
    session = FakeSession(store)
    other = make_review(pr_number=9, commit_sha="d" * 40, status="not_reviewed")
    other.pr_state = "open"
    store.reviews.append(other)

    await upsert_pull_request_row(
        session, 7, "acme/widgets", make_pr(5), pr_state="open"
    )
    # other PR untouched; new row created for PR 5
    assert other.pr_state == "open"
    assert len(store.reviews) == 2


# ---------------------------------------------------------------------------
# Sync job enqueue / dedupe
# ---------------------------------------------------------------------------


async def test_enqueue_pr_sync_creates_job(store, fake_session_factory):
    assert await enqueue_pr_sync(7, ["acme/widgets"]) is True
    assert len(store.jobs) == 1
    job = store.jobs[0]
    assert job.payload["job_type"] == JOB_TYPE_SYNC_PRS
    assert job.payload["installation_id"] == 7
    assert job.payload["repos"] == ["acme/widgets"]
    assert job.status == "queued"


async def test_enqueue_pr_sync_dedupes(store, fake_session_factory):
    assert await enqueue_pr_sync(7, None) is True
    assert await enqueue_pr_sync(7, None) is False
    assert await enqueue_pr_sync(7, ["acme/widgets"]) is False
    assert len(store.jobs) == 1


async def test_enqueue_pr_sync_after_done(store, fake_session_factory):
    await enqueue_pr_sync(7, None)
    store.jobs[0].status = "done"
    assert await enqueue_pr_sync(7, None) is True
    assert len(store.jobs) == 2


# ---------------------------------------------------------------------------
# Webhook handling
# ---------------------------------------------------------------------------


async def test_installation_created_enqueues_sync(store, fake_session_factory):
    payload = {
        "action": "created",
        "installation": {"id": 7},
        "sender": {"id": 42, "login": "octocat"},
        "repositories": [make_repo("acme/widgets"), make_repo("acme/gadgets")],
    }
    result = await handle_webhook_event("installation", "created", payload)
    assert result["status"] == "installed"
    assert {i.repo_full_name for i in store.installations} == {
        "acme/widgets",
        "acme/gadgets",
    }
    # a PR sync job was queued
    assert len(store.jobs) == 1
    assert store.jobs[0].payload["job_type"] == JOB_TYPE_SYNC_PRS


async def test_installation_created_empty_repos_still_syncs(
    store, fake_session_factory
):
    """'All repositories' installs may carry an empty repo list — the sync
    job discovers accessible repos itself."""
    payload = {
        "action": "created",
        "installation": {"id": 8},
        "sender": {"id": 42, "login": "octocat"},
        "repositories": [],
    }
    await handle_webhook_event("installation", "created", payload)
    assert len(store.jobs) == 1
    assert store.jobs[0].payload["repos"] == []


async def test_installation_repositories_added_enqueues_sync(
    store, fake_session_factory
):
    payload = {
        "action": "added",
        "installation": {"id": 7},
        "sender": {"id": 42, "login": "octocat"},
        "repositories_added": [make_repo("acme/new-repo")],
    }
    result = await handle_webhook_event(
        "installation_repositories", "added", payload
    )
    assert result["status"] == "repos_added"
    assert len(store.jobs) == 1
    assert store.jobs[0].payload["repos"] == ["acme/new-repo"]


async def test_installation_repositories_removed_deletes_rows(
    store, fake_session_factory
):
    from codesentinel.database.models import Installation

    store.installations.append(
        Installation(installation_id=7, repo_full_name="acme/widgets")
    )
    payload = {
        "action": "removed",
        "installation": {"id": 7},
        "repositories_removed": [make_repo("acme/widgets")],
    }
    result = await handle_webhook_event(
        "installation_repositories", "removed", payload
    )
    assert result["status"] == "repos_removed"
    assert store.installations == []


async def test_pull_request_closed_updates_state(store, fake_session_factory):
    row = make_review(pr_number=5, commit_sha="a" * 40, status="not_reviewed")
    row.pr_state = "open"
    store.reviews.append(row)

    payload = {
        "action": "closed",
        "installation": {"id": 7},
        "repository": make_repo(),
        "pull_request": make_pr(5, sha="a" * 40, state="closed"),
    }
    result = await handle_webhook_event("pull_request", "closed", payload)
    assert result["status"] == "pr_updated"
    assert row.pr_state == "closed"
    # no review job was enqueued
    assert store.jobs == []


async def test_pull_request_merged_updates_state(store, fake_session_factory):
    row = make_review(pr_number=5, commit_sha="a" * 40, status="not_reviewed")
    row.pr_state = "open"
    store.reviews.append(row)

    payload = {
        "action": "closed",
        "installation": {"id": 7},
        "repository": make_repo(),
        "pull_request": make_pr(
            5, sha="a" * 40, state="closed", merged_at="2026-01-03T00:00:00Z"
        ),
    }
    await handle_webhook_event("pull_request", "closed", payload)
    assert row.pr_state == "merged"


async def test_pull_request_edited_updates_title(store, fake_session_factory):
    row = make_review(pr_number=5, commit_sha="a" * 40, status="not_reviewed")
    store.reviews.append(row)

    payload = {
        "action": "edited",
        "installation": {"id": 7},
        "repository": make_repo(),
        "pull_request": make_pr(5, sha="a" * 40, title="Renamed PR"),
    }
    await handle_webhook_event("pull_request", "edited", payload)
    assert row.pr_title == "Renamed PR"
    assert row.status == "not_reviewed"


async def test_pull_request_opened_marks_pending_and_enqueues(
    store, fake_session_factory, monkeypatch
):
    # Prevent real GitHub API calls for the check run
    fake_gc = MagicMock()
    fake_gc.create_check_run = AsyncMock(return_value={"id": 99})
    monkeypatch.setattr(webhook_module, "GitHubClient", lambda *a, **k: fake_gc)
    monkeypatch.setattr(webhook_module, "get_github_auth", lambda: MagicMock())

    payload = {
        "action": "opened",
        "installation": {"id": 7},
        "repository": make_repo(),
        "pull_request": make_pr(5, sha="a" * 40),
    }
    result = await handle_webhook_event("pull_request", "opened", payload)
    assert result["status"] == "enqueued"
    assert len(store.jobs) == 1
    assert store.jobs[0].payload.get("job_type") != JOB_TYPE_SYNC_PRS
    assert store.reviews[0].status == "pending"


async def test_pull_request_draft_creates_not_reviewed_only(
    store, fake_session_factory, monkeypatch
):
    payload = {
        "action": "opened",
        "installation": {"id": 7},
        "repository": make_repo(),
        "pull_request": make_pr(5, sha="a" * 40, draft=True),
    }
    result = await handle_webhook_event("pull_request", "opened", payload)
    assert result["status"] == "skipped"
    assert store.reviews[0].status == "not_reviewed"
    assert store.jobs == []


async def test_check_rerequest_marks_pending(store, fake_session_factory, monkeypatch):
    row = make_review(pr_number=5, commit_sha="a" * 40, status="complete")
    store.reviews.append(row)

    fake_gc = MagicMock()
    fake_gc.create_check_run = AsyncMock(return_value={"id": 100})
    monkeypatch.setattr(webhook_module, "GitHubClient", lambda *a, **k: fake_gc)
    monkeypatch.setattr(webhook_module, "get_github_auth", lambda: MagicMock())

    payload = {
        "action": "rerequested",
        "installation": {"id": 7},
        "repository": make_repo(),
        "check_run": {
            "head_sha": "a" * 40,
            "check_suite": {"pull_requests": [{"number": 5}]},
        },
    }
    result = await handle_webhook_event("check_run", "rerequested", payload)
    assert result["status"] == "enqueued"
    assert row.status == "pending"


# ---------------------------------------------------------------------------
# GitHub client pagination
# ---------------------------------------------------------------------------


async def test_list_open_pull_requests_paginates():
    from codesentinel.github.client import GitHubClient

    gc = GitHubClient(MagicMock(), 7)
    page1 = [make_pr(i) for i in range(1, 101)]
    page2 = [make_pr(i) for i in range(101, 104)]

    calls = []

    async def fake_request(method, url, **kwargs):
        calls.append(kwargs.get("params"))
        resp = MagicMock()
        page = kwargs["params"]["page"]
        resp.json = lambda: page1 if page == 1 else page2
        return resp

    gc._request = fake_request
    prs = await gc.list_open_pull_requests("acme", "widgets")
    assert len(prs) == 103
    assert len(calls) == 2
    assert calls[0]["per_page"] == 100
    assert calls[0]["state"] == "open"


async def test_list_accessible_repositories_paginates():
    from codesentinel.github.client import GitHubClient

    gc = GitHubClient(MagicMock(), 7)

    async def fake_request(method, url, **kwargs):
        resp = MagicMock()
        page = kwargs["params"]["page"]
        batch = (
            [{"full_name": f"acme/repo-{i}"} for i in range(100)]
            if page == 1
            else [{"full_name": "acme/repo-100"}]
        )
        resp.json = lambda: {"repositories": batch}
        return resp

    gc._request = fake_request
    repos = await gc.list_accessible_repositories()
    assert len(repos) == 101


# ---------------------------------------------------------------------------
# Full sync path (mocked GitHub client + fake session)
# ---------------------------------------------------------------------------


class FakeGitHubClient:
    def __init__(self, repos=None, prs_by_repo=None, pr_details=None):
        self._repos = repos or []
        self._prs = prs_by_repo or {}
        self._details = pr_details or {}

    async def list_accessible_repositories(self):
        return self._repos

    async def list_open_pull_requests(self, owner, repo):
        return self._prs.get(f"{owner}/{repo}", [])

    async def get_pr(self, owner, repo, number):
        return self._details[(owner, repo, number)]


def _patch_github(monkeypatch, fake_client):
    monkeypatch.setattr(sync_module, "get_github_auth", lambda: MagicMock())
    monkeypatch.setattr(
        sync_module, "GitHubClient", lambda *a, **k: fake_client
    )


async def test_sync_discovers_repos_and_upserts(store, fake_session_factory, monkeypatch):
    client = FakeGitHubClient(
        repos=[{"full_name": "acme/widgets"}, {"full_name": "acme/gadgets"}],
        prs_by_repo={
            "acme/widgets": [make_pr(1), make_pr(2, sha="b" * 40)],
            "acme/gadgets": [make_pr(7, sha="c" * 40)],
        },
    )
    _patch_github(monkeypatch, client)

    result = await sync_installation_pull_requests(7, None)
    assert result["open_prs"] == 3
    assert len(store.reviews) == 3
    assert all(r.status == "not_reviewed" for r in store.reviews)
    # repos were reconciled into installations
    assert {i.repo_full_name for i in store.installations} == {
        "acme/widgets",
        "acme/gadgets",
    }
    # no AI review jobs enqueued
    assert all(
        j.payload["job_type"] == JOB_TYPE_SYNC_PRS for j in store.jobs
    ) or store.jobs == []


async def test_sync_is_idempotent(store, fake_session_factory, monkeypatch):
    client = FakeGitHubClient(
        prs_by_repo={"acme/widgets": [make_pr(1), make_pr(2)]},
    )
    _patch_github(monkeypatch, client)

    await sync_installation_pull_requests(7, ["acme/widgets"])
    await sync_installation_pull_requests(7, ["acme/widgets"])
    assert len(store.reviews) == 2


async def test_sync_marks_disappeared_pr_as_merged(
    store, fake_session_factory, monkeypatch
):
    row = make_review(pr_number=9, commit_sha="a" * 40, status="not_reviewed")
    row.pr_state = "open"
    store.reviews.append(row)

    client = FakeGitHubClient(
        prs_by_repo={"acme/widgets": [make_pr(1)]},
        pr_details={
            ("acme", "widgets", 9): make_pr(
                9, state="closed", merged_at="2026-01-03T00:00:00Z"
            )
        },
    )
    _patch_github(monkeypatch, client)

    await sync_installation_pull_requests(7, ["acme/widgets"])
    assert row.pr_state == "merged"


async def test_sync_partial_failure_raises_for_retry(
    store, fake_session_factory, monkeypatch
):
    class FlakyClient(FakeGitHubClient):
        async def list_open_pull_requests(self, owner, repo):
            if repo == "bad":
                raise RuntimeError("boom")
            return [make_pr(1)]

    client = FlakyClient()
    _patch_github(monkeypatch, client)

    with pytest.raises(RuntimeError, match="bad"):
        await sync_installation_pull_requests(7, ["acme/good", "acme/bad"])
    # good repo was still synced
    assert any(r.repo_full_name == "acme/good" for r in store.reviews)


async def test_sync_does_not_trigger_reviews(store, fake_session_factory, monkeypatch):
    """Synced PRs must never enqueue AI review jobs."""
    client = FakeGitHubClient(prs_by_repo={"acme/widgets": [make_pr(1), make_pr(2)]})
    _patch_github(monkeypatch, client)

    await sync_installation_pull_requests(7, ["acme/widgets"])
    review_jobs = [
        j for j in store.jobs if j.payload.get("job_type") != JOB_TYPE_SYNC_PRS
    ]
    assert review_jobs == []


# ---------------------------------------------------------------------------
# Worker dispatch + review result storage
# ---------------------------------------------------------------------------


async def test_process_job_dispatches_sync(store, fake_session_factory, monkeypatch):
    called = {}

    async def fake_sync(installation_id, repos):
        called["args"] = (installation_id, repos)

    monkeypatch.setattr(
        processor_module, "sync_installation_pull_requests", fake_sync
    )

    job = ReviewJob(
        id=1,
        installation_id=7,
        repo_full_name="",
        pr_number=0,
        commit_sha="",
        payload={
            "job_type": JOB_TYPE_SYNC_PRS,
            "installation_id": 7,
            "repos": ["acme/widgets"],
        },
        status="queued",
    )
    await processor_module.process_review_job(job)
    assert called["args"] == (7, ["acme/widgets"])


async def test_store_review_result_cleans_stale_rows(store, fake_session_factory):
    stale = make_review(pr_number=5, commit_sha="a" * 40, status="not_reviewed")
    store.reviews.append(stale)

    await processor_module._store_review_result(
        installation_id=7,
        repo_full_name="acme/widgets",
        pr_number=5,
        commit_sha="b" * 40,
        pr_number_commit_sha=f"5#{'b' * 40}",
        status="complete",
        findings=[],
        summary="ok",
        diagram="",
        merge_score=4,
        merge_score_reason="fine",
        tokens={"input": 1, "output": 1},
        cost=0.0,
        enabled_agent_count=1,
        review_mode="review",
        pr_meta={"pr_title": "Hello", "pr_state": "open"},
    )
    assert stale not in store.reviews
    new_row = store.reviews[0]
    assert new_row.status == "complete"
    assert new_row.pr_title == "Hello"
    assert new_row.pr_state == "open"


async def test_store_review_result_updates_existing(store, fake_session_factory):
    existing = make_review(pr_number=5, commit_sha="b" * 40, status="pending")
    store.reviews.append(existing)

    await processor_module._store_review_result(
        installation_id=7,
        repo_full_name="acme/widgets",
        pr_number=5,
        commit_sha="b" * 40,
        pr_number_commit_sha=f"5#{'b' * 40}",
        status="complete",
        findings=[{"severity": "info"}],
        summary="done",
        diagram="",
        merge_score=5,
        merge_score_reason="clean",
        tokens={},
        cost=0.0,
        enabled_agent_count=6,
        review_mode="review",
    )
    assert len(store.reviews) == 1
    assert existing.status == "complete"
    assert existing.merge_score == 5
