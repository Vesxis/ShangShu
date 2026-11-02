"""add column status to table products

Revision ID: 820fa5236f8e
Revises: 0c070ef68db0
Create Date: 2026-04-12 17:40:48.947324

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '820fa5236f8e'
down_revision: Union[str, Sequence[str], None] = '0c070ef68db0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('clients', sa.Column('role', sa.Enum('superadmin', 'moderator', 'client', name='role', create_type=False), nullable=False, server_default='client'))
    op.create_unique_constraint('uq_clients_email', 'clients', ['email'])
    op.add_column('products', sa.Column('status', sa.Enum('pending', 'accept', 'rejected', name='productstatus', create_type=False), nullable=False, server_default='pending'))
    op.alter_column('products', 'price',
               existing_type=sa.Float(),
               nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('products', 'price',
               existing_type=sa.Float(),
               nullable=True)
    op.drop_column('products', 'status')
    op.drop_constraint('uq_clients_email', 'clients', type_='unique')
    op.drop_column('clients', 'role')
