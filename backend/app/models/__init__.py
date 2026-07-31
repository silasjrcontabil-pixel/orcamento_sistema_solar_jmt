"""Importa todos os modelos para que Base.metadata os conheça (Alembic autogenerate, create_all)."""
from app.models.budget import Budget  # noqa: F401
from app.models.budget_edit_history import BudgetEditHistory  # noqa: F401
from app.models.budget_item import BudgetItem  # noqa: F401
from app.models.budget_solar_config import BudgetSolarConfig  # noqa: F401
from app.models.budget_status_history import BudgetStatusHistory  # noqa: F401
from app.models.client import Client  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.user import User  # noqa: F401

__all__ = [
    "User",
    "Client",
    "Product",
    "Budget",
    "BudgetSolarConfig",
    "BudgetItem",
    "BudgetStatusHistory",
    "BudgetEditHistory",
]
