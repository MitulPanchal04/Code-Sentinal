"""Pull request synchronization — fetches existing open PRs for an installation.

Synced PRs are stored as ``reviews`` rows with ``status='not_reviewed'`` so
the dashboard can display them without triggering an AI review. When a real
review runs (via the normal webhook flow) the same row is updated in place
because it shares the ``(repo_full_name, "pr#sha")`` key.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select, update
from structlog import get_logger

from codesentinel.database.models import Installation, Review, ReviewJob
from codesentinel.database.session import async_session_factory
from codesentinel.github.auth import get_github_auth
from codesentinel.github.client import GitHubClient

logger = get_logger()

JOB_TYPE_SYNC_PRS = "sync_prs"

_NOT_REVIEWED = "not_reviewed"
_PENDING = "pending"


def parse_gh_timestamp(value: str | None) -> datetime | None:
    """Parse a GitHub ISO-8601 timestamp into a naive UTC datetime."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(
            tzinfo=None
        )
    except (ValueError, TypeError):
        return None


def pr_state_of(pr: dict) -> str:
    """Derive open/closed/merged from a GitHub PR object."""
    if pr.get("merged_at") or pr.get("merged"):
        return "merged"
    state = pr.get("state") or "open"
    return "merged" if state == "merged" else state


def apply_pr_meta(row: Review, pr: dict, repo_id: int | None = None) -> None:
    """Populate PR metadata columns on a review row from a GitHub PR object."""
    row.pr_title = pr.get("title") or ""
    row.pr_url = pr.get("html_url") or ""
    row.author = (pr.get("user") or {}).get("login") or ""
    row.head_branch = (pr.get("head") or {}).get("ref") or ""
    row.base_branch = (pr.get("base") or {}).get("ref") or ""
    row.github_pr_id = pr.get("id")
    if repo_id is not None:
        row.repo_id = repo_id
    elif pr.get("base", {}).get("repo"):
        row.repo_id = pr["base"]["repo"].get("id")
    row.pr_created_at = parse_gh_timestamp(pr.get("created_at"))
    row.pr_updated_at = parse_gh_timestamp(pr.get("updated_at"))


def apply_pr_meta_dict(row: Review, meta: dict[str, Any]) -> None:
    """Populate PR metadata from a plain dict (e.g. a review job payload)."""
    for key in ("pr_title", "pr_url", "author", "head_branch", "base_branch", "pr_state"):
        if meta.get(key) is not None:
            setattr(row, key, meta[key])


def _upsert_row(
    rows: list[Review],
    session: Any,
    installation_id: int,
    repo_full_name: str,
    pr: dict,
    *,
    state: str,
    mark_pending: bool,
    repo_id: int | None = None,
) -> Review:
    """Upsert the row for one PR within a preloaded list of repo/PR rows.

    ``rows`` must contain every Review row for this repo (or at least every
    row for this PR number). It is mutated in place.
    """
    pr_number = pr["number"]
    commit_sha = (pr.get("head") or {}).get("sha") or ""
    key = f"{pr_number}#{commit_sha}"
    pr_rows = [r for r in rows if r.pr_number == pr_number]

    # Prefer the row already keyed to the current head sha.
    target = next((r for r in pr_rows if r.pr_number_commit_sha == key), None)
    if target is None:
        # Reuse a stale not_reviewed row for this PR (head moved since sync).
        target = next((r for r in pr_rows if r.status == _NOT_REVIEWED), None)
        if target is not None:
            target.commit_sha = commit_sha
            target.pr_number_commit_sha = key
        else:
            target = Review(
                installation_id=installation_id,
                repo_full_name=repo_full_name,
                pr_number=pr_number,
                pr_number_commit_sha=key,
                commit_sha=commit_sha,
                status=_PENDING if mark_pending else _NOT_REVIEWED,
            )
            session.add(target)
            rows.append(target)
            pr_rows.append(target)

    if mark_pending:
        target.status = _PENDING

    for r in pr_rows:
        apply_pr_meta(r, pr, repo_id=repo_id)
        r.pr_state = state
        if r is not target and r.status == _NOT_REVIEWED:
            session.delete(r)
            rows.remove(r)

    return target


