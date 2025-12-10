import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../services/api/users';
import { useAuthStore } from '../../store/slices/authSlice';

export const Header = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
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
    <header className="fixed top-0 left-0 right-0 md:left-64 z-50 bg-gray-50 dark:bg-gray-900 shadow-sm">
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
          <nav className="flex space-x-4">
            {/* Navigation items will be added here */}
          </nav>
        </div>
      </div>
    </header>
  );
};

