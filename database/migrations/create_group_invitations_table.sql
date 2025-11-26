-- 그룹 초대 테이블 생성
CREATE TABLE IF NOT EXISTS group_invitations (
    invitation_id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    inviter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    invitee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, invitee_id)
);

CREATE INDEX idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_invitee_id ON group_invitations(invitee_id);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);