async def upsert_pull_request_row(
    session: Any,
    installation_id: int,
    repo_full_name: str,
    pr: dict,
    *,
    pr_state: str | None = None,
    mark_pending: bool = False,
    repo_id: int | None = None,
) -> Review:
    """Upsert the dashboard row for a single PR from a webhook payload.

    Updates metadata on every row for this PR, moves a stale
    ``not_reviewed`` row onto the latest head sha, and never touches
    completed review results.
    """
    result = await session.execute(
        select(Review).where(
            Review.installation_id == installation_id,
            Review.repo_full_name == repo_full_name,
            Review.pr_number == pr["number"],
        )
    )
    rows = list(result.scalars().all())
    return _upsert_row(
        rows,
        session,
        installation_id,
        repo_full_name,
        pr,
        state=pr_state or pr_state_of(pr),
        mark_pending=mark_pending,
        repo_id=repo_id,
    )


async def mark_review_pending(
    installation_id: int,
    repo_full_name: str,
    pr_number: int,
    commit_sha: str,
) -> None:
    """Mark an existing row as 'pending' (review in progress) if present."""
    key = f"{pr_number}#{commit_sha}"
    async with async_session_factory() as session:
        result = await session.execute(
            select(Review).where(
                Review.repo_full_name == repo_full_name,
                Review.pr_number_commit_sha == key,
            )
        )
        row = result.scalar_one_or_none()
        if row is not None:
            row.status = _PENDING
            row.error_message = None
            await session.commit()


async def mark_review_running(
    repo_full_name: str,
    pr_number: int,
    commit_sha: str,
) -> None:
    """Transition a queued ('pending') row to 'running' when a worker claims
    its job — lets the UI distinguish queued from actively reviewing."""
    key = f"{pr_number}#{commit_sha}"
    try:
        async with async_session_factory() as session:
            await session.execute(
                update(Review)
                .where(
                    Review.repo_full_name == repo_full_name,
                    Review.pr_number_commit_sha == key,
                    Review.status == _PENDING,
                )
                .values(status="running")
            )
            await session.commit()
    except Exception as e:
        logger.warning(
            "mark_running_failed", repo=repo_full_name, pr=pr_number, error=str(e)
        )


async def enqueue_pr_sync(
    installation_id: int, repo_full_names: list[str] | None = None
) -> bool:
    """Enqueue a background PR-sync job for an installation.

    Returns False when an equivalent sync job is already queued/running so
    repeated triggers don't pile up duplicate jobs.
    """
    async with async_session_factory() as session:
        result = await session.execute(
            select(ReviewJob).where(
                ReviewJob.installation_id == installation_id,
                ReviewJob.status.in_(["queued", "processing"]),
            )
        )
        sync_jobs = [
            j
            for j in result.scalars().all()
            if (j.payload or {}).get("job_type") == JOB_TYPE_SYNC_PRS
        ]

        requested = set(repo_full_names) if repo_full_names else None
        covered: set[str] = set()
        full_queued = False
        for j in sync_jobs:
            repos = (j.payload or {}).get("repos") or []
            if not repos:
                full_queued = True
            else:
                covered.update(repos)

        if full_queued:
            return False
        if requested is not None and requested and requested <= covered:
            return False

        session.add(
            ReviewJob(
                installation_id=installation_id,
                repo_full_name="",
                pr_number=0,
                commit_sha="",
                payload={
                    "job_type": JOB_TYPE_SYNC_PRS,
                    "installation_id": installation_id,
                    "repos": repo_full_names or [],
                },
                status="queued",
            )
        )
        await session.commit()
    return True


