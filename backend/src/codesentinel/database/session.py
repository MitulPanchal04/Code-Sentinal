"""Async database session management."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from codesentinel.config.settings import get_settings

_settings = get_settings()

# Normalize Railway/Heroku-style postgres:// or postgresql:// URLs
# to use asyncpg driver for async SQLAlchemy
_db_url = _settings.database_url
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    _db_url,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> bool:
    """Create all tables and enable required extensions.

    Returns True if successful, False if database is not available.
    For production, use Alembic migrations instead:
        alembic init alembic
        alembic revision --autogenerate -m "initial"
        alembic upgrade head
    """
    from codesentinel.database.models import Base
    from sqlalchemy import text
    from structlog import get_logger

    logger = get_logger()

    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(
                text(
                    "ALTER TABLE installations "
                    "ADD COLUMN IF NOT EXISTS github_user_id BIGINT"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE installations "
                    "ADD COLUMN IF NOT EXISTS github_user_login VARCHAR(255)"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_installations_github_user_id "
                    "ON installations (github_user_id)"
                )
            )
            # PR metadata columns (mirrors alembic revision 0002)
            for column, ddl in [
                ("pr_state", "VARCHAR(20)"),
                ("pr_title", "TEXT"),
                ("pr_url", "VARCHAR(500)"),
                ("author", "VARCHAR(255)"),
                ("head_branch", "VARCHAR(255)"),
                ("base_branch", "VARCHAR(255)"),
                ("github_pr_id", "BIGINT"),
                ("repo_id", "BIGINT"),
                ("pr_created_at", "TIMESTAMP"),
                ("pr_updated_at", "TIMESTAMP"),
            ]:
                await conn.execute(
                    text(
                        f"ALTER TABLE reviews "
                        f"ADD COLUMN IF NOT EXISTS {column} {ddl}"
                    )
                )

            # Repository settings table (mirrors alembic revision 0003)
            await conn.execute(
                text("""
                    CREATE TABLE IF NOT EXISTS repository_settings (
                        id SERIAL PRIMARY KEY,
                        installation_id BIGINT NOT NULL,
                        repo_full_name VARCHAR(255) NOT NULL,
                        profile VARCHAR(20) NOT NULL DEFAULT 'standard',
                        rulebook TEXT NOT NULL DEFAULT '',
                        enabled_agents JSONB NOT NULL DEFAULT '["security", "bugs", "error_handling", "style", "test_coverage", "comment_accuracy"]'::jsonb,
                        min_severity VARCHAR(20) NOT NULL DEFAULT 'info',
                        min_confidence INTEGER NOT NULL DEFAULT 75,
                        max_findings INTEGER NOT NULL DEFAULT 25,
                        ignore_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
                        critical_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
                        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                        CONSTRAINT uq_repo_settings UNIQUE (installation_id, repo_full_name)
                    )
                """)
            )
            await conn.execute(
                text("""
                    CREATE INDEX IF NOT EXISTS ix_repo_settings_install_repo
                    ON repository_settings (installation_id, repo_full_name)
                """)
            )
        logger.info("database_initialized")
        return True

    except Exception as e:
        logger.warning("database_unavailable", error=str(e))
        return False
