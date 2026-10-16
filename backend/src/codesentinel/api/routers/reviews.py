"""Reviews API router — dashboard data endpoints."""

from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from codesentinel.api.deps import get_github_user_id
from codesentinel.database.models import Installation, Review, ReviewJob
from codesentinel.database.session import get_db
from codesentinel.github.auth import get_github_auth
from codesentinel.github.client import GitHubClient
from codesentinel.github.sync import JOB_TYPE_SYNC_PRS, pr_state_of
from codesentinel.github.webhook import request_pr_review

logger = get_logger()

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

# Review rows that already have an AI review queued or in-flight.
_IN_FLIGHT_REVIEW_STATUSES = ("pending", "running")


@router.get("")
async def list_reviews(
    repo: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    github_user_id: int | None = Depends(get_github_user_id),
) -> dict[str, Any]:
    """List reviews with optional filters, scoped to the authenticated user."""
    if github_user_id is None:
        return {"reviews": [], "total": 0, "limit": limit, "offset": offset}

    # Subquery for the user's installation IDs — avoids row multiplication
    # when one installation has multiple repos (which caused N duplicate rows).
    user_install_ids = (
        select(Installation.installation_id)
        .where(Installation.github_user_id == github_user_id)
        .distinct()
        .scalar_subquery()
    )

    base_filter = [Review.installation_id.in_(user_install_ids)]
    if repo:
        base_filter.append(Review.repo_full_name == repo)
    if status:
        base_filter.append(Review.status == status)

    query = (
        select(Review)
        .where(*base_filter)
        .order_by(desc(Review.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    reviews = result.scalars().all()

    count_query = select(func.count(Review.id)).where(*base_filter)
    total = (await db.execute(count_query)).scalar() or 0

    return {
        "reviews": [_serialize_review(r) for r in reviews],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{review_id}")
async def get_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    github_user_id: int | None = Depends(get_github_user_id),
) -> dict[str, Any]:
    """Get a single review by ID, scoped to the authenticated user."""
    if github_user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    result = await db.execute(
        select(Review)
        .join(Installation, Review.installation_id == Installation.installation_id)
        .where(
            Review.id == review_id,
            Installation.github_user_id == github_user_id,
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return _serialize_review(review)


@router.get("/by-key/{repo_full_name}/{pr_number}/{commit_sha}")
async def get_review_by_key(
    repo_full_name: str,
    pr_number: int,
    commit_sha: str,
    db: AsyncSession = Depends(get_db),
    github_user_id: int | None = Depends(get_github_user_id),
) -> dict[str, Any]:
    """Get review by repo + PR + commit SHA, scoped to the authenticated user."""
    if github_user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    pr_number_commit_sha = f"{pr_number}#{commit_sha}"
    result = await db.execute(
        select(Review)
        .join(Installation, Review.installation_id == Installation.installation_id)
        .where(
            Review.repo_full_name == repo_full_name,
            Review.pr_number_commit_sha == pr_number_commit_sha,
            Installation.github_user_id == github_user_id,
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return _serialize_review(review)


@router.post("/{review_id}/retry")
async def retry_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    github_user_id: int | None = Depends(get_github_user_id),
) -> dict[str, Any]:
    """Manually request (or re-run) an AI review for a single pull request.

    Validates ownership and repo access, rejects duplicate/in-flight reviews,
    refreshes the PR state and head SHA from GitHub, then enqueues a
    ReviewJob for the background worker — the review itself runs via the
    existing pipeline. Reviews only start on explicit user action.
    """
    if github_user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Lock the row so concurrent clicks can't double-enqueue.
    result = await db.execute(
        select(Review).where(Review.id == review_id).with_for_update()
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Pull request not found")

    # The repo must belong to an installation owned by this user.
    inst = await db.execute(
        select(Installation.id)
        .where(
            Installation.installation_id == review.installation_id,
            Installation.repo_full_name == review.repo_full_name,
            Installation.github_user_id == github_user_id,
        )
        .limit(1)
    )
    if not inst.scalar():
        raise HTTPException(status_code=404, detail="Pull request not found")

    if review.status in _IN_FLIGHT_REVIEW_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="A review is already in progress for this PR",
        )
    if review.pr_state in ("closed", "merged"):
        raise HTTPException(
            status_code=409, detail=f"Pull request is {review.pr_state}"
        )

    # Reject if a review job for this PR is already queued/running
    # (sync jobs don't count — they never perform reviews).
    jobs = await db.execute(
        select(ReviewJob).where(
            ReviewJob.installation_id == review.installation_id,
            ReviewJob.repo_full_name == review.repo_full_name,
            ReviewJob.pr_number == review.pr_number,
            ReviewJob.status.in_(["queued", "processing"]),
        )
    )
    if any(
        (j.payload or {}).get("job_type") != JOB_TYPE_SYNC_PRS
        for j in jobs.scalars().all()
    ):
        raise HTTPException(
            status_code=409, detail="A review is already queued for this PR"
        )

    # Fetch the current PR from GitHub — validates it still exists and is
    # open, and picks up the latest head SHA.
    owner, _, repo_name = review.repo_full_name.partition("/")
    gc = GitHubClient(get_github_auth(), review.installation_id)
    try:
        pr = await gc.get_pr(owner, repo_name, review.pr_number)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="Pull request no longer exists on GitHub",
            ) from e
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API error: {e.response.status_code}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502, detail="Could not reach the GitHub API"
        ) from e

    state = pr_state_of(pr)
    if state != "open":
        review.pr_state = state
        await db.commit()
        raise HTTPException(
            status_code=409, detail=f"Pull request is {state}"
        )

    job, review_row = await request_pr_review(
        db,
        review.installation_id,
        review.repo_full_name,
        pr,
        repo_id=review.repo_id,
    )
    await db.commit()

    logger.info(
        "review_manually_enqueued",
        review_id=review.id,
        repo=review.repo_full_name,
        pr=review.pr_number,
        job_id=job.id,
    )

    return {
        "status": "enqueued",
        "message": (
            f"Review for {review.repo_full_name}#{review.pr_number} queued"
        ),
        "job_id": job.id,
        "review": _serialize_review(review_row),
    }


def _serialize_review(r: Review) -> dict[str, Any]:
    return {
        "id": r.id,
        "installation_id": r.installation_id,
        "repo_full_name": r.repo_full_name,
        "pr_number": r.pr_number,
        "commit_sha": r.commit_sha,
        "status": r.status,
        "pr_state": r.pr_state,
        "pr_title": r.pr_title,
        "pr_url": r.pr_url,
        "author": r.author,
        "head_branch": r.head_branch,
        "base_branch": r.base_branch,
        "github_pr_id": r.github_pr_id,
        "repo_id": r.repo_id,
        "pr_created_at": r.pr_created_at.isoformat() if r.pr_created_at else None,
        "pr_updated_at": r.pr_updated_at.isoformat() if r.pr_updated_at else None,
        "findings": r.findings,
        "summary": r.summary,
        "diagram": r.diagram,
        "merge_score": r.merge_score,
        "merge_score_reason": r.merge_score_reason,
        "input_tokens": r.input_tokens,
        "output_tokens": r.output_tokens,
        "estimated_cost_usd": r.estimated_cost_usd,
        "enabled_agent_count": r.enabled_agent_count,
        "review_mode": r.review_mode,
        "error_message": r.error_message,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