async def ensure_installation_rows(
    installation_id: int, repo_full_names: list[str]
) -> int:
    """Insert Installation rows for repos not yet tracked. Returns added count."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(Installation.repo_full_name).where(
                Installation.installation_id == installation_id
            )
        )
        existing = {row[0] for row in result.fetchall()}
        added = 0
        for name in repo_full_names:
            if name not in existing:
                session.add(
                    Installation(
                        installation_id=installation_id,
                        repo_full_name=name,
                        config={},
                    )
                )
                added += 1
        await session.commit()
        return added


async def _lookup_pr_state(
    gc: GitHubClient, owner: str, repo: str, pr_number: int
) -> str:
    """Fetch current state of a single PR — closed vs merged."""
    try:
        pr = await gc.get_pr(owner, repo, pr_number)
        return pr_state_of(pr)
    except Exception as e:
        logger.warning(
            "pr_state_lookup_failed", repo=f"{owner}/{repo}", pr=pr_number, error=str(e)
        )
        return "closed"


async def sync_installation_pull_requests(
    installation_id: int, repo_full_names: list[str] | None = None
) -> dict[str, Any]:
    """Synchronize existing open PRs for an installation.

    When ``repo_full_names`` is None, the accessible repos are discovered via
    the installation token (also reconciles missing Installation rows).

    Raises RuntimeError when any repo failed so the queue retries the job;
    successful upserts are idempotent.
    """
    auth = get_github_auth()
    gc = GitHubClient(auth, installation_id)

    if repo_full_names is None:
        repos = await gc.list_accessible_repositories()
        repo_full_names = [r["full_name"] for r in repos]
        added = await ensure_installation_rows(installation_id, repo_full_names)
        if added:
            logger.info(
                "installation_rows_added", installation_id=installation_id, added=added
            )

    synced: list[str] = []
    errors: list[dict[str, str]] = []
    pr_count = 0

    for full_name in repo_full_names:
        owner, _, repo = full_name.partition("/")
        if not owner or not repo:
            continue
        try:
            prs = await gc.list_open_pull_requests(owner, repo)
            await _upsert_repo_prs(gc, installation_id, full_name, prs)
            synced.append(full_name)
            pr_count += len(prs)
        except Exception as e:
            logger.warning("pr_sync_repo_failed", repo=full_name, error=str(e))
            errors.append({"repo": full_name, "error": str(e)[:200]})

    logger.info(
        "pr_sync_finished",
        installation_id=installation_id,
        repos=len(synced),
        prs=pr_count,
        errors=len(errors),
    )
    if errors:
        raise RuntimeError(
            f"PR sync failed for {len(errors)}/{len(repo_full_names)} repos — "
            f"{errors[0]['repo']}: {errors[0]['error']}"
        )
    return {
        "synced_repos": synced,
        "open_prs": pr_count,
        "errors": errors,
    }


async def _upsert_repo_prs(
    gc: GitHubClient,
    installation_id: int,
    repo_full_name: str,
    prs: list[dict],
) -> None:
    """Upsert all open PRs for one repo; mark PRs no longer open as closed/merged."""
    owner, _, repo = repo_full_name.partition("/")

    async with async_session_factory() as session:
        result = await session.execute(
            select(Review).where(
                Review.installation_id == installation_id,
                Review.repo_full_name == repo_full_name,
            )
        )
        rows = list(result.scalars().all())

        open_numbers = set()
        for pr in prs:
            open_numbers.add(pr["number"])
            _upsert_row(
                rows,
                session,
                installation_id,
                repo_full_name,
                pr,
                state="open",
                mark_pending=False,
            )

        # PRs we still track as open but that are no longer in GitHub's open
        # list were closed/merged while a webhook was missed.
        stale_numbers = {
            r.pr_number
            for r in rows
            if r.pr_state == "open" and r.pr_number not in open_numbers
        }
        for pr_number in stale_numbers:
            state = await _lookup_pr_state(gc, owner, repo, pr_number)
            for r in rows:
                if r.pr_number == pr_number:
                    r.pr_state = state

        await session.commit()
