

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatTime, getLocalDateString } from '../utils/time';
import { PerformanceRecord } from '../types';
import { commonStyles } from '../styles/commonStyles';

// Mock data for average user with same features. In a real app, this would be fetched.
const MOCK_AVERAGE_PRACTICE_DATA = [
    2700, // 일
    2100, // 월
    2400, // 화
    2800, // 수
    2500, // 목
    4200, // 금
    4800, // 토
];

// Mock data for consistency percentage.
const MOCK_CONSISTENCY_PERCENTAGE = 23;


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
    const { userProfile, records } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());

    const currentWeekStart = useMemo(() => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - date.getDay()); // Start from Sunday
        date.setHours(0, 0, 0, 0);
        return date;
    }, [currentDate]);

    const recordsByDate = useMemo(() => {
        const map = new Map<string, PerformanceRecord[]>();
        records.forEach(record => {
            const localDate = new Date(record.date);
            const dateStr = getLocalDateString(localDate);
            if (!map.has(dateStr)) {
                map.set(dateStr, []);
            }
            map.get(dateStr)?.push(record);
        });
        return map;
    }, [records]);

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

    const comparisonChartData: ComparisonChartData[] = useMemo(() => {
        const dayOffset = currentWeekStart.getDay();
        return userWeeklyData.map((data, index) => ({
            day: data.day,
            date: data.date,
            userDuration: data.totalDuration,
            averageDuration: MOCK_AVERAGE_PRACTICE_DATA[(index + dayOffset) % 7],
        }));
    }, [userWeeklyData, currentWeekStart]);

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

    const userFeaturesString = [userProfile.instrument, ...userProfile.features].filter(Boolean).join(', ');

    return (
        <div className={`${commonStyles.pageContainer} animate-fade-in`}>
             <div className="flex items-center mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-300">주간 연습 비교</h1>
            </div>

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
                                    <div className="relative w-full flex-1 flex items-end justify-center gap-1">
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

                                        {/* Bars */}
                                        <div
                                            className="w-1/2 max-w-[12px] md:max-w-[16px] rounded-t-sm bg-purple-500 transition-all duration-300"
                                            style={{ height: `${userBarHeight}%` }}
                                        ></div>
                                        <div
                                            className="w-1/2 max-w-[12px] md:max-w-[16px] rounded-t-sm bg-teal-500 transition-all duration-300"
                                            style={{ height: `${avgBarHeight}%` }}
                                        ></div>
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
                            <p className="text-gray-700 dark:text-gray-300 text-lg md:text-xl">
                                유사한 연주자 중 <span className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-300">{MOCK_CONSISTENCY_PERCENTAGE}%</span>가
                                <br/>
                                이번 주에 매일 연습했어요!
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">꾸준함이 최고의 연주를 만듭니다.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ComparisonView;