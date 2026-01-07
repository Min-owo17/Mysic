import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { commonStyles } from '../../styles/commonStyles';
import { boardApi, Post, PostComment } from '../../services/api/board';
import { defaultAvatar } from '../../utils/avatar';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/slices/authSlice';

interface PostDetailViewProps {
  post: Post;
  onBack: () => void;
  onEditRequest: (post: Post) => void;
  onDeleteRequest: (postId: number) => void;
}

/**
 * 게시글이 실제로 수정되었는지 판단하는 헬퍼 함수
 * 5초 이상 차이가 나야 수정으로 간주 (시스템 처리 시간 고려)
 */
const isPostEdited = (createdAt: string, updatedAt: string | null | undefined, minDifferenceSeconds: number = 5): boolean => {
  if (!updatedAt) return false;

  const createdTime = new Date(createdAt).getTime();
  const updatedTime = new Date(updatedAt).getTime();
  const timeDifferenceSeconds = (updatedTime - createdTime) / 1000;

  return timeDifferenceSeconds >= minDifferenceSeconds;
};

/**
 * 댓글이 실제로 수정되었는지 판단하는 헬퍼 함수
 * 5초 이상 차이가 나야 수정으로 간주 (시스템 처리 시간 고려)
 */
const isCommentEdited = (createdAt: string, updatedAt: string | null | undefined, minDifferenceSeconds: number = 5): boolean => {
  if (!updatedAt) return false;

  const createdTime = new Date(createdAt).getTime();
  const updatedTime = new Date(updatedAt).getTime();
  const timeDifferenceSeconds = (updatedTime - createdTime) / 1000;

  return timeDifferenceSeconds >= minDifferenceSeconds;
};

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const PostDetailView: React.FC<PostDetailViewProps> = ({ post: initialPost, onBack, onEditRequest, onDeleteRequest }) => {
  const { userProfile, userProfiles } = useAppContext();
  const { user } = useAuthStore(); // 현재 로그인한 사용자 정보
  const queryClient = useQueryClient();

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null); // 삭제하려는 댓글 ID
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  // --- Report Modal State ---
  const [reportingItem, setReportingItem] = useState<{ id: number; type: 'post' | 'comment' } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const reportReasons = ['분쟁 유발', '욕설/비방', '음란물', '광고/홍보성', '개인정보 유출', '기타'];

  // 게시글 상세 조회 (최신 정보)
  const { data: postData, isLoading: isLoadingPost } = useQuery({
    queryKey: ['board', 'post', initialPost.post_id],
    queryFn: () => boardApi.getPost(initialPost.post_id),
    initialData: initialPost, // 초기 데이터로 전달받은 post 사용
    staleTime: 1 * 60 * 1000, // 1분
  });

  // 댓글 목록 조회
  const { data: commentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: ['board', 'post', initialPost.post_id, 'comments'],
    queryFn: () => boardApi.getComments(initialPost.post_id),
    staleTime: 1 * 60 * 1000, // 1분
  });

  const post = postData || initialPost;

  // 게시글 좋아요 Mutation
  const togglePostLikeMutation = useMutation({
    mutationFn: () => boardApi.togglePostLike(initialPost.post_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id] });
      queryClient.invalidateQueries({ queryKey: ['board', 'posts'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '좋아요 처리에 실패했습니다.');
    },
  });

  // 댓글 작성 Mutation
  const createCommentMutation = useMutation({
    mutationFn: (data: { content: string; parent_comment_id?: number }) =>
      boardApi.createComment(initialPost.post_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id] });
      setNewComment('');
      setIsSubmitting(false);
      toast.success('댓글이 작성되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '댓글 작성에 실패했습니다.');
      setIsSubmitting(false);
    },
  });

  // 댓글 좋아요 Mutation
  const toggleCommentLikeMutation = useMutation({
    mutationFn: (commentId: number) => boardApi.toggleCommentLike(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id, 'comments'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '좋아요 처리에 실패했습니다.');
    },
  });

  // 댓글 수정 Mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      boardApi.updateComment(commentId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id] });
      setEditingCommentId(null);
      setEditingCommentContent('');
      toast.success('댓글이 수정되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '댓글 수정에 실패했습니다.');
    },
  });

  // 댓글 삭제 Mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => boardApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id] });
      toast.success('댓글이 삭제되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '댓글 삭제에 실패했습니다.');
    },
  });

  // 게시글 북마크 토글 Mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: () => boardApi.togglePostBookmark(initialPost.post_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id] });
      queryClient.invalidateQueries({ queryKey: ['board', 'posts'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '북마크 처리에 실패했습니다.');
    },
  });

  const isAuthor = user ? post.user_id === user.user_id : false;
  const isPostLiked = post.is_liked;
  const isBookmarked = post.is_bookmarked;

  const totalComments = commentsData?.total || 0;

  const getProfile = (nickname: string) => {
    if (nickname === userProfile.nickname) return userProfile;
    return userProfiles[nickname] || {};
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    createCommentMutation.mutate({ content: newComment });
  };

  const handleSubmitReply = (parentCommentId: number) => {
    if (!replyContent.trim()) return;
    createCommentMutation.mutate({
      content: replyContent,
      parent_comment_id: parentCommentId
    });
    setReplyContent('');
    setReplyingTo(null);
  };

  const handlePostDeleteConfirm = () => {
    onDeleteRequest(post.post_id);
    setShowDeleteConfirm(false);
  };

  const handleCommentDeleteConfirm = () => {
    if (commentToDelete) {
      deleteCommentMutation.mutate(commentToDelete);
      setCommentToDelete(null);
    }
  };

  const handleCloseReportModal = () => {
    setReportingItem(null);
    setReportReason('');
    setReportDetails('');
  };

  const handleSubmitReport = async () => {
    if (!reportingItem || !reportReason || (reportReason === '기타' && !reportDetails.trim())) {
      return;
    }

    // 현재 게시물 신고만 구현됨
    if (reportingItem.type !== 'post') {
      toast.error('댓글 신고 기능은 준비 중입니다.');
      handleCloseReportModal();
      return;
    }

    try {
      await boardApi.reportPost(reportingItem.id, {
        reason: reportReason,
        details: reportDetails.trim() || undefined
      });

      handleCloseReportModal();
      setShowReportSuccess(true);
      setTimeout(() => setShowReportSuccess(false), 3000);

      // 본인 게시물이 숨김 처리될 수도 있으므로 갱신
      queryClient.invalidateQueries({ queryKey: ['board', 'post', initialPost.post_id] });
      queryClient.invalidateQueries({ queryKey: ['board', 'posts'] });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '신고 접수에 실패했습니다.');
    }
  };

  const authorProfile = getProfile(post.author.nickname);
  const isExcellentPost = post.like_count >= 30;

  // 댓글을 재귀적으로 렌더링하는 함수
  const renderComment = (comment: PostComment, depth: number = 0) => {
    const isCommentLiked = comment.is_liked;
    const commentAuthorProfile = getProfile(comment.author.nickname);
    const isCommentAuthor = user ? comment.user_id === user.user_id : false;
    const isDeleted = !!comment.deleted_at;

    return (
      <div key={comment.comment_id} className={depth > 0 ? 'ml-8 mt-3' : ''}>
        <div className={`bg-gray-800/${depth > 0 ? '30' : '50'} p-3 rounded-lg`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <img
                src={comment.author.profile_image_url || defaultAvatar(comment.author.nickname)}
                alt={comment.author.nickname}
                className={`${depth > 0 ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gray-700`}
              />
              <div>
                <div className="flex items-center gap-2">
                  {comment.author.selected_achievement && (
                    <span className="text-xs text-purple-300 font-medium flex items-center gap-1">
                      [
                      {comment.author.selected_achievement.icon_url ? (
                        <img
                          src={comment.author.selected_achievement.icon_url}
                          alt={comment.author.selected_achievement.title}
                          className="w-3 h-3 object-contain inline"
                        />
                      ) : (
                        <span>🏆</span>
                      )}
                      {' '}
                      {comment.author.selected_achievement.title}]
                    </span>
                  )}
                  <p className="font-bold text-purple-300 text-sm">{comment.author.nickname}</p>
                  {commentAuthorProfile?.title && <p className="text-xs text-yellow-300 font-normal">{commentAuthorProfile.title}</p>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {/* UTC 시간을 자동으로 사용자의 로컬 시간대로 변환하여 표시 */}
                  {new Date(comment.created_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                    // timeZone 옵션 제거: 브라우저가 자동으로 사용자의 로컬 시간대를 사용하여 UTC 시간을 변환
                  })}
                  {isCommentEdited(comment.created_at, comment.updated_at) && (
                    <span className="text-gray-500 text-xs ml-1">(수정됨)</span>
                  )}
                </p>
              </div>
            </div>
            {!isDeleted && (
              <div className="flex items-center gap-3">
                {depth === 0 && (
                  <button
                    onClick={() => {
                      setReplyingTo(replyingTo === comment.comment_id ? null : comment.comment_id);
                      setReplyContent('');
                    }}
                    className="text-xs text-gray-400 hover:text-white font-semibold"
                  >
                    답글
                  </button>
                )}
                <button
                  onClick={() => toggleCommentLikeMutation.mutate(comment.comment_id)}
                  className={`flex items-center gap-1.5 text-sm transition-colors duration-200 ${isCommentLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
                >
                  <HeartIcon filled={isCommentLiked} className="h-4 w-4" />
                  <span>{comment.like_count || 0}</span>
                </button>
                {isCommentAuthor && (
                  <>
                    <button
                      onClick={() => {
                        setEditingCommentId(comment.comment_id);
                        setEditingCommentContent(comment.content);
                        setReplyingTo(null); // 답글 모드 취소
                      }}
                      className="text-gray-500 hover:text-blue-400"
                      aria-label="댓글 수정"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => {
                        setCommentToDelete(comment.comment_id);
                      }}
                      className="text-gray-500 hover:text-red-400"
                      aria-label="댓글 삭제"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
                {!isCommentAuthor && (
                  <button
                    onClick={() => setReportingItem({ id: comment.comment_id, type: 'comment' })}
                    className="text-gray-500 hover:text-red-400"
                    aria-label="댓글 신고"
                  >
                    <SirenIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          {isDeleted ? (
            // 삭제된 댓글 표시 모드
            <p className={`text-gray-500 italic mt-2 ${depth > 0 ? 'text-sm pl-8' : 'pl-11'}`}>
              삭제된 댓글입니다
            </p>
          ) : editingCommentId === comment.comment_id ? (
            // 수정 모드
            <div className="mt-3 pl-11">
              <textarea
                value={editingCommentContent}
                onChange={(e) => setEditingCommentContent(e.target.value)}
                rows={3}
                autoFocus
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-colors text-gray-200"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    if (editingCommentContent.trim()) {
                      updateCommentMutation.mutate({
                        commentId: comment.comment_id,
                        content: editingCommentContent.trim()
                      });
                    }
                  }}
                  disabled={!editingCommentContent.trim() || updateCommentMutation.isPending}
                  className="bg-purple-600 text-white font-bold px-3 py-1 text-sm rounded-md hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditingCommentContent('');
                  }}
                  disabled={updateCommentMutation.isPending}
                  className="bg-gray-600 text-white font-bold px-3 py-1 text-sm rounded-md hover:bg-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            // 일반 표시 모드
            <p className={`text-gray-300 mt-2 ${depth > 0 ? 'text-sm pl-8' : 'pl-11'}`}>{comment.content}</p>
          )}
        </div>

        {/* 답글 입력 폼 */}
        {replyingTo === comment.comment_id && !isDeleted && (
          <div className="ml-8 mt-3 pl-4 border-l-2 border-gray-700/50">
            <div className="flex gap-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`${comment.author.nickname}님에게 답글 남기기...`}
                rows={2}
                autoFocus
                className="flex-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-colors"
              />
              <button
                onClick={() => handleSubmitReply(comment.comment_id)}
                disabled={!replyContent.trim() || createCommentMutation.isPending}
                className="bg-purple-600 text-white font-bold px-3 text-sm rounded-md hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors"
              >
                등록
              </button>
            </div>
          </div>
        )}

        {/* 답글 목록 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-700/50 pl-4">
            {comment.replies.map(reply => renderComment(reply, 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 md:pt-[calc(1.5rem+4rem)] max-w-md md:max-w-3xl lg:max-w-5xl mx-auto h-full flex flex-col animate-fade-in">
      {reportingItem && (
        <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-11/12 max-w-sm transform animate-scale-in">
            <h3 className="text-xl font-bold text-red-400 mb-4">{reportingItem.type === 'post' ? '게시물' : '댓글'} 신고</h3>
            <p className="text-sm text-gray-400 mb-1">신고 사유를 선택해주세요.</p>
            <div className="space-y-2">
              {reportReasons.map(reason => (
                <label key={reason} className="flex items-center space-x-3 bg-gray-900/50 p-3 rounded-md cursor-pointer hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-200">{reason}</span>
                </label>
              ))}
            </div>
            {reportReason === '기타' && (
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="상세 사유를 입력해주세요."
                rows={3}
                className="w-full mt-3 bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
              />
            )}
            <div className="flex gap-4 mt-6">
              <button onClick={handleCloseReportModal} className={`${commonStyles.buttonBase} w-full bg-gray-600 text-white hover:bg-gray-500 focus:ring-gray-500`}>취소</button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportReason || (reportReason === '기타' && !reportDetails.trim())}
                className={`${commonStyles.buttonBase} ${commonStyles.dangerButton} disabled:bg-red-800`}
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportSuccess && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-sm font-semibold py-2 px-4 rounded-full animate-fade-in z-50">
          신고가 정상적으로 접수되었습니다.
        </div>
      )}

      {showDeleteConfirm && (
        <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-11/12 max-w-sm text-center transform animate-scale-in">
            <h3 className="text-xl font-bold text-red-400 mb-2">게시물 삭제</h3>
            <p className="text-gray-300 mb-6">정말로 이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`${commonStyles.buttonBase} w-full bg-gray-600 text-white hover:bg-gray-500 focus:ring-gray-500 focus:ring-offset-gray-800`}
              >
                취소
              </button>
              <button
                onClick={handlePostDeleteConfirm}
                className={`${commonStyles.buttonBase} ${commonStyles.dangerButton} focus:ring-offset-gray-800`}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 삭제 확인 모달 */}
      {commentToDelete !== null && (
        <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-11/12 max-w-sm text-center transform animate-scale-in">
            <h3 className="text-xl font-bold text-red-400 mb-2">댓글 삭제</h3>
            <p className="text-gray-300 mb-6">정말로 이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setCommentToDelete(null)}
                className={`${commonStyles.buttonBase} w-full bg-gray-600 text-white hover:bg-gray-500 focus:ring-gray-500 focus:ring-offset-gray-800`}
              >
                취소
              </button>
              <button
                onClick={handleCommentDeleteConfirm}
                className={`${commonStyles.buttonBase} ${commonStyles.dangerButton} focus:ring-offset-gray-800`}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center mb-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-purple-300 truncate">{post.title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6">
        {isLoadingPost ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-400">게시글을 불러오는 중...</p>
          </div>
        ) : (
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold text-purple-300 flex-1 pr-4">{post.title}</h2>
              <div className="flex gap-2 flex-shrink-0">
                {isAuthor ? (
                  <>
                    <button onClick={() => onEditRequest(post)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors">
                      <PencilIcon />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-full transition-colors">
                      <TrashIcon />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setReportingItem({ id: post.post_id, type: 'post' })} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-full transition-colors" aria-label="게시물 신고">
                    <SirenIcon />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <img src={post.author.profile_image_url || defaultAvatar(post.author.nickname)} alt={post.author.nickname} className="w-10 h-10 rounded-full bg-gray-700" />
              <div>
                <div className="flex items-center gap-2">
                  {post.author.selected_achievement && (
                    <span className="text-xs text-purple-300 font-medium flex items-center gap-1">
                      [
                      {post.author.selected_achievement.icon_url ? (
                        <img
                          src={post.author.selected_achievement.icon_url}
                          alt={post.author.selected_achievement.title}
                          className="w-3 h-3 object-contain inline"
                        />
                      ) : (
                        <span>🏆</span>
                      )}
                      {' '}
                      {post.author.selected_achievement.title}]
                    </span>
                  )}
                  <p className="font-semibold text-gray-200">{post.author.nickname}</p>
                </div>
                {authorProfile?.title && <p className="text-xs text-yellow-300">{authorProfile.title}</p>}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {/* UTC 시간을 자동으로 사용자의 로컬 시간대로 변환하여 표시 */}
              {new Date(post.created_at).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
                // timeZone 옵션 제거: 브라우저가 자동으로 사용자의 로컬 시간대를 사용하여 UTC 시간을 변환
              })}
              {isPostEdited(post.created_at, post.updated_at) && (
                <span className="text-gray-500 text-xs ml-2">(수정됨)</span>
              )}
            </p>
            {((post.tags && post.tags.length > 0) || isExcellentPost) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {isExcellentPost && (
                  <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <StarIcon />
                    우수 게시글
                  </span>
                )}
                {post.tags?.map(tag => (
                  <span key={tag} className="bg-purple-600/50 text-purple-200 text-xs font-medium px-2 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-gray-200 mt-6 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            <div className="mt-6 pt-4 border-t border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => togglePostLikeMutation.mutate()}
                  className={`flex items-center gap-2 text-lg font-semibold transition-colors duration-200 ${isPostLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
                >
                  <HeartIcon filled={isPostLiked} />
                  <span>{post.like_count || 0}</span>
                </button>
              </div>
              <button
                onClick={() => toggleBookmarkMutation.mutate()}
                className={`p-2 rounded-full transition-colors duration-200 ${isBookmarked ? 'text-yellow-400 bg-yellow-500/20' : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700/50'}`}
                aria-label={isBookmarked ? '북마크 해제' : '북마크'}
              >
                <BookmarkIcon filled={isBookmarked} />
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">댓글 ({totalComments})</h3>
          {isLoadingComments ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-400 text-sm">댓글을 불러오는 중...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commentsData && commentsData.comments.length > 0 ? (
                commentsData.comments.map(comment => renderComment(comment))
              ) : (
                <p className="text-gray-500 text-center py-4">아직 댓글이 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            rows={2}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-colors"
          />
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting || createCommentMutation.isPending}
            className="bg-purple-600 text-white font-bold px-4 rounded-md hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSubmitting || createCommentMutation.isPending ? <Spinner /> : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
);
const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0l-1.5-1.5a2 2 0 010-2.828l3-3zM11.5 6.5l-6 6V15h2.5l6-6-2.5-2.5z" />
  </svg>
);
const TrashIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
  </svg>
);
const HeartIcon = ({ filled = false, className = 'h-6 w-6' }: { filled?: boolean, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);
const SirenIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
  </svg>
);
const BookmarkIcon = ({ filled = false, className = 'h-6 w-6' }: { filled?: boolean, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.125L5 18V4z" />
  </svg>
);


export default PostDetailView;
