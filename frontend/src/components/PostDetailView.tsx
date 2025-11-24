import React, { useState } from 'react';
import { BoardPost, Comment, UserProfile } from '../types';
import { useAppContext } from '../context/AppContext';
import { commonStyles } from '../styles/commonStyles';

interface PostDetailViewProps {
  post: BoardPost;
  onBack: () => void;
  onEditRequest: (post: BoardPost) => void;
  onDeleteRequest: (postId: string) => void;
}

const defaultAvatar = (name: string): string => {
    const initial = (name.split(' ').map(n => n[0]).join('') || name[0]).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="20" fill="#6B7280" />
        <text x="50%" y="50%" dy=".1em" dominant-baseline="central" text-anchor="middle" font-size="16" font-family="sans-serif" fill="white" font-weight="bold">${initial}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const StarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const PostDetailView: React.FC<PostDetailViewProps> = ({ post, onBack, onEditRequest, onDeleteRequest }) => {
  const { userProfile, userProfiles, addComment, addReply, togglePostLike, toggleCommentLike, togglePostBookmark } = useAppContext();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  
  // --- Report Modal State ---
  const [reportingItem, setReportingItem] = useState<{ id: string; type: 'post' | 'comment' } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const reportReasons = ['분쟁 유발', '욕설/비방', '음란물', '광고/홍보성', '개인정보 유출', '기타'];

  const isAuthor = post.author === userProfile.nickname;
  const isPostLiked = post.likedBy?.includes(userProfile.nickname) ?? false;
  const isBookmarked = userProfile.bookmarkedPosts?.includes(post.id) ?? false;
  
  const totalComments = (post.comments || []).reduce((count, comment) => {
    return count + 1 + (comment.replies?.length || 0);
  }, 0);

  const getProfile = (name: string): Partial<UserProfile> => {
    if (name === userProfile.nickname) return userProfile;
    return userProfiles[name] || {};
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
        addComment(post.id, { content: newComment });
        setNewComment('');
        setIsSubmitting(false);
    }, 300);
  };
  
  const handleSubmitReply = (parentCommentId: string) => {
    if (!replyContent.trim()) return;
    addReply(post.id, parentCommentId, { content: replyContent });
    setReplyContent('');
    setReplyingTo(null);
  }

  const handleDeleteConfirm = () => {
    onDeleteRequest(post.id);
    setShowDeleteConfirm(false);
  };

  const handleCloseReportModal = () => {
    setReportingItem(null);
    setReportReason('');
    setReportDetails('');
  };

  const handleSubmitReport = () => {
    if (!reportReason || (reportReason === '기타' && !reportDetails.trim())) {
        return;
    }
    // Mock submission
    console.log({
        targetId: reportingItem?.id,
        targetType: reportingItem?.type,
        reason: reportReason,
        details: reportDetails,
        reporter: userProfile.nickname,
        reportedAt: new Date().toISOString(),
    });
    handleCloseReportModal();
    setShowReportSuccess(true);
    setTimeout(() => setShowReportSuccess(false), 3000);
  };


  const authorProfile = getProfile(post.author);
  const isExcellentPost = post.likes && post.likes >= 30;

  return (
    <div className="p-4 md:p-6 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto h-full flex flex-col animate-fade-in">
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
                        onClick={handleDeleteConfirm}
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
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold text-purple-300 flex-1 pr-4">{post.title}</h2>
              {!post.isDeleted && (
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
                      <button onClick={() => setReportingItem({ id: post.id, type: 'post' })} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-full transition-colors" aria-label="게시물 신고">
                          <SirenIcon />
                      </button>
                    )}
                  </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <img src={authorProfile?.profilePicture || defaultAvatar(post.author)} alt={post.author} className="w-10 h-10 rounded-full bg-gray-700" />
              <div>
                  <p className="font-semibold text-gray-200">{post.author}</p>
                  {authorProfile?.title && <p className="text-xs text-yellow-300">{authorProfile.title}</p>}
              </div>
            </div>
          <p className="text-xs text-gray-400 mt-2">
            {new Date(post.createdAt).toLocaleDateString('ko-KR')}
            {post.updatedAt && <span className="text-gray-500 text-xs ml-2">(수정됨)</span>}
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
           {!post.isDeleted && (
             <div className="mt-6 pt-4 border-t border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => togglePostLike(post.id)} className={`flex items-center gap-2 text-lg font-semibold transition-colors duration-200 ${isPostLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}>
                      <HeartIcon filled={isPostLiked} />
                      <span>{post.likes || 0}</span>
                    </button>
                </div>
                <button 
                  onClick={() => togglePostBookmark(post.id)} 
                  className={`p-2 rounded-full transition-colors duration-200 ${isBookmarked ? 'text-yellow-400 bg-yellow-500/20' : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700/50'}`} 
                  aria-label={isBookmarked ? '북마크 해제' : '북마크'}>
                    <BookmarkIcon filled={isBookmarked} />
                </button>
              </div>
            )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">댓글 ({totalComments})</h3>
          <div className="space-y-4">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map(comment => {
                 const isCommentLiked = comment.likedBy?.includes(userProfile.nickname) ?? false;
                 const commentAuthorProfile = getProfile(comment.author);
                 return (
                    <div key={comment.id}>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <img src={commentAuthorProfile?.profilePicture || defaultAvatar(comment.author)} alt={comment.author} className="w-8 h-8 rounded-full bg-gray-700" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-purple-300 text-sm">{comment.author}</p>
                                        {commentAuthorProfile?.title && <p className="text-xs text-yellow-300 font-normal">{commentAuthorProfile.title}</p>}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{new Date(comment.createdAt).toLocaleString('ko-KR', { year:'numeric', month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyContent(''); }} className="text-xs text-gray-400 hover:text-white font-semibold">답글</button>
                                  <button onClick={() => toggleCommentLike(post.id, comment.id)} className={`flex items-center gap-1.5 text-sm transition-colors duration-200 ${isCommentLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}>
                                      <HeartIcon filled={isCommentLiked} className="h-4 w-4" />
                                      <span>{comment.likes || 0}</span>
                                  </button>
                                  {comment.author !== userProfile.nickname && (
                                    <button onClick={() => setReportingItem({ id: comment.id, type: 'comment' })} className="text-gray-500 hover:text-red-400" aria-label="댓글 신고">
                                        <SirenIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                            </div>
                            <p className="text-gray-300 mt-2 pl-11">{comment.content}</p>
                        </div>
                        
                        {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-700/50 pl-4">
                                {comment.replies.map(reply => {
                                    const isReplyLiked = reply.likedBy?.includes(userProfile.nickname) ?? false;
                                    const replyAuthorProfile = getProfile(reply.author);
                                    return (
                                        <div key={reply.id} className="bg-gray-800/30 p-3 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                  <img src={replyAuthorProfile?.profilePicture || defaultAvatar(reply.author)} alt={reply.author} className="w-6 h-6 rounded-full bg-gray-700" />
                                                  <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-purple-300 text-sm">{reply.author}</p>
                                                        {replyAuthorProfile?.title && <p className="text-xs text-yellow-300 font-normal">{replyAuthorProfile.title}</p>}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5">{new Date(reply.createdAt).toLocaleString('ko-KR', { year:'numeric', month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => toggleCommentLike(post.id, reply.id)} className={`flex items-center gap-1.5 text-sm transition-colors duration-200 ${isReplyLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}>
                                                        <HeartIcon filled={isReplyLiked} className="h-4 w-4" />
                                                        <span>{reply.likes || 0}</span>
                                                    </button>
                                                    {reply.author !== userProfile.nickname && (
                                                        <button onClick={() => setReportingItem({ id: reply.id, type: 'comment' })} className="text-gray-500 hover:text-red-400" aria-label="답글 신고">
                                                            <SirenIcon className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-gray-300 mt-2 text-sm pl-8">{reply.content}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {replyingTo === comment.id && (
                           <div className="ml-8 mt-3 pl-4 border-l-2 border-gray-700/50">
                             <div className="flex gap-2">
                               <textarea
                                 value={replyContent}
                                 onChange={(e) => setReplyContent(e.target.value)}
                                 placeholder={`${comment.author}님에게 답글 남기기...`}
                                 rows={2}
                                 autoFocus
                                 className="flex-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-colors"
                               />
                               <button
                                 onClick={() => handleSubmitReply(comment.id)}
                                 disabled={!replyContent.trim()}
                                 className="bg-purple-600 text-white font-bold px-3 text-sm rounded-md hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors"
                               >
                                 등록
                               </button>
                             </div>
                           </div>
                        )}
                    </div>
                 );
              })
            ) : (
              <p className="text-gray-500 text-center py-4">아직 댓글이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {!post.isDeleted && (
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
              disabled={!newComment.trim() || isSubmitting}
              className="bg-purple-600 text-white font-bold px-4 rounded-md hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isSubmitting ? <Spinner /> : '등록'}
            </button>
          </div>
        </div>
      )}
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
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
