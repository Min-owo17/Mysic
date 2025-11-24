

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { analyzePerformanceNotes, analyzeAudioForPlayingTime } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { practiceApi } from '../services/api/practice';
import { formatTime } from '../utils/time';
import { instruments } from '../utils/constants';
import { View } from '../types';
import { commonStyles } from '../styles/commonStyles';
import toast from 'react-hot-toast';

type RecordingState = 'idle' | 'recording' | 'analyzingAudio' | 'recorded' | 'saving';

const RecordView: React.FC = () => {
    const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, resetAudio } = useAudioRecorder();
    const { addRecord, userProfile } = useAppContext();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [uiState, setUiState] = useState<RecordingState>('idle');
    const [instrument, setInstrument] = useState(userProfile.instrument || '');
    const [notes, setNotes] = useState('');
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [analyzedDuration, setAnalyzedDuration] = useState<number | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    
    const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState(false);
    const instrumentDropdownRef = useRef<HTMLDivElement>(null);

    // 진행 중인 세션 확인
    const { data: activeSession } = useQuery({
        queryKey: ['practice', 'active-session'],
        queryFn: async () => {
            try {
                return await practiceApi.getActiveSession();
            } catch (error: any) {
                // 422 오류는 세션이 없는 경우이므로 null로 처리
                if (error.response?.status === 422) {
                    return null;
                }
                throw error;
            }
        },
        refetchInterval: 30000, // 30초마다 확인
        retry: false, // 422 오류는 재시도하지 않음
        staleTime: 10 * 1000, // 10초 - 세션 상태는 10초간 fresh
        cacheTime: 1 * 60 * 1000, // 1분 - 캐시 1분 유지
    });

    // 연습 세션 시작 mutation
    const createSessionMutation = useMutation({
        mutationFn: practiceApi.createSession,
        onSuccess: (data) => {
            setCurrentSessionId(data.session_id);
            toast.success('연습 세션이 시작되었습니다.');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.detail || '연습 세션 시작에 실패했습니다.';
            setError(errorMessage);
            toast.error(errorMessage);
        },
    });

    // 연습 세션 종료 mutation
    const updateSessionMutation = useMutation({
        mutationFn: ({ sessionId, data }: { sessionId: number; data: any }) => 
            practiceApi.updateSession(sessionId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['practice'] });
            toast.success('연습 세션이 저장되었습니다.');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.detail || '연습 세션 저장에 실패했습니다.';
            setError(errorMessage);
            toast.error(errorMessage);
        },
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (instrumentDropdownRef.current && !instrumentDropdownRef.current.contains(event.target as Node)) {
                setIsInstrumentDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // 진행 중인 세션이 있으면 복원
    useEffect(() => {
        if (activeSession && activeSession.status === 'in_progress') {
            setCurrentSessionId(activeSession.session_id);
            // 진행 중인 세션이 있으면 녹음 상태로 복원하지 않음 (사용자가 수동으로 시작해야 함)
        }
    }, [activeSession]);

    useEffect(() => {
        if (isRecording) {
            setUiState('recording');
        } else if (uiState !== 'recorded' && uiState !== 'saving' && uiState !== 'analyzingAudio') {
            setUiState('idle');
        }
    }, [isRecording, uiState]);


    const handleStartRecording = async () => {
        setError('');
        try {
            // 기존 세션이 있으면 새로 생성하지 않음
            if (!currentSessionId) {
                // 먼저 연습 세션 시작
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
                await createSessionMutation.mutateAsync({
                    practice_date: today,
                    instrument: instrument || undefined,
                    notes: notes || undefined,
                });
            }
            
            // 연습 세션 시작 성공 후 녹음 시작
            await startRecording();
        } catch (err) {
            setError('녹음을 시작할 수 없습니다. 마이크 권한을 허용해주세요.');
            console.error(err);
        }
    };
    
    const handleStopAndAnalyze = async () => {
        setUiState('analyzingAudio');
        let tempBlob: Blob | null = null;
        try {
            const blob = await stopRecording();
            tempBlob = blob;
            setError('');
            // 메모리 최적화: Base64 변환은 analyzeAudioForPlayingTime 내부에서만 수행
            const { playingTimeInSeconds } = await analyzeAudioForPlayingTime(blob);
            setAnalyzedDuration(playingTimeInSeconds);
            // 분석 완료 후 임시 Blob 참조 해제 (가비지 컬렉션 유도)
            tempBlob = null;
        } catch (err) {
            console.error(err);
            setError('연주 시간 분석에 실패하여, 전체 녹음 시간으로 기록됩니다.');
            setAnalyzedDuration(recordingTime); // Fallback to total time
        } finally {
            setUiState('recorded');
        }
    };

    const handleDiscard = async () => {
        // 진행 중인 세션이 있으면 종료
        if (currentSessionId) {
            try {
                await updateSessionMutation.mutateAsync({
                    sessionId: currentSessionId,
                    data: {
                        actual_play_time: 0,
                        notes: '취소됨',
                    },
                });
            } catch (err) {
                console.error('세션 취소 실패:', err);
            }
            setCurrentSessionId(null);
        }
        
        resetAudio();
        setInstrument(userProfile.instrument || '');
        setNotes('');
        setTitle('');
        setSummary('');
        setAnalyzedDuration(null);
        setError('');
        setUiState('idle');
    };

    const handleAnalyzeNotes = async () => {
        if (!notes) {
            setError('먼저 연습 세션에 대한 메모를 입력해주세요.');
            return;
        }
        setIsAnalyzing(true);
        setError('');
        try {
            const result = await analyzePerformanceNotes(notes);
            setTitle(result.title);
            setSummary(result.summary);
        } catch (err) {
            setError('메모 분석에 실패했습니다. 다시 시도해주세요.');
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!instrument) {
            setError('악기를 입력해주세요.');
            return;
        }
        if (analyzedDuration === null && currentSessionId) {
            setError('연주 시간이 아직 분석되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        if (!currentSessionId) {
            setError('연습 세션을 찾을 수 없습니다. 다시 시작해주세요.');
            return;
        }
        
        setUiState('saving');
        
        try {
            // 연습 세션 종료 및 저장
            await updateSessionMutation.mutateAsync({
                sessionId: currentSessionId,
                data: {
                    actual_play_time: analyzedDuration ?? recordingTime,
                    instrument: instrument,
                    notes: notes || undefined,
                },
            });

            // 로컬 상태에도 저장 (기존 기능 유지)
            if (title) {
                addRecord({
                    date: new Date().toISOString(),
                    title,
                    instrument,
                    duration: analyzedDuration ?? recordingTime,
                    notes,
                    summary,
                });
            }
            
            setShowSuccessModal(true);
            setCurrentSessionId(null);
        } catch (err) {
            console.error(err);
            setError('연습 세션 저장에 실패했습니다.');
            setUiState('recorded');
        }
    };

    const handleInstrumentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInstrument(e.target.value);
        if (!isInstrumentDropdownOpen) {
            setIsInstrumentDropdownOpen(true);
        }
    };

    const handleInstrumentSelect = (selectedInstrument: string) => {
        setInstrument(selectedInstrument);
        setIsInstrumentDropdownOpen(false);
    };

    const filteredInstruments = useMemo(() => {
        if (!instrument) return instruments;
        return instruments.filter(inst =>
            inst.toLowerCase().includes(instrument.toLowerCase())
        );
    }, [instrument]);

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        handleDiscard();
        navigate('/calendar');
    };

    // 진행 중인 세션 계속하기
    const handleContinueSession = () => {
        if (activeSession) {
            // 기존 세션 정보 복원
            setCurrentSessionId(activeSession.session_id);
            if (activeSession.instrument) {
                setInstrument(activeSession.instrument);
            }
            if (activeSession.notes) {
                setNotes(activeSession.notes);
            }
            // 세션 정보를 표시하고 녹음을 시작할 수 있도록 준비
            toast.success('기존 세션을 불러왔습니다. 녹음을 시작하세요.');
        }
    };

    // 진행 중인 세션 취소하기
    const handleCancelActiveSession = async () => {
        if (activeSession) {
            try {
                await updateSessionMutation.mutateAsync({
                    sessionId: activeSession.session_id,
                    data: {
                        actual_play_time: 0,
                        notes: '사용자에 의해 취소됨',
                    },
                });
                toast.success('진행 중인 세션이 취소되었습니다.');
                // 쿼리 캐시 무효화하여 activeSession을 null로 업데이트
                queryClient.invalidateQueries({ queryKey: ['practice', 'active-session'] });
            } catch (err) {
                console.error('세션 취소 실패:', err);
                toast.error('세션 취소에 실패했습니다.');
            }
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-md mx-auto min-h-[calc(100vh-8rem)] flex flex-col">
            {error && <div className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 p-3 rounded-md my-4 text-sm">{error}</div>}

            {uiState === 'idle' && (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                    <p className="text-gray-500 dark:text-gray-400 mb-8">버튼을 눌러 기록을 시작하세요</p>
                    {activeSession && activeSession.status === 'in_progress' && (
                        <div className="mb-6 w-full max-w-sm">
                            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-md text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                                <p className="font-semibold mb-2">진행 중인 연습 세션이 있습니다.</p>
                                {activeSession.start_time && (
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                        시작 시간: {new Date(activeSession.start_time).toLocaleString('ko-KR')}
                                    </p>
                                )}
                                {activeSession.instrument && (
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                        악기: {activeSession.instrument}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleContinueSession}
                                    className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} flex-1 py-2 text-sm`}
                                >
                                    예, 계속하기
                                </button>
                                <button
                                    onClick={handleCancelActiveSession}
                                    disabled={updateSessionMutation.isPending}
                                    className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} flex-1 py-2 text-sm disabled:opacity-50`}
                                >
                                    {updateSessionMutation.isPending ? (
                                        <Spinner size="sm" />
                                    ) : (
                                        '아니오, 취소'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={handleStartRecording} 
                        disabled={createSessionMutation.isPending}
                        className="w-48 h-48 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-600/30 transform hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {createSessionMutation.isPending ? (
                            <Spinner size="lg" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/><path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/></svg>
                        )}
                    </button>
                </div>
            )}
            
            {uiState === 'recording' && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-6xl font-mono text-purple-600 dark:text-purple-300 animate-pulse">{formatTime(recordingTime)}</div>
                    <p className="text-gray-500 dark:text-gray-400 mt-4">녹음 중...</p>
                    <button onClick={handleStopAndAnalyze} className="mt-12 w-32 h-32 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/></svg>
                    </button>
                </div>
            )}
            
            {uiState === 'analyzingAudio' && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Spinner size="lg" />
                    <p className="text-gray-500 dark:text-gray-400 mt-4">연주 시간을 분석하는 중...</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">AI가 녹음 파일에서 실제 연주 구간을 찾고 있습니다.</p>
                </div>
            )}

            {uiState === 'recorded' && audioBlob && (
                 <div className="flex-1 flex flex-col space-y-4">
                    <h2 className="text-xl font-semibold text-purple-600 dark:text-purple-300 mt-4">세션 저장</h2>
                    <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-md">
                         <p className="text-gray-500 dark:text-gray-400 text-sm">분석된 연주 시간</p>
                         <p className="font-mono text-purple-600 dark:text-purple-300 text-2xl">{formatTime(analyzedDuration ?? 0)}</p>
                         <p className="text-xs text-gray-400 dark:text-gray-500 text-right">(총 녹음 시간: {formatTime(recordingTime)})</p>
                    </div>

                    <audio src={URL.createObjectURL(audioBlob)} controls className="w-full"></audio>
                     
                    <div className="relative" ref={instrumentDropdownRef}>
                        <input
                            type="text"
                            placeholder="악기 (예: 피아노)"
                            value={instrument}
                            onChange={handleInstrumentInputChange}
                            onFocus={() => setIsInstrumentDropdownOpen(true)}
                            autoComplete="off"
                            className={commonStyles.textInput}
                        />
                         {isInstrumentDropdownOpen && (
                            <ul className="absolute z-30 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg animate-fade-in">
                                {filteredInstruments.length > 0 ? (
                                    filteredInstruments.map(inst => (
                                        <li
                                            key={inst}
                                            onClick={() => handleInstrumentSelect(inst)}
                                            className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-purple-500 hover:text-white"
                                        >
                                            {inst}
                                        </li>
                                    ))
                                ) : (
                                    <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">결과 없음</li>
                                )}
                            </ul>
                        )}
                    </div>

                    <textarea placeholder="연주에 대한 메모... (예: '쇼팽 야상곡 연습, 강약 조절에 집중')" value={notes} onChange={e => setNotes(e.target.value)} rows={4} className={`${commonStyles.textInput} resize-none`}></textarea>

                    <button onClick={handleAnalyzeNotes} disabled={isAnalyzing || !notes} className={`${commonStyles.buttonBase} ${commonStyles.indigoButton} flex justify-center items-center gap-2`}>
                        {isAnalyzing ? <Spinner /> : <SparklesIcon />}
                        분석 및 제목 제안
                    </button>

                    <input type="text" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} className={commonStyles.textInput} />
                    {summary && <p className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-gray-600 dark:text-gray-300 italic">"{summary}"</p>}

                     <div className="flex gap-4 pt-4">
                        <button 
                            onClick={handleDiscard} 
                            disabled={updateSessionMutation.isPending}
                            className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} py-3 disabled:opacity-50`}
                        >
                            취소
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={updateSessionMutation.isPending || analyzedDuration === null}
                            className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} py-3 disabled:opacity-50 flex items-center justify-center gap-2`}
                        >
                            {updateSessionMutation.isPending ? (
                                <>
                                    <Spinner size="sm" />
                                    저장 중...
                                </>
                            ) : (
                                '저장'
                            )}
                        </button>
                     </div>
                 </div>
            )}
             {uiState === 'saving' && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Spinner size="lg" />
                    <p className="text-gray-500 dark:text-gray-400 mt-4">연주를 저장하는 중...</p>
                </div>
             )}
            
            {showSuccessModal && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainer} p-6 text-center flex flex-col items-center`}>
                        <CheckCircleIcon />
                        <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-300 mt-4">저장 완료!</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">연습 성과를 친구들과 공유해보세요.</p>
                        
                        <div className={`w-full my-6 ${commonStyles.divider}`}></div>

                        <div className="w-full flex justify-center gap-4">
                            <button className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white w-14 h-14 rounded-full transition-colors" aria-label="인스타그램에 공유">
                                <InstagramIcon />
                            </button>
                            <button className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white w-14 h-14 rounded-full transition-colors" aria-label="Threads에 공유">
                                <ThreadsIcon />
                            </button>
                            <button className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white w-14 h-14 rounded-full transition-colors" aria-label="X에 공유">
                                <XIcon />
                            </button>
                            <button className="flex items-center justify-center bg-[#FEE500] hover:bg-yellow-400 text-black w-14 h-14 rounded-full transition-colors" aria-label="카카오톡으로 공유">
                                <KakaoTalkIcon />
                            </button>
                        </div>
                        
                        <div className="w-full mt-6">
                            <button
                                onClick={handleCloseSuccessModal}
                                className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} py-3`}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
        sm: 'h-5 w-5',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };
    return (<div className={`${commonStyles.spinner} ${sizeClasses[size]}`}></div>);
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v2.586l1.707-1.707a1 1 0 111.414 1.414L12.414 8H15a1 1 0 110 2h-2.586l1.707 1.707a1 1 0 11-1.414 1.414L11 11.586V15a1 1 0 11-2 0v-3.414l-1.707 1.707a1 1 0 11-1.414-1.414L7.586 10H5a1 1 0 110 2h2.586L5.793 6.293a1 1 0 011.414-1.414L9 6.586V4a1 1 0 011-1zM3 10a1 1 0 011-1h.01a1 1 0 110 2H4a1 1 0 01-1-1zm13 0a1 1 0 011-1h.01a1 1 0 110 2H17a1 1 0 01-1-1zM7 16a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm7 0a1 1 0 011-1h.01a1 1 0 110 2H15a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const InstagramIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
);

const ThreadsIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.568 5.424a5.166 5.166 0 0 0-5.142 4.125h-1.03V12h1.03a5.165 5.165 0 0 0 5.142 4.125 5.165 5.165 0 0 0 5.142-4.125h1.03V9.549h-1.03a5.166 5.166 0 0 0-5.142-4.125zm0 1.25a3.916 3.916 0 0 1 3.892 3.125h-7.784a3.916 3.916 0 0 1 3.892-3.125zM8.426 12h7.784a3.916 3.916 0 0 1-3.892 3.125 3.916 3.916 0 0 1-3.892-3.125z"></path>
    </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const KakaoTalkIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.486 2 2 5.589 2 10c0 2.908 1.898 5.485 4.713 6.936-.01.01-.019.021-.028.031-.836.918-2.453 2.385-2.625 2.529-.172.144-.225.385-.12.59.104.205.328.314.552.288.106-.012 2.328-.27 3.938-1.57.17-.138.358-.262.556-.368.834.205 1.703.314 2.59.314 5.514 0 10-3.589 10-8s-4.486-8-10-8z"/>
  </svg>
);

export default RecordView;