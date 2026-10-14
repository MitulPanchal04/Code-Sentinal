"""Add pull request metadata columns to reviews table.

Supports the initial PR sync feature: open PRs that exist before the
GitHub App is installed are stored as review rows with
status='not_reviewed' plus the PR metadata needed by the dashboard.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-14 00:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("pr_state", sa.String(20), nullable=True))
    op.add_column("reviews", sa.Column("pr_title", sa.Text(), nullable=True))
    op.add_column("reviews", sa.Column("pr_url", sa.String(500), nullable=True))
    op.add_column("reviews", sa.Column("author", sa.String(255), nullable=True))
    op.add_column("reviews", sa.Column("head_branch", sa.String(255), nullable=True))
    op.add_column("reviews", sa.Column("base_branch", sa.String(255), nullable=True))
    op.add_column("reviews", sa.Column("github_pr_id", sa.BigInteger(), nullable=True))
    op.add_column("reviews", sa.Column("repo_id", sa.BigInteger(), nullable=True))
    op.add_column("reviews", sa.Column("pr_created_at", sa.DateTime(), nullable=True))
    op.add_column("reviews", sa.Column("pr_updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("reviews", "pr_updated_at")
    op.drop_column("reviews", "pr_created_at")
    op.drop_column("reviews", "repo_id")
    op.drop_column("reviews", "github_pr_id")
    op.drop_column("reviews", "base_branch")
    op.drop_column("reviews", "head_branch")
    op.drop_column("reviews", "author")
    op.drop_column("reviews", "pr_url")
    op.drop_column("reviews", "pr_title")
    op.drop_column("reviews", "pr_state")
