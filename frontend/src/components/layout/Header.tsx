import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../services/api/users';
import { useAuthStore } from '../../store/slices/authSlice';

export const Header = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [imageError, setImageError] = useState(false);

  const { data: userDetail } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => usersApi.getMyProfile(),
    enabled: isAuthenticated,
  });

  // 사용자 정보가 변경되면 이미지 에러 상태 리셋
  useEffect(() => {
    if (userDetail?.profile_image_url) {
      setImageError(false);
    }
  }, [userDetail?.profile_image_url]);

  const primaryInstrument = userDetail?.profile?.instruments?.find(
    (inst) => inst.is_primary
  );
  const userTypes = userDetail?.profile?.user_types || [];

  // 프로필 이미지가 있고 로드 에러가 없을 때만 이미지 표시
  const showProfileImage = userDetail?.profile_image_url && !imageError;

  return (
    <header className="relative bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            {isAuthenticated && userDetail ? (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                {/* 프로필 사진 */}
                <div className="relative">
                  {showProfileImage ? (
                    <img
                      src={userDetail.profile_image_url!}
                      alt={userDetail.nickname}
                      className="w-10 h-10 rounded-full object-cover border-2 border-purple-500 dark:border-purple-400"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-purple-500 dark:border-purple-400 bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 font-semibold text-sm">
                      {userDetail.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {userDetail.selected_achievement?.icon_url && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                      <img
                        src={userDetail.selected_achievement.icon_url}
                        alt={userDetail.selected_achievement.title}
                        className="w-4 h-4"
                      />
                    </div>
                  )}
                </div>

                {/* 사용자 정보 */}
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {userDetail.nickname}
                    </span>
                    {userDetail.selected_achievement && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {userDetail.selected_achievement.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                    {primaryInstrument && (
                      <span className="flex items-center space-x-1">
                        <span className="text-purple-500">🎵</span>
                        <span>{primaryInstrument.instrument_name}</span>
                      </span>
                    )}
                    {userTypes.length > 0 && (
                      <span className="flex items-center space-x-1">
                        <span className="text-gray-400">•</span>
                        <span>{userTypes.map(ut => ut.user_type_name).join(', ')}</span>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ) : (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mysic</h1>
            )}
          </div>
          <nav className="flex items-center space-x-4">
            {user?.is_admin && (
              <button
                onClick={() => navigate(location.pathname.startsWith('/admin') ? '/record' : '/admin')}
                className={`p-2 rounded-full transition-colors ${location.pathname.startsWith('/admin')
                  ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-gray-800'
                  : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-gray-800'
                  }`}
                title={location.pathname.startsWith('/admin') ? '일반 대시보드' : '관리자 대시보드'}
              >
                <AdminIcon filled={location.pathname.startsWith('/admin')} />
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

// Admin Shield Icon
const AdminIcon = ({ filled }: { filled?: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill={filled ? "currentColor" : "none"}
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

