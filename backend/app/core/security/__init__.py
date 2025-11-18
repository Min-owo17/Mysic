# Security package
# 상위 디렉토리의 security.py 모듈 내용을 직접 포함
# 순환 참조를 피하기 위해 importlib 사용 (개선된 방식)
import sys
import os
import importlib

# 상위 디렉토리 경로를 sys.path에 추가
_parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

# security.py 모듈을 다른 이름으로 로드하여 순환 참조 방지
try:
    # 이미 로드된 경우 제거 (새로고침을 위해)
    _security_module_name = 'app.core.security_module_internal'
    if _security_module_name in sys.modules:
        del sys.modules[_security_module_name]
    
    # 상위 디렉토리의 security.py 파일 경로
    _security_file = os.path.join(_parent_dir, 'security.py')
    
    if os.path.exists(_security_file):
        # importlib.util을 사용하여 파일에서 직접 로드
        import importlib.util
        spec = importlib.util.spec_from_file_location(_security_module_name, _security_file)
        _security_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_security_module)
        
        # 모든 공개 함수와 변수를 현재 네임스페이스로 가져오기
        get_password_hash = _security_module.get_password_hash
        verify_password = _security_module.verify_password
        create_access_token = _security_module.create_access_token
        decode_access_token = _security_module.decode_access_token
        pwd_context = _security_module.pwd_context
    else:
        raise ImportError(f"security.py file not found at {_security_file}")
except Exception as e:
    # fallback: 직접 import 시도
    try:
        from app.core import security as _security_module
        get_password_hash = _security_module.get_password_hash
        verify_password = _security_module.verify_password
        create_access_token = _security_module.create_access_token
        decode_access_token = _security_module.decode_access_token
        pwd_context = _security_module.pwd_context
    except ImportError:
        raise ImportError(f"Failed to import security module: {e}")

__all__ = [
    'get_password_hash',
    'verify_password',
    'create_access_token',
    'decode_access_token',
    'pwd_context',
]
