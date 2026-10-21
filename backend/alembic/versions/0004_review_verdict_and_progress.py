"""Add verdict and live progress tracking columns to reviews table.

Supports real-time agent fleet inspection progress ("Inspecting 4/6 agents done")
and deterministic governance verdicts (merge_ready, changes_requested, blocked, in_progress).

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-20 14:40:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "reviews",
        sa.Column("verdict", sa.String(30), nullable=True, server_default="in_progress"),
    )
    op.add_column(
        "reviews",
        sa.Column(
            "progress",
            postgresql.JSONB(),
            nullable=True,
            server_default='{"completed_agents": 0, "total_agents": 6, "current_step": "queued"}',
        ),
    )


def downgrade() -> None:
    op.drop_column("reviews", "progress")
    op.drop_column("reviews", "verdict")
