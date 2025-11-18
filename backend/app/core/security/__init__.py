# Security package
# 상위 디렉토리의 security.py 모듈 내용을 직접 포함
# 순환 참조를 피하기 위해 importlib 사용
import importlib.util
import os

# 상위 디렉토리의 security.py 파일 경로
_parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_security_file = os.path.join(_parent_dir, 'security.py')

# security.py 모듈을 동적으로 로드
if os.path.exists(_security_file):
    spec = importlib.util.spec_from_file_location("app.core.security_module", _security_file)
    _security_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(_security_module)
    
    # 모든 공개 함수와 변수를 현재 네임스페이스로 가져오기
    get_password_hash = _security_module.get_password_hash
    verify_password = _security_module.verify_password
    create_access_token = _security_module.create_access_token
    decode_access_token = _security_module.decode_access_token
    pwd_context = _security_module.pwd_context
else:
    # security.py 파일이 없는 경우를 대비한 fallback
    raise ImportError("security.py file not found")

__all__ = [
    'get_password_hash',
    'verify_password',
    'create_access_token',
    'decode_access_token',
    'pwd_context',
]
