import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../../services/api/support';
import { SupportResponse } from '../../types';
import { commonStyles } from '../../styles/commonStyles';

interface InquiryDetailModalProps {
    inquiry: SupportResponse | null;
    onClose: () => void;
}

const InquiryDetailModal: React.FC<InquiryDetailModalProps> = ({ inquiry, onClose }) => {
    const queryClient = useQueryClient();
    const [answerContent, setAnswerContent] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (inquiry) {
            setAnswerContent(inquiry.answer_content || '');
            setError(null);
        }
    }, [inquiry]);

    const answerMutation = useMutation({
        mutationFn: (content: string) => supportApi.answerInquiry(inquiry!.support_id, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminInquiries'] });
            onClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || '답변 등록에 실패했습니다.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inquiry) return;
        answerMutation.mutate(answerContent);
    };

    if (!inquiry) return null;

    const isAnswered = inquiry.status === 'answered';

    return (
        <div className={commonStyles.modalOverlay} onClick={onClose}>
            <div
                className={commonStyles.modalContainerLarge}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        {inquiry.type === 'inquiry' ? '문의 내용' : '제안 내용'}
                    </h2>

                    <div className="space-y-6">
                        {/* 문의 정보 */}
                        <div className="space-y-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {inquiry.title}
                                    </h3>
                                    <div className="flex items-center mt-1 space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span>{inquiry.user?.nickname}</span>
                                        <span>•</span>
                                        <span>{new Date(inquiry.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isAnswered
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                    {isAnswered ? '답변완료' : '대기중'}
                                </span>
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {inquiry.content}
                            </div>
                        </div>

                        {/* 답변 입력 폼 */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={commonStyles.label}>
                                    관리자 답변
                                </label>
                                {error && (
                                    <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
                                        {error}
                                    </div>
                                )}
                                <textarea
                                    value={answerContent}
                                    onChange={(e) => setAnswerContent(e.target.value)}
                                    className={`${commonStyles.textarea} h-40`}
                                    placeholder="답변 내용을 입력하세요..."
                                    readOnly={isAnswered} // 답변 완료 시 수정 불가 (필요시 수정 가능하게 변경 가능)
                                    required
                                />
                                {isAnswered && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        * 이미 답변이 완료된 문의입니다.
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={commonStyles.secondaryButton}
                                >
                                    닫기
                                </button>
                                {!isAnswered && (
                                    <button
                                        type="submit"
                                        disabled={answerMutation.isPending}
                                        className={commonStyles.primaryButton}
                                    >
                                        {answerMutation.isPending ? '저장 중...' : '답변 등록'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InquiryDetailModal;
