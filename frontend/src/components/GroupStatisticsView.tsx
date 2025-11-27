import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../services/api/groups';
import { formatTime } from '../utils/time';
import { defaultAvatar } from '../utils/avatar';
import { commonStyles } from '../styles/commonStyles';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface GroupStatisticsViewProps {
  groupId: number;
  onBack: () => void;
}

const GroupStatisticsView: React.FC<GroupStatisticsViewProps> = ({ groupId, onBack }) => {
  // 그룹 전체 통계 조회
  const { data: groupStatistics, isLoading: isLoadingStatistics } = useQuery({
    queryKey: ['groups', groupId, 'statistics'],
    queryFn: () => groupsApi.getGroupStatistics(groupId),
    staleTime: 2 * 60 * 1000, // 2분
  });

  // 그룹 멤버별 통계 조회
  const { data: memberStatistics, isLoading: isLoadingMemberStatistics } = useQuery({
    queryKey: ['groups', groupId, 'members', 'statistics'],
    queryFn: () => groupsApi.getGroupMemberStatistics(groupId),
    staleTime: 2 * 60 * 1000, // 2분
  });

  // 이번 주 데이터 계산 (월~일) - 백엔드에서 이미 월~일 순서로 반환됨
  const thisWeekData = React.useMemo(() => {
    if (!groupStatistics) return [];
    
    const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
    
    return groupStatistics.weekly_practice_data.map((time, index) => ({
      name: dayNames[index],
      시간: time,
      초: time
    }));
  }, [groupStatistics]);

  if (isLoadingStatistics || isLoadingMemberStatistics) {
    return (
      <div className="p-4 md:p-6 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
        <div className="flex justify-center items-center py-20">
          <div className={`${commonStyles.spinner} w-12 h-12`}></div>
        </div>
      </div>
    );
  }

  if (!groupStatistics) {
    return (
      <div className="p-4 md:p-6 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
        <div className="text-center py-10 text-red-500">
          <p>통계 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack} 
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors mr-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className={commonStyles.mainTitle}>그룹 통계</h1>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={commonStyles.card}>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">총 연습 시간</p>
          <p className="text-2xl font-bold text-purple-300">{formatTime(groupStatistics.total_practice_time)}</p>
        </div>
        <div className={commonStyles.card}>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">총 연습 횟수</p>
          <p className="text-2xl font-bold text-purple-300">{groupStatistics.total_sessions.toLocaleString()}회</p>
        </div>
        <div className={commonStyles.card}>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">멤버당 평균 연습 시간</p>
          <p className="text-2xl font-bold text-purple-300">{formatTime(Math.round(groupStatistics.average_practice_time_per_member))}</p>
        </div>
        <div className={commonStyles.card}>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">멤버당 평균 연습 횟수</p>
          <p className="text-2xl font-bold text-purple-300">{groupStatistics.average_sessions_per_member.toFixed(1)}회</p>
        </div>
      </div>

      {/* 이번 주 연습 시간 차트 */}
      <div className={commonStyles.card + ' mb-6'}>
        <h3 className="text-lg font-semibold text-purple-300 mb-4">이번 주 연습 시간</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={thisWeekData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis 
              stroke="#9CA3AF"
              tickFormatter={(value) => `${Math.round(value / 60)}`}
              hide
            />
            <Tooltip 
              formatter={(value: number) => [formatTime(value), '연습 시간']}
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
            />
            <Bar dataKey="시간" fill="#9333EA" radius={[8, 8, 0, 0]}>
              {thisWeekData.map((entry, index) => (
                <Cell key={`cell-${index}`} />
              ))}
              <LabelList 
                dataKey="시간" 
                position="top" 
                formatter={(value: number) => formatTime(value)}
                style={{ fill: '#9CA3AF', fontSize: '12px', fontWeight: '500' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 가장 활발한 멤버 */}
      {groupStatistics.most_active_member && (
        <div className={commonStyles.card + ' mb-6'}>
          <h3 className="text-lg font-semibold text-purple-300 mb-3">가장 활발한 멤버</h3>
          <div className="flex items-center gap-3">
            <img 
              src={groupStatistics.most_active_member.profile_image_url || defaultAvatar(groupStatistics.most_active_member.nickname)} 
              alt={groupStatistics.most_active_member.nickname} 
              className="w-12 h-12 rounded-full object-cover bg-gray-700" 
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-200">{groupStatistics.most_active_member.nickname}</p>
              <div className="flex gap-4 mt-1 text-sm text-gray-400">
                <span>총 {formatTime(groupStatistics.most_active_member.total_practice_time)}</span>
                <span>{groupStatistics.most_active_member.total_sessions}회</span>
                <span>{groupStatistics.most_active_member.consecutive_days}일 연속</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 멤버별 통계 목록 */}
      {memberStatistics && memberStatistics.members.length > 0 && (
        <div className={commonStyles.card}>
          <h3 className="text-lg font-semibold text-purple-300 mb-4">멤버별 통계</h3>
          <div className="space-y-4">
            {memberStatistics.members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md">
                <div className="flex items-center gap-3">
                  <img 
                    src={member.profile_image_url || defaultAvatar(member.nickname)} 
                    alt={member.nickname} 
                    className="w-10 h-10 rounded-full object-cover bg-gray-700" 
                  />
                  <div>
                    <p className="font-semibold text-gray-200">{member.nickname}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-400">
                      <span>{member.total_sessions}회</span>
                      {member.consecutive_days > 0 && (
                        <span className="text-purple-300">{member.consecutive_days}일 연속</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-lg font-bold text-purple-300">{formatTime(member.total_practice_time)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupStatisticsView;

