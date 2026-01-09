import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api/admin';
import { AchievementResponse, AchievementCreateRequest, AchievementUpdateRequest } from '../../types';
import { commonStyles } from '../../styles/commonStyles';

function AchievementManagementView() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAchievement, setEditingAchievement] = useState<AchievementResponse | null>(null);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [conditionType, setConditionType] = useState('practice_time');
    const [conditionValue, setConditionValue] = useState<number>(0);
    const [iconUrl, setIconUrl] = useState('');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['adminAchievements'],
        queryFn: adminApi.getAchievements,
    });

    const createMutation = useMutation({
        mutationFn: (data: AchievementCreateRequest) => adminApi.createAchievement(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminAchievements'] });
            closeModal();
        },
        onError: (err: any) => alert(err.response?.data?.detail || '생성 실패'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: AchievementUpdateRequest }) =>
            adminApi.updateAchievement(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminAchievements'] });
            closeModal();
        },
        onError: (err: any) => alert(err.response?.data?.detail || '수정 실패'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => adminApi.deleteAchievement(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminAchievements'] });
            closeModal();
        },
        onError: (err: any) => alert(err.response?.data?.detail || '삭제 실패'),
    });

    const openCreateModal = () => {
        setEditingAchievement(null);
        setTitle('');
        setDescription('');
        setConditionType('practice_time');
        setConditionValue(0);
        setIconUrl('');
        setIsModalOpen(true);
    };

    const openEditModal = (achievement: AchievementResponse) => {
        setEditingAchievement(achievement);
        setTitle(achievement.title);
        setDescription(achievement.description || '');
        setConditionType(achievement.condition_type || 'practice_time');
        setConditionValue(achievement.condition_value || 0);
        setIconUrl(achievement.icon_url || '');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAchievement(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const achievementData = {
            title,
            description,
            condition_type: conditionType,
            condition_value: Number(conditionValue),
            icon_url: iconUrl || undefined,
        };

        if (editingAchievement) {
            updateMutation.mutate({ id: editingAchievement.achievement_id, data: achievementData });
        } else {
            createMutation.mutate(achievementData);
        }
    };

    const handleDelete = (id: number) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><div className={commonStyles.spinner}></div></div>;
    if (isError) return <div className="p-8 text-center text-red-500">데이터 로드 실패</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">칭호 관리</h1>
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    + 새 칭호 추가
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="p-4 w-16">아이콘</th>
                            <th className="p-4 w-1/4">이름</th>
                            <th className="p-4">설명</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {data?.achievements.map((ach) => (
                            <tr
                                key={ach.achievement_id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                                onClick={() => openEditModal(ach)}
                            >
                                <td className="p-4">
                                    {ach.icon_url ? (
                                        <img src={ach.icon_url} alt="" className="w-10 h-10 rounded-full bg-gray-100 object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">No</div>
                                    )}
                                </td>
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{ach.title}</td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">{ach.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 transform transition-all">
                        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                            {editingAchievement ? '칭호 수정' : '새 칭호 추가'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">칭호 이름</label>
                                <input
                                    type="text"
                                    className={`${commonStyles.textInput} w-full`}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                    placeholder="칭호 이름을 입력하세요"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설명</label>
                                <textarea
                                    className={`${commonStyles.textInput} w-full min-h-[80px] py-2`}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="칭호에 대한 설명을 입력하세요"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">조건 타입</label>
                                    <select
                                        className={`${commonStyles.textInput} w-full`}
                                        value={conditionType}
                                        onChange={e => setConditionType(e.target.value)}
                                    >
                                        <option value="practice_time">누적 연습 시간 (초)</option>
                                        <option value="consecutive_days">연속 연습 일수 (일)</option>
                                        <option value="instrument_count">등록 악기 개수</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">조건 값</label>
                                    <input
                                        type="number"
                                        className={`${commonStyles.textInput} w-full`}
                                        value={conditionValue}
                                        onChange={e => setConditionValue(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">아이콘 URL</label>
                                <input
                                    type="text"
                                    className={`${commonStyles.textInput} w-full`}
                                    value={iconUrl}
                                    onChange={e => setIconUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="mt-8 flex gap-3">
                                {editingAchievement && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editingAchievement) {
                                                handleDelete(editingAchievement.achievement_id);
                                            }
                                        }}
                                        className="flex-1 px-4 py-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                    >
                                        삭제
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className={`flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm ${!editingAchievement ? 'col-span-2' : ''}`}
                                >
                                    {editingAchievement ? '수정' : '생성'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AchievementManagementView;
