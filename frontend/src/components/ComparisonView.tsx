

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { formatTime, getLocalDateString } from '../utils/time';
import { PerformanceRecord, PracticeSession, UserDetailResponse } from '../types';
import { practiceApi } from '../services/api/practice';
import { usersApi } from '../services/api/users';
import { commonStyles } from '../styles/commonStyles';



interface ComparisonChartData {
    day: string;
    date: number;
    userDuration: number;
    averageDuration: number;
}

interface ComparisonViewProps {
    onBack: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ onBack }) => {
    const { records } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());

    // 실제 프로필 데이터 가져오기
    const { data: profileData } = useQuery<UserDetailResponse>({
        queryKey: ['userProfile'],
        queryFn: () => usersApi.getMyProfile(),
        staleTime: 2 * 60 * 1000,
        cacheTime: 5 * 60 * 1000,
    });

    const currentWeekStart = useMemo(() => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - date.getDay()); // Start from Sunday
        date.setHours(0, 0, 0, 0);
        return date;
    }, [currentDate]);

    const currentWeekEnd = useMemo(() => {
        const end = new Date(currentWeekStart);
        end.setDate(end.getDate() + 6);
        return end;
    }, [currentWeekStart]);

    // PracticeSession을 PerformanceRecord로 변환하는 함수
    const convertSessionToRecord = (session: PracticeSession): PerformanceRecord => {
        return {
            id: `session-${session.session_id}`,
            date: session.practice_date,
            title: session.instrument || '연습 세션',
            instrument: session.instrument || '알 수 없음',
            duration: session.actual_play_time,
            notes: session.notes || '',
            summary: undefined,
        };
    };

    // 현재 주간의 Practice 세션 데이터 가져오기
    const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
        queryKey: ['practice', 'sessions', 'comparison', getLocalDateString(currentWeekStart), getLocalDateString(currentWeekEnd)],
        queryFn: () => practiceApi.getSessions({
            start_date: getLocalDateString(currentWeekStart),
            end_date: getLocalDateString(currentWeekEnd),
            page: 1,
            page_size: 100,
        }),
        enabled: true,
        staleTime: 2 * 60 * 1000,
        cacheTime: 5 * 60 * 1000,
    });

    // PracticeSession을 PerformanceRecord로 변환
    const practiceRecords = useMemo(() => {
        if (!sessionsData?.sessions) return [];
        return sessionsData.sessions
            .filter(session => session.status === 'completed')
            .map(convertSessionToRecord);
    }, [sessionsData]);

    // 기존 records와 practiceRecords 병합
    const allRecords = useMemo(() => {
        return [...records, ...practiceRecords];
    }, [records, practiceRecords]);

    const recordsByDate = useMemo(() => {
        const map = new Map<string, PerformanceRecord[]>();
        allRecords.forEach(record => {
            const localDate = new Date(record.date);
            const dateStr = getLocalDateString(localDate);
            if (!map.has(dateStr)) {
                map.set(dateStr, []);
            }
            map.get(dateStr)?.push(record);
        });
        return map;
    }, [allRecords]);

    // 사용자가 악기와 특징을 모두 지정했는지 확인
    const hasInstrumentAndFeatures = useMemo(() => {
        if (!profileData?.profile) return false;
        
        // 주요 악기 확인 (is_primary가 true인 악기)
        const hasPrimaryInstrument = profileData.profile.instruments.some(inst => inst.is_primary);
        
        // 특징 확인
        const hasUserTypes = profileData.profile.user_types && profileData.profile.user_types.length > 0;
        
        return hasPrimaryInstrument && hasUserTypes;
    }, [profileData]);

    const userWeeklyData = useMemo(() => {
        const weekData = [];
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        for (let i = 0; i < 7; i++) {
            const day = new Date(currentWeekStart);
            day.setDate(day.getDate() + i);
            const dateStr = getLocalDateString(day);
            const dayRecords = recordsByDate.get(dateStr) || [];
            const totalDuration = dayRecords.reduce((sum, rec) => sum + rec.duration, 0);
            weekData.push({
                day: days[i],
                date: day.getDate(),
                fullDate: day,
                totalDuration,
            });
        }
        return weekData;
    }, [currentWeekStart, recordsByDate]);

    // 같은 악기와 특징을 가진 사용자들의 평균 연습 시간 가져오기
    const { data: averageData, isLoading: isLoadingAverage } = useQuery({
        queryKey: ['practice', 'average-weekly', getLocalDateString(currentWeekStart), getLocalDateString(currentWeekEnd)],
        queryFn: () => practiceApi.getAverageWeeklyPractice({
            start_date: getLocalDateString(currentWeekStart),
            end_date: getLocalDateString(currentWeekEnd),
        }),
        enabled: hasInstrumentAndFeatures,
        staleTime: 5 * 60 * 1000, // 5분
        cacheTime: 10 * 60 * 1000, // 10분
    });

    // 연습 통계 데이터 가져오기
    const { data: statisticsData, isLoading: isLoadingStatistics } = useQuery({
        queryKey: ['practice', 'statistics'],
        queryFn: () => practiceApi.getStatistics(),
        staleTime: 2 * 60 * 1000, // 2분
        cacheTime: 5 * 60 * 1000, // 5분
    });

    // 시간 포맷팅 함수 (초를 시간으로 변환)
    const formatHours = (seconds: number): number => {
        return Math.floor(seconds / 3600);
    };

    // 시간 포맷팅 함수 (초를 분으로 변환)
    const formatMinutes = (seconds: number): number => {
        return Math.floor(seconds / 60);
    };

    // 날짜 포맷팅 함수 (YYYY-MM-DD를 "0000년 0월 0일" 형식으로)
    const formatDateKorean = (dateString?: string): string => {
        if (!dateString) return '없음';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}년 ${month}월 ${day}일`;
    };

    const comparisonChartData: ComparisonChartData[] = useMemo(() => {
        const averageDurations = averageData?.daily_averages || [0, 0, 0, 0, 0, 0, 0];
        return userWeeklyData.map((data, index) => ({
            day: data.day,
            date: data.date,
            userDuration: data.totalDuration,
            averageDuration: averageDurations[index] || 0,
        }));
    }, [userWeeklyData, averageData]);

    const maxDuration = useMemo(() => {
        const maxUser = Math.max(...comparisonChartData.map(d => d.userDuration));
        const maxAvg = Math.max(...comparisonChartData.map(d => d.averageDuration));
        const max = Math.max(maxUser, maxAvg, 1); // Ensure it's at least 1 to avoid division by zero
        return max;
    }, [comparisonChartData]);

    const weekRangeString = useMemo(() => {
        const endOfWeek = new Date(currentWeekStart);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${currentWeekStart.toLocaleDateString('ko-KR', formatOptions)} - ${endOfWeek.toLocaleDateString('ko-KR', formatOptions)}`;
    }, [currentWeekStart]);

    const changeWeek = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + (7 * amount));
            return newDate;
        });
    };
    
    const isNextWeekDisabled = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfThisWeek = new Date(today);
        startOfThisWeek.setDate(today.getDate() - today.getDay());
        return currentWeekStart >= startOfThisWeek;
    }, [currentWeekStart]);

    const userFeaturesString = useMemo(() => {
        if (!profileData?.profile) return '';
        
        const primaryInstrument = profileData.profile.instruments.find(inst => inst.is_primary);
        const instrumentName = primaryInstrument?.instrument_name || '';
        const userTypeNames = profileData.profile.user_types.map(ut => ut.user_type_name);
        
        return [instrumentName, ...userTypeNames].filter(Boolean).join(', ');
    }, [profileData]);

    // 악기와 특징이 모두 없을 경우 메시지 표시
    if (!hasInstrumentAndFeatures) {
        return (
            <div className={`${commonStyles.pageContainer} animate-fade-in`}>
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-300">연습 통계</h1>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                        지정된 악기와 특징이 없습니다. 프로필 메뉴에서 지정해 주세요.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${commonStyles.pageContainer} animate-fade-in`}>
             <div className="flex items-center mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-300">연습 통계</h1>
            </div>

            {isLoadingSessions && (
                <div className="text-center py-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
                    연습 기록을 불러오는 중...
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeWeek(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&lt;</button>
                <h2 className="text-xl font-semibold">{weekRangeString}</h2>
                <button 
                    onClick={() => changeWeek(1)} 
                    disabled={isNextWeekDisabled}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                    &gt;
                </button>
            </div>

            <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start lg:mt-8">
                {/* Chart Section - Left on LG */}
                <div className="lg:col-span-3">
                    <div className="flex justify-center gap-6 mb-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-purple-500"></div>
                            <span className="text-gray-600 dark:text-gray-300">나의 연습</span>
                        </div>
                         <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-teal-500"></div>
                            <span className="text-gray-600 dark:text-gray-300">평균 연습</span>
                        </div>
                    </div>

                    <div className="h-64 md:h-80 flex justify-around items-end gap-2 px-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg pt-4 pb-2">
                        {comparisonChartData.map((data, index) => {
                            const userBarHeight = (data.userDuration / maxDuration) * 100;
                            const avgBarHeight = (data.averageDuration / maxDuration) * 100;

                            return (
                                <div key={index} className="flex flex-col items-center h-full w-full justify-end group">
                                    <div className="relative w-full flex-1 flex items-end justify-center">
                                        {/* Tooltip */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-900 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                                                <span>{formatTime(data.userDuration)}</span>
                                            </div>
                                             <div className="flex items-center gap-1.5 mt-1">
                                                <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
                                                <span>{formatTime(data.averageDuration)}</span>
                                            </div>
                                        </div>

                                        {/* Bars container */}
                                        <div className="relative w-full h-full flex items-end justify-center gap-1">
                                            {/* 나의 연습 막대 */}
                                            <div
                                                className="w-1/2 max-w-[12px] md:max-w-[16px] rounded-t-sm bg-purple-500 transition-all duration-300"
                                                style={{ height: `${userBarHeight}%` }}
                                            ></div>
                                            {/* 평균 연습 막대 */}
                                            <div
                                                className="w-1/2 max-w-[12px] md:max-w-[16px] rounded-t-sm bg-teal-500 transition-all duration-300"
                                                style={{ height: `${avgBarHeight}%` }}
                                            ></div>
                                            
                                            {/* 하단 수치 라벨 (마우스 호버와 동일한 형식) */}
                                            {(data.userDuration > 0 || data.averageDuration > 0) && (
                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full bg-gray-800 dark:bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-100 pointer-events-none z-10 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                                                        <span>{formatTime(data.userDuration)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
                                                        <span>{formatTime(data.averageDuration)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                                        <p>{data.day}</p>
                                        <p>{data.date}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Info Section - Right on LG */}
                <div className="lg:col-span-2 mt-6 lg:mt-0">
                    <div className="space-y-6">
                        <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-purple-600 dark:text-purple-300 break-words">'{userFeaturesString}'</span>
                                <br/>
                                특징을 가진 사용자 평균과 나의 연습 시간을 비교합니다.
                            </p>
                        </div>
                    
                        <div className="bg-gray-100 dark:bg-gray-800/50 p-4 md:p-6 rounded-lg text-center animate-fade-in">
                            {isLoadingAverage ? (
                                <p className="text-gray-500 dark:text-gray-400">평균 데이터를 불러오는 중...</p>
                            ) : averageData && averageData.total_users > 0 ? (
                                <>
                                    <p className="text-gray-700 dark:text-gray-300 text-lg md:text-xl">
                                        유사한 연주자 중 <span className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-300">{averageData.consistency_percentage}%</span>가
                                        <br/>
                                        이번 주에 매일 연습했어요!
                                    </p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                                        비교 대상: {averageData.total_users}명
                                    </p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">꾸준함이 최고의 연주를 만듭니다.</p>
                                </>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400">
                                    같은 악기와 특징을 가진 다른 사용자가 없습니다.
                                </p>
                            )}
                        </div>

                        {/* 연습 통계 섹션 */}
                        {isLoadingStatistics ? (
                            <div className="bg-gray-100 dark:bg-gray-800/50 p-4 md:p-6 rounded-lg text-center animate-fade-in">
                                <p className="text-gray-500 dark:text-gray-400">통계 데이터를 불러오는 중...</p>
                            </div>
                        ) : statisticsData ? (
                            <>
                                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 md:p-6 rounded-lg text-center animate-fade-in">
                                    <p className="text-gray-700 dark:text-gray-300">
                                        지금까지 연습한 총 시간은
                                        <br/>
                                        <span className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-300">{formatHours(statisticsData.total_practice_time)}시간</span>
                                    </p>
                                </div>

                                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 md:p-6 rounded-lg text-center animate-fade-in">
                                    <p className="text-gray-700 dark:text-gray-300">
                                        지금까지 연습한 횟수는
                                        <br/>
                                        <span className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-300">{statisticsData.total_sessions}회</span>
                                    </p>
                                </div>

                                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 md:p-6 rounded-lg text-center animate-fade-in">
                                    <p className="text-gray-700 dark:text-gray-300">
                                        지금까지의 연속 연습 일수는 <span className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-300">{statisticsData.consecutive_days}일</span>
                                        <br/>
                                        마지막 연습일은 <span className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-300">{formatDateKorean(statisticsData.last_practice_date)}</span>
                                    </p>
                                </div>

                                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 md:p-6 rounded-lg text-center animate-fade-in">
                                    <p className="text-gray-700 dark:text-gray-300">
                                        평균 연습 시간은 <span className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-300">{statisticsData.average_session_time ? formatMinutes(statisticsData.average_session_time) : 0}분</span>
                                    </p>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ComparisonView;