-- 프로필 이미지 URL 컬럼을 VARCHAR(500)에서 TEXT로 변경
-- base64 인코딩된 WebP 이미지 저장을 위해 필요

-- PostgreSQL
ALTER TABLE users ALTER COLUMN profile_image_url TYPE TEXT;

-- 변경 사항 확인
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'profile_image_url';

