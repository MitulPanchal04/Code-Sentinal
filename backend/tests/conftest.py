"""Test helpers — in-memory fake of the async SQLAlchemy session layer.

The fake understands the simple ``select(...).where(col == v / col.in_(...))``
and ``delete(...).where(...)`` statements used by the sync/webhook code, so
tests can exercise real ORM code paths without a database.
"""

from __future__ import annotations

from typing import Any

import pytest
from sqlalchemy.sql import operators
from sqlalchemy.sql.dml import Delete
from sqlalchemy.sql.elements import BinaryExpression, BooleanClauseList

from codesentinel.database.models import (
    Installation,
    RepositorySettings,
    Review,
    ReviewJob,
)


class Store:
    """Shared in-memory row storage, like a tiny database."""

    def __init__(self) -> None:
        self.reviews: list[Review] = []
        self.installations: list[Installation] = []
        self.jobs: list[ReviewJob] = []
        self.repo_settings: list[RepositorySettings] = []

    def store_for_entity(self, entity: Any) -> list:
        return {
            Review: self.reviews,
            Installation: self.installations,
            ReviewJob: self.jobs,
            RepositorySettings: self.repo_settings,
        }[entity]

    def store_for_table(self, table_name: str) -> list:
        return {
            "reviews": self.reviews,
            "installations": self.installations,
            "review_jobs": self.jobs,
            "repository_settings": self.repo_settings,
        }[table_name]



def _where_criteria(stmt: Any) -> list:
    wc = getattr(stmt, "whereclause", None)
    if wc is not None:
        criteria = wc
    else:
        criteria = getattr(stmt, "_where_criteria", ())
    if isinstance(criteria, BooleanClauseList):
        return list(criteria.clauses)
    if criteria is None:
        return []
    if isinstance(criteria, (list, tuple)):
        return list(criteria)
    return [criteria]


def _filters(stmt: Any) -> list[tuple[str | None, Any, Any]]:
    """Extract (column_name, operator, literal) triples from a WHERE clause."""
    out = []
    for expr in _where_criteria(stmt):
        if not isinstance(expr, BinaryExpression):
            continue
        name = getattr(expr.left, "key", None) or getattr(expr.left, "name", None)
        value = getattr(expr.right, "value", None)
        if name is None:
            continue
        out.append((name, expr.operator, value))
    return out


def _matches(obj: Any, filters: list[tuple[str | None, Any, Any]]) -> bool:
    for name, op, value in filters:
        attr = getattr(obj, name, None)
        if op is operators.eq or op == operators.eq:
            if attr != value:
                return False
        elif op is operators.ne or op == operators.ne:
            if attr == value:
                return False
        elif op is operators.in_op or op == operators.in_op:
            if attr not in (value or []):
                return False
    return True


class FakeResult:
    def __init__(self, rows: list) -> None:
        self._rows = list(rows)

    def scalars(self) -> FakeResult:
        return FakeResult([r[0] if isinstance(r, tuple) else r for r in self._rows])

    def all(self) -> list:
        return list(self._rows)

    def scalar_one_or_none(self):
        rows = [r[0] if isinstance(r, tuple) else r for r in self._rows]
        return rows[0] if rows else None

    def scalar(self):
        return self.scalar_one_or_none()

    def fetchall(self) -> list:
        return list(self._rows)


class FakeSession:
    """Async-session stand-in backed by a shared Store."""

    def __init__(self, store: Store) -> None:
        self.store = store

    async def __aenter__(self) -> FakeSession:
        return self

    async def __aexit__(self, *args) -> bool:
        return False

    def add(self, obj: Any) -> None:
        self.store.store_for_entity(type(obj)).append(obj)

    def delete(self, obj: Any) -> None:
        store = self.store.store_for_entity(type(obj))
        if obj in store:
            store.remove(obj)

    async def commit(self) -> None:
        pass

    async def flush(self) -> None:
        pass

    async def rollback(self) -> None:
        pass

    async def execute(self, stmt: Any) -> FakeResult:
        if isinstance(stmt, Delete):
            store = self.store.store_for_table(stmt.table.name)
            filters = _filters(stmt)
            for obj in [o for o in store if _matches(o, filters)]:
                store.remove(obj)
            return FakeResult([])

        descs = stmt.column_descriptions
        entity = descs[0].get("entity")
        if entity is None:
            return FakeResult([])
        store = self.store.store_for_entity(entity)
        matched = [o for o in store if _matches(o, _filters(stmt))]

        # Single-column select (e.g. select(Installation.repo_full_name))
        if len(descs) == 1 and descs[0].get("name") not in (entity.__name__, None):
            col = descs[0]["name"]
            return FakeResult([(getattr(o, col),) for o in matched])
        return FakeResult(matched)


@pytest.fixture
def store() -> Store:
    return Store()


@pytest.fixture
def fake_session_factory(store: Store, monkeypatch):
    """Patch every module-level async_session_factory to use the fake store."""
    import codesentinel.database.session as session_module
    import codesentinel.github.sync as sync_module
    import codesentinel.github.webhook as webhook_module
    import codesentinel.queue.processor as processor_module

    def factory() -> FakeSession:
        return FakeSession(store)

    for mod in (
        session_module,
        sync_module,
        webhook_module,
        processor_module,
    ):
        monkeypatch.setattr(mod, "async_session_factory", factory)
    return factory


def make_pr(
    number: int,
    sha: str = "deadbeef" + "0" * 32,
    title: str = "Test PR",
    state: str = "open",
    merged_at: str | None = None,
    user: str = "octocat",
    pr_id: int | None = None,
    repo_id: int = 555,
    draft: bool = False,
) -> dict:
    """Build a GitHub pull_request object as returned by the REST API."""
    return {
        "id": pr_id or number * 10,
        "number": number,
        "title": title,
        "state": state,
        "draft": draft,
        "merged_at": merged_at,
        "html_url": f"https://github.com/acme/widgets/pull/{number}",
        "created_at": "2026-01-01T10:00:00Z",
        "updated_at": "2026-01-02T10:00:00Z",
        "user": {"login": user, "id": 42},
        "head": {"ref": "feature-x", "sha": sha},
        "base": {"ref": "main", "repo": {"id": repo_id}},
        "body": "",
    }


def make_repo(full_name: str = "acme/widgets", repo_id: int = 555) -> dict:
    owner, name = full_name.split("/")
    return {
        "id": repo_id,
        "name": name,
        "full_name": full_name,
        "owner": {"login": owner},
    }


def make_review(
    installation_id: int = 7,
    repo_full_name: str = "acme/widgets",
    pr_number: int = 1,
    commit_sha: str = "abc123",
    status: str = "complete",
    **kwargs,
) -> Review:
    r = Review(
        installation_id=installation_id,
        repo_full_name=repo_full_name,
        pr_number=pr_number,
        pr_number_commit_sha=f"{pr_number}#{commit_sha}",
        commit_sha=commit_sha,
        status=status,
    )
    for k, v in kwargs.items():
        setattr(r, k, v)
    return r
