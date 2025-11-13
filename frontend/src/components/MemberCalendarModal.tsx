
import React, { useState, useMemo } from 'react';
import { PerformanceRecord } from '../types';
import { formatTime, getLocalDateString } from '../utils/time';
import { commonStyles } from '../styles/commonStyles';

interface MemberCalendarModalProps {
    memberData: {
        name: string;
        records: PerformanceRecord[];
        profilePicture: string | null;
    };
    onClose: () => void;
}

const MemberCalendarModal: React.FC<MemberCalendarModalProps> = ({ memberData, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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

    const recordsByDate = useMemo(() => {
        const map = new Map<string, PerformanceRecord[]>();
        memberData.records.forEach(record => {
            const localDate = new Date(record.date);
            const dateStr = getLocalDateString(localDate);
            if (!map.has(dateStr)) {
                map.set(dateStr, []);
            }
            map.get(dateStr)?.push(record);
        });
        return map;
    }, [memberData.records]);

    const selectedDayRecords = useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = getLocalDateString(selectedDate);
        return recordsByDate.get(dateStr) || [];
    }, [selectedDate, recordsByDate]);

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const isSameDay = (d1: Date, d2: Date) => 
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    return (
        <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
            <div className={`${commonStyles.modalContainer} p-4 flex flex-col max-h-[90vh]`}>
                <div className="flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-purple-300">{memberData.name}의 연습 기록</h2>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                
                    <div className="flex justify-between items-center mb-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700">&lt;</button>
                        <h3 className="text-lg font-semibold">{currentDate.toLocaleString('ko-KR', { month: 'long', year: 'numeric' })}</h3>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700">&gt;</button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
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
                                <button key={day.toISOString()} onClick={() => setSelectedDate(day)} className={`relative p-2 h-10 w-10 flex items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-purple-600 text-white' : isToday ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
                                    <span>{day.getDate()}</span>
                                    {hasRecord && <div className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-400'}`}></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4 flex-1 overflow-y-auto">
                    <h3 className={`text-md font-semibold border-b ${commonStyles.divider} pb-2 mb-3`}>
                        {selectedDate ? `${selectedDate.toLocaleDateString('ko-KR')}` : '날짜를 선택하세요'}
                    </h3>
                    {selectedDayRecords.length > 0 ? (
                        <div className="space-y-3">
                            {selectedDayRecords.map(record => (
                                <div key={record.id} className="w-full text-left bg-gray-900/50 p-3 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-purple-300 text-sm">{record.title}</h4>
                                            <p className="text-xs text-gray-400">{record.instrument}</p>
                                        </div>
                                        <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded">{formatTime(record.duration)}</span>
                                    </div>
                                    {record.summary && <p className="text-xs text-gray-300 mt-2 italic text-left line-clamp-2">"{record.summary}"</p>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center text-sm py-4">선택한 날짜에 연습 기록이 없습니다.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberCalendarModal;
