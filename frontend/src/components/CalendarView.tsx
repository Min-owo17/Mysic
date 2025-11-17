

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PerformanceRecord } from '../types';
import { formatTime, getLocalDateString } from '../utils/time';
import ComparisonView from './ComparisonView';
import { commonStyles } from '../styles/commonStyles';

type ViewMode = 'monthly' | 'weekly';

const CalendarView: React.FC = () => {
    const { records } = useAppContext();
    const [viewMode, setViewMode] = useState<ViewMode>('weekly');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [selectedRecord, setSelectedRecord] = useState<PerformanceRecord | null>(null);
    const [showComparisonView, setShowComparisonView] = useState(false);

    // --- Memoized calculations for Monthly View ---
    const daysInMonth = useMemo(() => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const days = [];
        while (date.getMonth() === currentDate.getMonth()) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentDate]);
    
    const startDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // --- Common data processing ---
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

    // --- Memoized calculations for Weekly View ---
    const currentWeekStart = useMemo(() => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - date.getDay()); // Start from Sunday
        date.setHours(0, 0, 0, 0);
        return date;
    }, [currentDate]);

    const weeklyChartData = useMemo(() => {
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

    const maxWeeklyDuration = useMemo(() => {
        const max = Math.max(...weeklyChartData.map(d => d.totalDuration));
        return max > 0 ? max : 1; // Avoid division by zero
    }, [weeklyChartData]);
    
    // --- Shared selected day's records ---
    const selectedDayRecords = useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = getLocalDateString(selectedDate);
        return recordsByDate.get(dateStr) || [];
    }, [selectedDate, recordsByDate]);

    // --- Navigation handlers ---
    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const changeWeek = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + (7 * amount));
            return newDate;
        });
    };

    const isSameDay = (d1: Date, d2: Date | null) => 
        d1 && d2 &&
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    const weekRangeString = useMemo(() => {
        const endOfWeek = new Date(currentWeekStart);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${currentWeekStart.toLocaleDateString('ko-KR', formatOptions)} - ${endOfWeek.toLocaleDateString('ko-KR', formatOptions)}`;
    }, [currentWeekStart]);

    if (showComparisonView) {
        return <ComparisonView onBack={() => setShowComparisonView(false)} />;
    }

    return (
        <div className={commonStyles.pageContainer}>
            <div className="relative flex justify-center items-center mb-4 h-8">
                <h1 className="text-xl font-bold text-purple-600 dark:text-purple-300">연습 이력</h1>
                <div className="absolute top-0 right-0">
                    <button 
                        onClick={() => setShowComparisonView(true)}
                        className={commonStyles.iconButton}
                        aria-label="연습 시간 비교"
                    >
                        <ChartBarIcon />
                    </button>
                </div>
            </div>
            
            <div className="mb-4 flex justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button onClick={() => setViewMode('weekly')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${viewMode === 'weekly' ? 'bg-purple-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>주간</button>
                <button onClick={() => setViewMode('monthly')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${viewMode === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>월간</button>
            </div>
            
            {viewMode === 'monthly' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&lt;</button>
                        <h2 className="text-xl font-semibold">{currentDate.toLocaleString('ko-KR', { month: 'long', year: 'numeric' })}</h2>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&gt;</button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: startDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                        {daysInMonth.map(day => {
                            const dateStr = getLocalDateString(day);
                            const hasRecord = recordsByDate.has(dateStr);
                            const isToday = isSameDay(day, new Date());
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            
                            return (
                                <button key={day.toISOString()} onClick={() => setSelectedDate(day)} className={`relative p-2 h-10 w-10 md:h-14 md:w-14 flex items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-purple-600 text-white' : isToday ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                    <span>{day.getDate()}</span>
                                    {hasRecord && <div className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-400'}`}></div>}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {viewMode === 'weekly' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeWeek(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&lt;</button>
                        <h2 className="text-xl font-semibold">{weekRangeString}</h2>
                        <button onClick={() => changeWeek(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&gt;</button>
                    </div>

                    <div className="h-48 md:h-64 flex justify-around items-end gap-2 px-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg pt-4 pb-2">
                        {weeklyChartData.map((data, index) => {
                            const barHeight = (data.totalDuration / maxWeeklyDuration) * 100;
                            const isSelected = isSameDay(data.fullDate, selectedDate);

                            return (
                                <div key={index} className="flex flex-col items-center h-full w-full justify-end group">
                                    <div className="relative w-full flex-1 flex items-end">
                                        <div className="relative w-full h-full flex items-end justify-center">
                                            <div
                                                className={`w-3/4 max-w-[20px] rounded-t-sm transition-all duration-300 ${isSelected ? 'bg-purple-500' : 'bg-purple-300 dark:bg-purple-800 group-hover:bg-purple-400 dark:group-hover:bg-purple-600'}`}
                                                style={{ height: `${barHeight}%` }}
                                            ></div>
                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                                {formatTime(data.totalDuration)}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedDate(data.fullDate)} className={`mt-2 text-xs w-full py-1 rounded-md transition-colors ${isSelected ? 'text-purple-600 dark:text-purple-300 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                        <p>{data.day}</p>
                                        <p>{data.date}</p>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}


            <div className="mt-8 md:mt-4">
                <h3 className={`text-lg font-semibold ${commonStyles.divider} pb-2 mb-4`}>
                    {selectedDate ? `${selectedDate.toLocaleDateString('ko-KR')}` : '날짜를 선택하세요'}
                </h3>
                {selectedDayRecords.length > 0 ? (
                    <div className="space-y-4 md:max-h-56 md:overflow-y-auto md:pr-2 md:-mr-2">
                        {selectedDayRecords.map(record => (
                            <button key={record.id} onClick={() => setSelectedRecord(record)} className={`w-full text-left ${commonStyles.cardHover}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-purple-600 dark:text-purple-300">{record.title}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{record.instrument}</p>
                                    </div>
                                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{formatTime(record.duration)}</span>
                                </div>
                                {record.summary && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic text-left line-clamp-2">"{record.summary}"</p>}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 dark:text-gray-500 text-center py-4">선택한 날짜에 연습 기록이 없습니다.</p>
                )}
            </div>

            {selectedRecord && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainer} p-6 space-y-4`}>
                        <div>
                            <h3 className="text-xl font-bold text-purple-600 dark:text-purple-300">{selectedRecord.title}</h3>
                        </div>
                        
                        <div className={`text-sm text-gray-500 dark:text-gray-400 border-b border-t ${commonStyles.divider} py-3 grid grid-cols-2 gap-2`}>
                           <div>
                                <p className="font-semibold">악기</p>
                                <p className="text-gray-700 dark:text-gray-300">{selectedRecord.instrument}</p>
                           </div>
                           <div>
                                <p className="font-semibold">연습 시간</p>
                                <p className="text-gray-700 dark:text-gray-300 font-mono">{formatTime(selectedRecord.duration)}</p>
                           </div>
                        </div>

                        {selectedRecord.summary && (
                             <div>
                                <p className="font-semibold text-gray-500 dark:text-gray-400">AI 요약</p>
                                <p className="text-gray-700 dark:text-gray-300 mt-1 italic">"{selectedRecord.summary}"</p>
                            </div>
                        )}
                        
                        {selectedRecord.notes && (
                            <div>
                                <p className="font-semibold text-gray-500 dark:text-gray-400">메모</p>
                                <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md max-h-32 overflow-y-auto">{selectedRecord.notes}</p>
                            </div>
                        )}
                        
                        <button
                            onClick={() => setSelectedRecord(null)}
                            className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} mt-2`}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ChartBarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 13v-1m4 1v-3m4 3V8M5.05 16.95A9 9 0 1016.95 5.05 9 9 0 005.05 16.95z" />
    </svg>
);


export default CalendarView;