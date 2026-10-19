"""Create repository_settings table for repository-level rulebooks and policies.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-15 19:30:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "repository_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("installation_id", sa.BigInteger(), nullable=False),
        sa.Column("repo_full_name", sa.String(255), nullable=False),
        sa.Column("profile", sa.String(20), server_default="standard", nullable=False),
        sa.Column("rulebook", sa.Text(), server_default="", nullable=False),
        sa.Column(
            "enabled_agents",
            postgresql.JSONB(),
            server_default='["security", "bugs", "error_handling", "style", "test_coverage", "comment_accuracy"]',
            nullable=False,
        ),
        sa.Column("min_severity", sa.String(20), server_default="info", nullable=False),
        sa.Column("min_confidence", sa.Integer(), server_default="75", nullable=False),
        sa.Column("max_findings", sa.Integer(), server_default="25", nullable=False),
        sa.Column("ignore_paths", postgresql.JSONB(), server_default="[]", nullable=False),
        sa.Column("critical_paths", postgresql.JSONB(), server_default="[]", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("installation_id", "repo_full_name", name="uq_repo_settings"),
    )
    op.create_index(
        "ix_repo_settings_install_repo",
        "repository_settings",
        ["installation_id", "repo_full_name"],
    )


def downgrade() -> None:
    op.drop_index("ix_repo_settings_install_repo", table_name="repository_settings")
    op.drop_table("repository_settings")
