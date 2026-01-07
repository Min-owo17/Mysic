"""Create notifications table

Revision ID: e7396f1b4bf1
Revises: 2c3e5a43c5bc
Create Date: 2026-01-07 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e7396f1b4bf1'
down_revision = '2c3e5a43c5bc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('notifications',
    sa.Column('notification_id', sa.Integer(), nullable=False),
    sa.Column('receiver_id', sa.Integer(), nullable=False),
    sa.Column('sender_id', sa.Integer(), nullable=True),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('post_id', sa.Integer(), nullable=True),
    sa.Column('comment_id', sa.Integer(), nullable=True),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('is_read', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['comment_id'], ['comments.comment_id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['post_id'], ['posts.post_id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['receiver_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['sender_id'], ['users.user_id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('notification_id')
    )
    op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)
    op.create_index(op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False)
    op.create_index(op.f('ix_notifications_notification_id'), 'notifications', ['notification_id'], unique=False)
    op.create_index(op.f('ix_notifications_receiver_id'), 'notifications', ['receiver_id'], unique=False)
    op.create_index(op.f('ix_notifications_sender_id'), 'notifications', ['sender_id'], unique=False)
    op.create_index(op.f('ix_notifications_type'), 'notifications', ['type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_type'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_sender_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_receiver_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_notification_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_is_read'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_created_at'), table_name='notifications')
    op.drop_table('notifications')
