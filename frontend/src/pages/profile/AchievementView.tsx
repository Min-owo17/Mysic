import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementsApi } from '../../services/api/achievements';
import { usersApi } from '../../services/api/users';
import { AchievementResponse, UserAchievementResponse } from '../../types';
import { commonStyles } from '../../styles/commonStyles';
import toast from 'react-hot-toast';

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const AchievementView: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // 필터 상태
  const [filter, setFilter] = React.useState<'all' | 'earned' | 'unearned'>('all');
  
  // 프로필 조회 (선택한 칭호 확인용)
  const { data: profileData } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => usersApi.getMyProfile(),
  });
  
  const selectedAchievementId = profileData?.selected_achievement_id;
  
  // 전체 칭호 목록 조회
  const { data: allAchievements, isLoading: isLoadingAll } = useQuery({
    queryKey: ['allAchievements'],
    queryFn: () => achievementsApi.getAllAchievements(),
    onError: (error: any) => {
      console.error('칭호 목록 조회 실패:', error);
      toast.error('칭호 목록을 불러오는데 실패했습니다.');
    },
  });

  // 내가 획득한 칭호 목록 조회
  const { data: myAchievements, isLoading: isLoadingMy } = useQuery({
    queryKey: ['myAchievements'],
    queryFn: () => achievementsApi.getMyAchievements(),
    onError: (error: any) => {
      console.error('내 칭호 조회 실패:', error);
      toast.error('내 칭호를 불러오는데 실패했습니다.');
    },
  });

  // 칭호 선택 Mutation
  const selectAchievementMutation = useMutation({
    mutationFn: (achievementId: number | null) => achievementsApi.selectAchievement(achievementId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['myAchievements'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '칭호 선택에 실패했습니다.');
    },
  });
  
  const handleSelectAchievement = (achievementId: number | null) => {
    selectAchievementMutation.mutate(achievementId);
  };
  
  // 획득한 칭호 ID 집합
  const earnedAchievementIds = new Set(
    myAchievements?.user_achievements.map(ua => ua.achievement_id) || []
  );

  // 칭호 타입별 그룹화
  const groupedAchievements = React.useMemo(() => {
    if (!allAchievements) return {};

    const groups: {
      practice_time?: AchievementResponse[];
      consecutive_days?: AchievementResponse[];
      instrument_count?: AchievementResponse[];
    } = {};

    allAchievements.achievements.forEach(achievement => {
      const type = achievement.condition_type;
      if (type) {
        if (!groups[type as keyof typeof groups]) {
          groups[type as keyof typeof groups] = [];
        }
        groups[type as keyof typeof groups]!.push(achievement);
      }
    });

    return groups;
  }, [allAchievements]);

  const getConditionText = (achievement: AchievementResponse): string => {
    if (!achievement.condition_type || achievement.condition_value === null) {
      return achievement.description || '';
    }

    switch (achievement.condition_type) {
      case 'practice_time':
        const hours = achievement.condition_value / 3600;
        if (hours >= 1000) {
          return `${Math.floor(hours / 1000)}천 시간`;
        } else if (hours >= 100) {
          return `${Math.floor(hours / 100)}백 시간`;
        } else if (hours >= 10) {
          return `${Math.floor(hours / 10)}십 시간`;
        } else {
          return `${Math.floor(hours)}시간`;
        }
      case 'consecutive_days':
        return `${achievement.condition_value}일 연속`;
      case 'instrument_count':
        return `${achievement.condition_value}가지 이상 악기`;
      default:
        return achievement.description || '';
    }
  };

  if (isLoadingAll || isLoadingMy) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">칭호 정보를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={() => navigate('/profile')} 
              className="p-2 rounded-full hover:bg-gray-700 mr-2"
              aria-label="뒤로가기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrophyIcon />
              칭호
            </h1>
          </div>
          <p className="text-gray-400">
            총 {allAchievements?.total || 0}개의 칭호 중 {myAchievements?.total || 0}개를 획득했습니다.
          </p>
        </div>

        {/* 대표 칭호 */}
        {selectedAchievementId && myAchievements && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">대표 칭호</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAchievements.user_achievements
                .filter(ua => ua.achievement_id === selectedAchievementId)
                .map((userAchievement) => (
                  <div
                    key={userAchievement.user_achievement_id}
                    className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 border-2 border-purple-500 rounded-lg p-4 relative"
                  >
                    <div className="absolute top-2 right-2">
                      <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">대표</span>
                    </div>
                    <div className="flex items-start gap-3">
                      {userAchievement.achievement.icon_url ? (
                        <img 
                          src={userAchievement.achievement.icon_url} 
                          alt={userAchievement.achievement.title}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="text-purple-400 text-2xl">🏆</div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-purple-300 mb-1">
                          {userAchievement.achievement.title}
                        </h3>
                        <p className="text-sm text-gray-300 mb-2">
                          {userAchievement.achievement.description || getConditionText(userAchievement.achievement)}
                        </p>
                        <button
                          onClick={() => handleSelectAchievement(null)}
                          className="text-xs text-gray-400 hover:text-white underline"
                          disabled={selectAchievementMutation.isPending}
                        >
                          선택 해제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 필터 옵션 */}
        <div className="mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter('earned')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'earned'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              획득한 칭호
            </button>
            <button
              onClick={() => setFilter('unearned')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unearned'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              미획득 칭호
            </button>
          </div>
        </div>

        {/* 전체 칭호 목록 */}
        <div className="space-y-6">
          {/* 연습 시간 */}
          {groupedAchievements.practice_time && groupedAchievements.practice_time.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">연습 시간</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedAchievements.practice_time
                  .filter((achievement) => {
                    const isEarned = earnedAchievementIds.has(achievement.achievement_id);
                    if (filter === 'earned') return isEarned;
                    if (filter === 'unearned') return !isEarned;
                    return true;
                  })
                  .map((achievement) => {
                    const isEarned = earnedAchievementIds.has(achievement.achievement_id);
                    const isSelected = achievement.achievement_id === selectedAchievementId;
                    return (
                      <div
                        key={achievement.achievement_id}
                        className={`border-2 rounded-lg p-4 transition-all relative ${
                          isEarned
                            ? 'bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500'
                            : 'bg-gray-800/50 border-gray-700 opacity-60'
                        }`}
                      >
                        {isEarned && (
                          <button
                            onClick={() => handleSelectAchievement(isSelected ? null : achievement.achievement_id)}
                            className="absolute top-2 right-2 p-1 hover:scale-110 transition-transform"
                            disabled={selectAchievementMutation.isPending}
                            aria-label={isSelected ? '대표 칭호 해제' : '대표 칭호 선택'}
                          >
                            {isSelected ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400 fill-current" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-yellow-400 fill-none stroke-current" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                        )}
                        <div className="flex items-start gap-3">
                          {achievement.icon_url ? (
                            <img 
                              src={achievement.icon_url} 
                              alt={achievement.title}
                              className={`w-8 h-8 object-contain ${isEarned ? '' : 'grayscale opacity-50'}`}
                            />
                          ) : (
                            <div className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>
                              {isEarned ? '🏆' : '🔒'}
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className={`font-bold mb-1 ${isEarned ? 'text-yellow-300' : 'text-gray-400'}`}>
                              {achievement.title}
                            </h3>
                            <p className="text-sm text-gray-300 mb-2">
                              {achievement.description || getConditionText(achievement)}
                            </p>
                            {!isEarned && (
                              <p className="text-xs text-gray-500">
                                조건: {getConditionText(achievement)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 연속 연습 */}
          {groupedAchievements.consecutive_days && groupedAchievements.consecutive_days.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">연속 연습</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedAchievements.consecutive_days
                  .filter((achievement) => {
                    const isEarned = earnedAchievementIds.has(achievement.achievement_id);
                    if (filter === 'earned') return isEarned;
                    if (filter === 'unearned') return !isEarned;
                    return true;
                  })
                  .map((achievement) => {
                    const isEarned = earnedAchievementIds.has(achievement.achievement_id);
                    const isSelected = achievement.achievement_id === selectedAchievementId;
                    return (
                      <div
                        key={achievement.achievement_id}
                        className={`border-2 rounded-lg p-4 transition-all relative ${
                          isEarned
                            ? 'bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500'
                            : 'bg-gray-800/50 border-gray-700 opacity-60'
                        }`}
                      >
                        {isEarned && (
                          <button
                            onClick={() => handleSelectAchievement(isSelected ? null : achievement.achievement_id)}
                            className="absolute top-2 right-2 p-1 hover:scale-110 transition-transform"
                            disabled={selectAchievementMutation.isPending}
                            aria-label={isSelected ? '대표 칭호 해제' : '대표 칭호 선택'}
                          >
                            {isSelected ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400 fill-current" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-yellow-400 fill-none stroke-current" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                        )}
                        <div className="flex items-start gap-3">
                          {achievement.icon_url ? (
                            <img 
                              src={achievement.icon_url} 
                              alt={achievement.title}
                              className={`w-8 h-8 object-contain ${isEarned ? '' : 'grayscale opacity-50'}`}
                            />
                          ) : (
                            <div className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>
                              {isEarned ? '🏆' : '🔒'}
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className={`font-bold mb-1 ${isEarned ? 'text-yellow-300' : 'text-gray-400'}`}>
                              {achievement.title}
                            </h3>
                            <p className="text-sm text-gray-300 mb-2">
                              {achievement.description || getConditionText(achievement)}
                            </p>
                            {!isEarned && (
                              <p className="text-xs text-gray-500">
                                조건: {getConditionText(achievement)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 악기 종류 */}
          {groupedAchievements.instrument_count && groupedAchievements.instrument_count.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">악기 종류</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedAchievements.instrument_count
                  .filter((achievement) => {
                    const isEarned = earnedAchievementIds.has(achievement.achievement_id);
                    if (filter === 'earned') return isEarned;
                    if (filter === 'unearned') return !isEarned;
                    return true;
                  })
                  .map((achievement) => {
                    const isEarned = earnedAchievementIds.has(achievement.achievement_id);
                    const isSelected = achievement.achievement_id === selectedAchievementId;
                    return (
                      <div
                        key={achievement.achievement_id}
                        className={`border-2 rounded-lg p-4 transition-all relative ${
                          isEarned
                            ? 'bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500'
                            : 'bg-gray-800/50 border-gray-700 opacity-60'
                        }`}
                      >
                        {isEarned && (
                          <button
                            onClick={() => handleSelectAchievement(isSelected ? null : achievement.achievement_id)}
                            className="absolute top-2 right-2 p-1 hover:scale-110 transition-transform"
                            disabled={selectAchievementMutation.isPending}
                            aria-label={isSelected ? '대표 칭호 해제' : '대표 칭호 선택'}
                          >
                            {isSelected ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400 fill-current" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-yellow-400 fill-none stroke-current" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                        )}
                        <div className="flex items-start gap-3">
                          {achievement.icon_url ? (
                            <img 
                              src={achievement.icon_url} 
                              alt={achievement.title}
                              className={`w-8 h-8 object-contain ${isEarned ? '' : 'grayscale opacity-50'}`}
                            />
                          ) : (
                            <div className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>
                              {isEarned ? '🏆' : '🔒'}
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className={`font-bold mb-1 ${isEarned ? 'text-yellow-300' : 'text-gray-400'}`}>
                              {achievement.title}
                            </h3>
                            <p className="text-sm text-gray-300 mb-2">
                              {achievement.description || getConditionText(achievement)}
                            </p>
                            {!isEarned && (
                              <p className="text-xs text-gray-500">
                                조건: {getConditionText(achievement)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AchievementView;



