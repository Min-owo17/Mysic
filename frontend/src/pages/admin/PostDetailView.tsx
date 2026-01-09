import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api/admin';
import { commonStyles } from '../../styles/commonStyles';

function PostDetailView() {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: post, isLoading, isError } = useQuery({
        queryKey: ['adminPost', postId],
        queryFn: () => adminApi.getPost(Number(postId)),
        enabled: !!postId,
    });

    const statusMutation = useMutation({
        mutationFn: ({ data }: { data: { is_hidden?: boolean; is_deleted?: boolean } }) =>
            adminApi.updatePostStatus(Number(postId), data),
        onSuccess: (updatedPost) => {
            queryClient.setQueryData(['adminPost', postId], updatedPost);
            queryClient.invalidateQueries({ queryKey: ['adminPosts'] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.detail || '상태 변경에 실패했습니다.');
        },
        onSettled: () => {
            setIsProcessing(false);
        }
    });

    const handleHideToggle = () => {
        if (!post) return;
        if (window.confirm(post.is_hidden ? '숨김 처리를 해제하시겠습니까?' : '이 게시글을 숨김 처리하시겠습니까?')) {
            setIsProcessing(true);
            statusMutation.mutate({ data: { is_hidden: !post.is_hidden } });
        }
    };

    const handleDeleteToggle = () => {
        if (!post) return;
        const isDeleted = !!post.deleted_at;
        if (window.confirm(isDeleted ? '삭제된 게시글을 복구하시겠습니까?' : '이 게시글을 삭제하시겠습니까?')) {
            setIsProcessing(true);
            statusMutation.mutate({ data: { is_deleted: !isDeleted } });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className={commonStyles.spinner}></div>
            </div>
        );
    }

    if (isError || !post) {
        return <div className="text-center text-red-500 py-10">게시글을 불러오는데 실패했습니다.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => navigate('/admin/posts')}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center"
                >
                    &larr; 목록으로 돌아가기
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">게시글 상세 관리</h1>
            </div>

            {/* 상태 알림 배너 */}
            {(post.is_hidden || post.deleted_at || !!post.report_count) && (
                <div className="mb-6 space-y-2">
                    {!!post.deleted_at && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm">
                            <p className="font-bold">삭제된 게시글입니다.</p>
                            <p className="text-sm">삭제 일시: {new Date(post.deleted_at).toLocaleString()}</p>
                        </div>
                    )}
                    {post.is_hidden && (
                        <div className="bg-gray-200 border-l-4 border-gray-500 text-gray-700 p-4 rounded shadow-sm">
                            <p className="font-bold">숨김 처리된 게시글입니다.</p>
                        </div>
                    )}
                    {!!post.report_count && (
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-sm">
                            <p className="font-bold">신고된 게시글입니다.</p>
                            <p>누적 신고 수: {post.report_count}회</p>
                        </div>
                    )}
                </div>
            )}

            {/* 게시글 내용 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {post.category}
                        </span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleString()}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {post.title}
                    </h2>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                {post.author.profile_image_url ? (
                                    <img src={post.author.profile_image_url} alt={post.author.nickname} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                                        {post.author.nickname.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {post.author.nickname}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    User ID: {post.user_id}
                                </p>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-x-3">
                            <span>조회 {post.view_count}</span>
                            <span>좋아요 {post.like_count}</span>
                            <span>댓글 {post.comment_count}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 min-h-[200px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                </div>

                {post.tags && post.tags.length > 0 && (
                    <div className="px-6 pb-6 pt-2 flex flex-wrap gap-2">
                        {post.tags.map(tag => (
                            <span key={tag} className="text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-full">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* 관리 액션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">관리 작업</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleHideToggle}
                        disabled={isProcessing || !!post.deleted_at} // 삭제된 글은 숨김 처리 의미 없음
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${post.is_hidden
                                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200'
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {post.is_hidden ? '숨김 해제' : '게시글 숨김'}
                    </button>

                    <button
                        onClick={handleDeleteToggle}
                        disabled={isProcessing}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${post.deleted_at
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {post.deleted_at ? '게시글 복구 (삭제 취소)' : '게시글 삭제'}
                    </button>
                </div>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    * '게시글 삭제'는 Soft Delete로 처리되어 DB에는 남아있지만 일반 사용자에게는 노출되지 않습니다.<br />
                    * '게시글 숨김'은 신고 누적 등으로 인해 임시로 노출을 제한하는 기능입니다.
                </p>
            </div>
        </div>
    );
}

export default PostDetailView;
