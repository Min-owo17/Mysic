import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { achievementsApi } from '../services/api/achievements';
import { AchievementResponse, UserAchievementResponse } from '../types';
import { commonStyles } from '../styles/commonStyles';
import toast from 'react-hot-toast';

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const AchievementView: React.FC = () => {
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
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <TrophyIcon />
            칭호 시스템
          </h1>
          <p className="text-gray-400">
            총 {allAchievements?.total || 0}개의 칭호 중 {myAchievements?.total || 0}개를 획득했습니다.
          </p>
        </div>

        {/* 획득 현황 */}
        {myAchievements && myAchievements.total > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">획득한 칭호</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAchievements.user_achievements.map((userAchievement) => (
                <div
                  key={userAchievement.user_achievement_id}
                  className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-2 border-yellow-500 rounded-lg p-4 hover:scale-105 transition-transform"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-400 text-2xl">🏆</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-yellow-300 mb-1">
                        {userAchievement.achievement.title}
                      </h3>
                      <p className="text-sm text-gray-300 mb-2">
                        {userAchievement.achievement.description || getConditionText(userAchievement.achievement)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(userAchievement.earned_at).toLocaleDateString('ko-KR')} 획득
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 전체 칭호 목록 */}
        <div className="space-y-6">
          {/* 연습 시간 칭호 */}
          {groupedAchievements.practice_time && groupedAchievements.practice_time.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">연습 시간 칭호</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedAchievements.practice_time.map((achievement) => {
                  const isEarned = earnedAchievementIds.has(achievement.achievement_id);
                  return (
                    <div
                      key={achievement.achievement_id}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        isEarned
                          ? 'bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500'
                          : 'bg-gray-800/50 border-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>
                          {isEarned ? '🏆' : '🔒'}
                        </div>
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

          {/* 연속 일수 칭호 */}
          {groupedAchievements.consecutive_days && groupedAchievements.consecutive_days.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">연속 연습 칭호</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedAchievements.consecutive_days.map((achievement) => {
                  const isEarned = earnedAchievementIds.has(achievement.achievement_id);
                  return (
                    <div
                      key={achievement.achievement_id}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        isEarned
                          ? 'bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500'
                          : 'bg-gray-800/50 border-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>
                          {isEarned ? '🏆' : '🔒'}
                        </div>
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

          {/* 악기 종류 칭호 */}
          {groupedAchievements.instrument_count && groupedAchievements.instrument_count.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">악기 종류 칭호</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedAchievements.instrument_count.map((achievement) => {
                  const isEarned = earnedAchievementIds.has(achievement.achievement_id);
                  return (
                    <div
                      key={achievement.achievement_id}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        isEarned
                          ? 'bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500'
                          : 'bg-gray-800/50 border-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>
                          {isEarned ? '🏆' : '🔒'}
                        </div>
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



