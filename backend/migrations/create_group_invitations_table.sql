-- 그룹 초대 테이블 생성
-- 그룹 멤버 초대 기능을 위한 테이블

CREATE TABLE group_invitations (
    invitation_id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    inviter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    invitee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 같은 그룹에 대한 중복 초대 방지 (pending 상태인 경우만)
    -- 주의: 이 제약조건은 pending 상태인 경우만 적용되므로, 부분 유니크 인덱스를 사용하는 것이 더 적절할 수 있습니다.
    -- 하지만 PostgreSQL에서는 부분 유니크 제약조건을 직접 지원하지 않으므로, 애플리케이션 레벨에서 중복 체크를 수행합니다.
);

-- 인덱스 생성
CREATE INDEX idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_inviter_id ON group_invitations(inviter_id);
CREATE INDEX idx_group_invitations_invitee_id ON group_invitations(invitee_id);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);
CREATE INDEX idx_group_invitations_invitee_status ON group_invitations(invitee_id, status);

-- 부분 유니크 인덱스: pending 상태인 경우만 중복 초대 방지
CREATE UNIQUE INDEX idx_group_invitations_unique_pending 
    ON group_invitations(group_id, invitee_id) 
    WHERE status = 'pending';

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_group_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_update_group_invitations_updated_at
    BEFORE UPDATE ON group_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_group_invitations_updated_at();

-- 주석 추가
COMMENT ON TABLE group_invitations IS '그룹 초대 정보를 저장하는 테이블';
COMMENT ON COLUMN group_invitations.invitation_id IS '초대 ID (Primary Key)';
COMMENT ON COLUMN group_invitations.group_id IS '초대된 그룹 ID';
COMMENT ON COLUMN group_invitations.inviter_id IS '초대를 보낸 사용자 ID';
COMMENT ON COLUMN group_invitations.invitee_id IS '초대를 받은 사용자 ID';
COMMENT ON COLUMN group_invitations.status IS '초대 상태: pending(대기), accepted(수락), declined(거절), expired(만료)';
COMMENT ON COLUMN group_invitations.created_at IS '초대 생성 시각';
COMMENT ON COLUMN group_invitations.updated_at IS '초대 정보 수정 시각';

