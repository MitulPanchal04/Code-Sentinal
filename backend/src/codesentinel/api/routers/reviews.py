"""Reviews API router — dashboard data endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from structlog import get_logger

from codesentinel.api.deps import get_github_user_id
from codesentinel.database.models import Review, Installation, ReviewJob
from codesentinel.database.session import get_db
from codesentinel.github.auth import get_github_auth
from codesentinel.github.client import GitHubClient

logger = get_logger()

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


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
    """Manually re-run/retry a review, scoped to the authenticated user."""
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

    # Reset review state to pending and clear old error
    review.status = "pending"
    review.error_message = None

    # Optionally create/queue a check run on GitHub
    check_run_id = None
    try:
        owner, repo_name = review.repo_full_name.split("/")
        auth = get_github_auth()
        gc = GitHubClient(auth, review.installation_id)
        new_check = await gc.create_check_run(
            owner,
            repo_name,
            {
                "name": "CodeSentinel Review",
                "head_sha": review.commit_sha,
                "status": "queued",
                "output": {
                    "title": "Review queued (manual retry)",
                    "summary": f"CodeSentinel manual re-review for PR #{review.pr_number} has been queued.",
                },
            },
        )
        check_run_id = new_check.get("id")
    except Exception as e:
        logger.warning(
            "retry_check_run_create_failed",
            error=str(e),
            review_id=review.id,
            repo=review.repo_full_name,
        )

    job_payload = {
        "installation_id": review.installation_id,
        "repo_full_name": review.repo_full_name,
        "pr_number": review.pr_number,
        "commit_sha": review.commit_sha,
        "pr_title": review.pr_title or "",
        "pr_url": review.pr_url or "",
        "pr_head_ref": review.head_branch or "",
        "pr_base_ref": review.base_branch or "",
        "review_mode": "review",
        "author": review.author or "",
        "check_run_id": check_run_id,
    }

    job = ReviewJob(
        installation_id=review.installation_id,
        repo_full_name=review.repo_full_name,
        pr_number=review.pr_number,
        commit_sha=review.commit_sha,
        payload=job_payload,
        status="queued",
    )
    db.add(job)
    await db.commit()

    logger.info(
        "review_retry_enqueued",
        review_id=review.id,
        repo=review.repo_full_name,
        pr=review.pr_number,
        sha=review.commit_sha[:8] if review.commit_sha else "",
    )

    return {
        "status": "enqueued",
        "message": f"Review #{review.id} re-queued successfully",
        "review": _serialize_review(review),
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
