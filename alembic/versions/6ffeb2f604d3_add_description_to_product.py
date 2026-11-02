"""add description to product

Revision ID: 6ffeb2f604d3
Revises: b36dd21d1c9b
Create Date: 2026-05-05 16:24:04.476370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6ffeb2f604d3'
down_revision: Union[str, Sequence[str], None] = 'b36dd21d1c9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('products', sa.Column('description', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'description')


