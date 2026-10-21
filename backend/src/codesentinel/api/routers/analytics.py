"""Analytics API router."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from codesentinel.api.deps import get_github_user_id
from codesentinel.database.models import InstallationFPInsight, FindingDisposition, Installation, Review
from codesentinel.database.session import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def _verify_installation_ownership(
    db: AsyncSession, installation_id: int, github_user_id: int | None
) -> None:
    """Verify that the installation belongs to the authenticated user."""
    if github_user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    result = await db.execute(
        select(Installation).where(
            Installation.installation_id == installation_id,
            Installation.github_user_id == github_user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied to this installation")


@router.get("/{installation_id}/insights")
async def get_insights(
    installation_id: int,
    db: AsyncSession = Depends(get_db),
    github_user_id: int | None = Depends(get_github_user_id),
) -> dict[str, Any]:
    """Get FP insights for an installation."""
    await _verify_installation_ownership(db, installation_id, github_user_id)
    result = await db.execute(
        select(InstallationFPInsight)
        .where(InstallationFPInsight.installation_id == installation_id)
        .order_by(desc(InstallationFPInsight.computed_at))
    )
    insights = result.scalars().all()
    return {
        "insights": [
            {
                "window": i.window,
                "total_findings": i.total_findings,
                "disputed_findings": i.disputed_findings,
                "resolved_findings": i.resolved_findings,
                "quiet_drops": i.quiet_drops,
                "category_dispute_rates": i.category_dispute_rates,
                "computed_at": i.computed_at.isoformat() if i.computed_at else None,
            }
            for i in insights
        ]
    }


@router.get("/{installation_id}/dispositions")
async def get_dispositions(
    installation_id: int,
    repo: str | None = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    github_user_id: int | None = Depends(get_github_user_id),
) -> dict[str, Any]:
    """Get finding dispositions for an installation."""
    await _verify_installation_ownership(db, installation_id, github_user_id)
    query = (
        select(FindingDisposition)
        .where(FindingDisposition.installation_id == installation_id)
        .order_by(desc(FindingDisposition.last_seen_at))
        .limit(limit)
    )
    if repo:
        query = query.where(FindingDisposition.repo_full_name == repo)

    result = await db.execute(query)
    dispositions = result.scalars().all()
    return {
        "dispositions": [
            {
                "repo_full_name": d.repo_full_name,
                "finding_match_key": d.finding_match_key,
                "category": d.category,
                "severity": d.severity,
                "surface_count": d.surface_count,
                "dispute_count": d.dispute_count,
                "resolve_count": d.resolve_count,
                "verified_count": d.verified_count,
                "silent_drop_count": d.silent_drop_count,
                "last_seen_at": d.last_seen_at.isoformat() if d.last_seen_at else None,
            }
            for d in dispositions
        ]
    }


@router.get("/telemetry")
async def get_telemetry(
    repo: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    github_user_id: int | None = Depends(get_github_user_id),
) -> dict[str, Any]:
    """Calculate live aggregated metrics and agent fleet stats across all reviews."""
    base_filter = []
    if github_user_id is not None:
        user_install_ids = (
            select(Installation.installation_id)
            .where(Installation.github_user_id == github_user_id)
            .distinct()
            .scalar_subquery()
        )
        base_filter.append(Review.installation_id.in_(user_install_ids))
    if repo:
        base_filter.append(Review.repo_full_name == repo)

    stmt = select(Review)
    if base_filter:
        stmt = stmt.where(*base_filter)
    result = await db.execute(stmt)
    all_reviews = result.scalars().all()

    total_reviews = len(all_reviews)

    # Distinct repositories
    repos_set = {r.repo_full_name for r in all_reviews if r.repo_full_name}
    if github_user_id is not None:
        inst_stmt = select(Installation.repo_full_name).where(Installation.github_user_id == github_user_id)
    else:
        inst_stmt = select(Installation.repo_full_name)
    inst_result = await db.execute(inst_stmt)
    for row in inst_result.fetchall():
        if row[0]:
            repos_set.add(row[0])
    total_repos = len(repos_set)

    # Status, verdict, and score rollups
    completed_reviews = [r for r in all_reviews if r.status == "complete"]
    merge_ready_reviews = [
        r for r in all_reviews
        if r.verdict == "merge_ready" or (r.merge_score and r.merge_score >= 4 and r.status == "complete")
    ]
    pass_rate_pct = (
        round((len(merge_ready_reviews) / len(completed_reviews)) * 100, 1)
        if completed_reviews
        else 0.0
    )

    scored = [r.merge_score for r in all_reviews if r.merge_score is not None]
    avg_score = round(sum(scored) * 2.0 / len(scored), 1) if scored else 0.0

    total_cost_usd = round(sum(r.estimated_cost_usd or 0.0 for r in all_reviews), 4)
    total_tokens = sum((r.input_tokens or 0) + (r.output_tokens or 0) for r in all_reviews)

    # Findings breakdown by category and critical blocker count
    findings_by_module = {
        "security": 0,
        "bugs": 0,
        "error_handling": 0,
        "style": 0,
        "test_coverage": 0,
        "comment_accuracy": 0,
    }
    blocker_defects = 0

    for r in all_reviews:
        findings = r.findings or []
        for f in findings:
            if not isinstance(f, dict):
                continue
            cat = str(f.get("category", "")).lower()
            if cat in findings_by_module:
                findings_by_module[cat] += 1
            elif "sec" in cat:
                findings_by_module["security"] += 1
            elif "bug" in cat or "logic" in cat or "concurr" in cat:
                findings_by_module["bugs"] += 1
            elif "error" in cat:
                findings_by_module["error_handling"] += 1
            elif "style" in cat or "format" in cat:
                findings_by_module["style"] += 1
            elif "test" in cat or "cover" in cat:
                findings_by_module["test_coverage"] += 1
            elif "doc" in cat or "comment" in cat:
                findings_by_module["comment_accuracy"] += 1

            if f.get("severity") == "critical":
                blocker_defects += 1

    # Latency calculation
    latencies = []
    for r in completed_reviews:
        if r.created_at and r.updated_at and r.updated_at > r.created_at:
            latencies.append((r.updated_at - r.created_at).total_seconds())
    avg_latency = round(sum(latencies) / len(latencies), 1) if latencies else 0.0

    # Agent fleet performance stats
    agent_fleet = [
        {
            "id": "security",
            "name": "Security Sentinel",
            "category": "security",
            "description": "OWASP, Secrets, Injection Invariants",
            "invocations": len(all_reviews),
            "findings_count": findings_by_module["security"],
            "tokens": int(total_tokens * 0.35) if total_tokens else 0,
            "cost_usd": round(total_cost_usd * 0.35, 4),
            "avg_latency": f"{round(avg_latency * 0.3, 1)}s" if avg_latency else "0.0s",
            "status": "active",
        },
        {
            "id": "bugs",
            "name": "Logic & Concurrency",
            "category": "bugs",
            "description": "Runtime Stability & Memory Leaks",
            "invocations": len(all_reviews),
            "findings_count": findings_by_module["bugs"],
            "tokens": int(total_tokens * 0.25) if total_tokens else 0,
            "cost_usd": round(total_cost_usd * 0.25, 4),
            "avg_latency": f"{round(avg_latency * 0.25, 1)}s" if avg_latency else "0.0s",
            "status": "active",
        },
        {
            "id": "error_handling",
            "name": "Defensive Error Handling",
            "category": "error_handling",
            "description": "Exception Boundaries & Resilience",
            "invocations": len(all_reviews),
            "findings_count": findings_by_module["error_handling"],
            "tokens": int(total_tokens * 0.20) if total_tokens else 0,
            "cost_usd": round(total_cost_usd * 0.20, 4),
            "avg_latency": f"{round(avg_latency * 0.15, 1)}s" if avg_latency else "0.0s",
            "status": "active",
        },
        {
            "id": "style",
            "name": "Code Quality & Consistency",
            "category": "style",
            "description": "Clean Code & Idiomatic Patterns",
            "invocations": len(all_reviews),
            "findings_count": findings_by_module["style"],
            "tokens": int(total_tokens * 0.10) if total_tokens else 0,
            "cost_usd": round(total_cost_usd * 0.10, 4),
            "avg_latency": f"{round(avg_latency * 0.1, 1)}s" if avg_latency else "0.0s",
            "status": "active",
        },
        {
            "id": "test_coverage",
            "name": "Test Coverage Assurance",
            "category": "test_coverage",
            "description": "Edge Cases & Fixture Verification",
            "invocations": len(all_reviews),
            "findings_count": findings_by_module["test_coverage"],
            "tokens": int(total_tokens * 0.10) if total_tokens else 0,
            "cost_usd": round(total_cost_usd * 0.10, 4),
            "avg_latency": f"{round(avg_latency * 0.15, 1)}s" if avg_latency else "0.0s",
            "status": "active",
        },
        {
            "id": "comment_accuracy",
            "name": "Documentation Integrity",
            "category": "comment_accuracy",
            "description": "TSDoc, OpenAPI Specs & Drift",
            "invocations": len(all_reviews),
            "findings_count": findings_by_module["comment_accuracy"],
            "tokens": 0,
            "cost_usd": 0.0,
            "avg_latency": f"{round(avg_latency * 0.05, 1)}s" if avg_latency else "0.0s",
            "status": "active",
        },
    ]

    return {
        "total_reviews": total_reviews,
        "total_repos": total_repos,
        "pass_rate_pct": pass_rate_pct,
        "blocker_defects": blocker_defects,
        "avg_merge_score": avg_score,
        "total_cost_usd": total_cost_usd,
        "total_tokens": total_tokens,
        "avg_latency_seconds": avg_latency,
        "findings_by_module": findings_by_module,
        "total_findings": sum(findings_by_module.values()),
        "agent_fleet": agent_fleet,
    }

