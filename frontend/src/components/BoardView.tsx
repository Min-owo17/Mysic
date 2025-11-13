
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BoardPost, UserProfile } from '../types';
import { useAppContext } from '../context/AppContext';
import CreatePostView from './CreatePostView';
import PostDetailView from './PostDetailView';
import { allFeatures, instruments } from '../utils/constants';
import { timeAgo } from '../utils/time';
import { commonStyles } from '../styles/commonStyles';

const defaultAvatar = (name: string): string => {
    const initial = (name.split(' ').map(n => n[0]).join('') || name[0]).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="20" fill="#6B7280" />
        <text x="50%" y="50%" dy=".1em" dominant-baseline="central" text-anchor="middle" font-size="16" font-family="sans-serif" fill="white" font-weight="bold">${initial}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};


const BoardView: React.FC = () => {
  const { 
    posts, addPost, updatePost, deletePost, 
    userProfile, userProfiles, 
    postNotifications, markPostNotificationsAsRead
  } = useAppContext();
  const [isWriting, setIsWriting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);
  const [editingPost, setEditingPost] = useState<BoardPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(userProfile.features || []);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // --- Report Modal State ---
  const [reportingPost, setReportingPost] = useState<BoardPost | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const reportReasons = ['분쟁 유발', '욕설/비방', '음란물', '광고/홍보성', '개인정보 유출', '기타'];


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
            setIsTagDropdownOpen(false);
        }
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setIsNotificationPanelOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCloseReportModal = () => {
    setReportingPost(null);
    setReportReason('');
    setReportDetails('');
  };

  const handleSubmitReport = () => {
    if (!reportReason || (reportReason === '기타' && !reportDetails.trim())) {
        return;
    }
    // Mock submission
    console.log({
        targetId: reportingPost?.id,
        targetType: 'post',
        reason: reportReason,
        details: reportDetails,
        reporter: userProfile.nickname,
        reportedAt: new Date().toISOString(),
    });
    handleCloseReportModal();
    setShowReportSuccess(true);
    setTimeout(() => setShowReportSuccess(false), 3000);
  };


  const handleSavePost = (postData: { title: string; content: string; tags: string[] }) => {
    addPost(postData);
    setIsWriting(false);
  };

  const handleUpdatePost = (postData: { title: string; content: string; tags: string[] }) => {
    if (editingPost) {
      updatePost(editingPost.id, postData);
      setEditingPost(null);
      // After editing, refresh the selected post to show updated data
      const updatedPost = posts.find(p => p.id === editingPost.id);
      if(updatedPost) {
          setSelectedPost({...updatedPost, ...postData});
      }
    }
  };

  const handleDeletePost = (postId: string) => {
      deletePost(postId);
      setSelectedPost(null);
  };

  const allAvailableTags = useMemo(() => {
    const tagsFromPosts = posts.flatMap(post => post.tags || []);
    return [...new Set(['우수 게시글', ...userProfile.features, ...tagsFromPosts, ...allFeatures, ...instruments])].sort();
  }, [posts, userProfile.features]);

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
        setSelectedTags(prev => [...prev, tag]);
    }
    setTagSearch('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagToRemove));
  };
  
  const filteredTags = useMemo(() => {
    return allAvailableTags.filter(tag =>
        !selectedTags.includes(tag) &&
        tag.toLowerCase().includes(tagSearch.toLowerCase())
    );
  }, [tagSearch, selectedTags, allAvailableTags]);


  const filteredAndSortedPosts = useMemo(() => {
    let filteredPosts = [...posts];
    
    if (showBookmarksOnly) {
        const bookmarkedIds = new Set(userProfile.bookmarkedPosts || []);
        return filteredPosts
            .filter(post => bookmarkedIds.has(post.id))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filteredPosts = filteredPosts.filter(post =>
        !post.isDeleted &&
        (post.title.toLowerCase().includes(lowercasedQuery) ||
        post.content.toLowerCase().includes(lowercasedQuery))
      );
    }

    if (selectedTags.length > 0) {
        const isExcellentFilterActive = selectedTags.includes('우수 게시글');
        const normalTags = selectedTags.filter(tag => tag !== '우수 게시글');

        filteredPosts = filteredPosts.filter(post => {
            if (post.isDeleted) {
                return false;
            }
            const excellentCondition = !isExcellentFilterActive || (post.likes && post.likes >= 30);
            const normalTagsCondition = normalTags.length === 0 || normalTags.every(tag => post.tags?.includes(tag));
            return excellentCondition && normalTagsCondition;
        });
    }

    const userFeaturesSet = new Set(userProfile.features);
    filteredPosts.sort((a, b) => {
      // Deleted posts go to the bottom
      if (a.isDeleted && !b.isDeleted) return 1;
      if (!a.isDeleted && b.isDeleted) return -1;
        
      const aIsPrioritized = selectedTags.length === 0 && (a.tags?.some(tag => userFeaturesSet.has(tag)) ?? false);
      const bIsPrioritized = selectedTags.length === 0 && (b.tags?.some(tag => userFeaturesSet.has(tag)) ?? false);

      if (aIsPrioritized && !bIsPrioritized) return -1;
      if (!aIsPrioritized && bIsPrioritized) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filteredPosts;
  }, [posts, searchQuery, selectedTags, userProfile.features, showBookmarksOnly, userProfile.bookmarkedPosts]);

  const unreadCount = useMemo(() => postNotifications.filter(n => !n.read).length, [postNotifications]);

  const handleToggleNotifications = () => {
      setIsNotificationPanelOpen(prev => {
          if (!prev && unreadCount > 0) {
              markPostNotificationsAsRead();
          }
          return !prev;
      });
  };

  const handlePostNotificationClick = (postId: string) => {
      const post = posts.find(p => p.id === postId);
      if (post) {
          setSelectedPost(post);
          setIsNotificationPanelOpen(false);
      }
  };

  const getProfile = (name: string): Partial<UserProfile> => {
    if (name === userProfile.nickname) return userProfile;
    return userProfiles[name] || {};
  };

  if (editingPost) {
    return <CreatePostView postToEdit={editingPost} onSave={handleUpdatePost} onCancel={() => setEditingPost(null)} />;
  }
  if (isWriting) {
    return <CreatePostView onSave={handleSavePost} onCancel={() => setIsWriting(false)} />;
  }
  
  if (selectedPost) {
    const currentPost = posts.find(p => p.id === selectedPost.id) ?? selectedPost;
    return <PostDetailView
      post={currentPost}
      onBack={() => setSelectedPost(null)}
      onEditRequest={(postToEdit) => {
        setSelectedPost(null);
        setEditingPost(postToEdit);
      }}
      onDeleteRequest={handleDeletePost}
    />;
  }


  return (
    <div className={commonStyles.pageContainerFullHeight}>
       {reportingPost && (
         <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
            <div className={`${commonStyles.modalContainer} p-6`}>
                <h3 className="text-xl font-bold text-red-400 mb-4">게시물 신고</h3>
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
                        className={`${commonStyles.textInputDarkerP3} mt-3 resize-none`}
                    />
                )}
                <div className="flex gap-4 mt-6">
                    <button onClick={handleCloseReportModal} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
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

       <div className="relative mb-4 h-8">
            <div className="absolute top-0 left-0">
                 <button
                    onClick={() => {
                        setShowBookmarksOnly(prev => !prev);
                        if (!showBookmarksOnly) { // Entering bookmark view
                            setSearchQuery('');
                            setSelectedTags([]);
                        }
                    }}
                    className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${showBookmarksOnly ? 'text-purple-400 bg-gray-700/50' : 'text-gray-400'}`}
                    aria-label="북마크 보기"
                >
                    <BookmarkIcon filled={showBookmarksOnly} />
                </button>
            </div>
            <div className="absolute right-0" ref={notificationRef}>
                <button
                    onClick={handleToggleNotifications}
                    className={`${commonStyles.iconButton} relative`}
                    aria-label="알림"
                >
                    <BellIcon />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-900 animate-pulse"></span>
                    )}
                </button>
                {isNotificationPanelOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 animate-fade-in">
                        <div className={`p-3 border-b ${commonStyles.divider}`}>
                            <h3 className="font-semibold text-white">알림</h3>
                        </div>
                        <ul className="max-h-96 overflow-y-auto">
                            {postNotifications.length > 0 ? (
                                postNotifications.map(notif => (
                                    <li key={notif.id} className="border-b border-gray-700/50 last:border-b-0">
                                        <button onClick={() => handlePostNotificationClick(notif.postId!)} className="w-full text-left px-4 py-3 hover:bg-gray-700/50 transition-colors">
                                            <p className="text-sm text-gray-200">
                                                <span className="font-bold text-purple-300">{notif.commenter}</span>님이{' '}
                                                {notif.type === 'reply' ? '회원님의 댓글에 답글을 남겼습니다.' : <><span className="font-bold text-purple-300 truncate inline-block max-w-[120px] align-bottom">'{notif.postTitle}'</span> 글에 댓글을 남겼습니다.</>}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">{timeAgo(notif.createdAt)}</p>
                                        </button>
                                    </li>
                                ))
                            ) : (
                                <li className="p-4 text-center text-sm text-gray-500">
                                    새로운 알림이 없습니다.
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>

      {showBookmarksOnly ? (
         <div className="mb-4">
             <h1 className={commonStyles.mainTitle}>북마크한 게시물</h1>
         </div>
      ) : (
        <div className="mb-4 space-y-3">
          <div className="relative">
              <input
                  type="text"
                  placeholder="게시물 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`${commonStyles.textInputP3} pl-10`}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
          </div>

          <div className="relative" ref={tagDropdownRef}>
            <div 
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 focus-within:ring-2 focus-within:ring-purple-500 transition-colors flex flex-wrap gap-2 items-center"
            >
                {selectedTags.map(tag => (
                    <span key={tag} className="bg-purple-600/50 text-purple-200 text-sm font-medium pl-2 pr-1 py-1 rounded-full flex items-center gap-1">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="text-purple-200 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    id="tag-filter"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onFocus={() => setIsTagDropdownOpen(true)}
                    placeholder={selectedTags.length === 0 ? "태그 검색 및 추가..." : ""}
                    autoComplete="off"
                    className="bg-transparent flex-1 focus:outline-none p-1 min-w-[120px]"
                />
            </div>
            {isTagDropdownOpen && (
                <ul className="absolute z-30 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg animate-fade-in">
                    {filteredTags.length > 0 ? (
                        filteredTags.map(tag => (
                            <li
                                key={tag}
                                onClick={() => handleAddTag(tag)}
                                className="px-4 py-2 text-sm text-gray-200 cursor-pointer hover:bg-purple-600 hover:text-white"
                            >
                                {tag}
                            </li>
                        ))
                    ) : (
                         <li className="px-4 py-2 text-sm text-gray-400">결과 없음</li>
                    )}
                </ul>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 -mr-2">
        {filteredAndSortedPosts.length > 0 ? (
          filteredAndSortedPosts.map(post => {
            if (post.isDeleted) {
                return (
                    <div key={post.id} className={`${commonStyles.card} opacity-60`}>
                        <h2 className="text-lg font-bold text-gray-500 italic">{post.title}</h2>
                        <p className="text-gray-400 mt-2">{post.content}</p>
                    </div>
                );
            }

            const isRecommended = selectedTags.length === 0 && post.tags?.some(tag => userProfile.features.includes(tag));
            const totalComments = (post.comments || []).reduce((count, comment) => {
              return count + 1 + (comment.replies?.length || 0);
            }, 0);
            
            const authorProfile = getProfile(post.author);
            const isExcellentPost = post.likes && post.likes >= 30;

            return (
              <div 
                key={post.id} 
                className={`${commonStyles.cardHover} cursor-pointer`}
                onClick={() => setSelectedPost(post)}
              >
                <div className="relative">
                  {isRecommended && !showBookmarksOnly && (
                    <div className="absolute top-0 right-0 flex items-center bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full">
                      <StarIcon />
                      <span className="ml-1">맞춤</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                      <img src={authorProfile?.profilePicture || defaultAvatar(post.author)} alt={post.author} className="w-9 h-9 rounded-full bg-gray-700" />
                      <div>
                          <p className="font-semibold text-gray-200 leading-tight">{post.author}</p>
                          {authorProfile?.title && <p className="text-xs text-yellow-300 leading-tight">{authorProfile.title}</p>}
                      </div>
                  </div>
                  <h2 className="text-lg font-bold text-purple-300 mt-1 pr-16">{post.title}</h2>
                </div>
                <p className="text-gray-300 mt-2 line-clamp-2">{post.content}</p>
                {((post.tags && post.tags.length > 0) || isExcellentPost) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {isExcellentPost && (
                            <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <StarIcon />
                                우수 게시글
                            </span>
                        )}
                        {post.tags?.map(tag => (
                            <span key={tag} className={commonStyles.tag}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
                 <div className={`flex items-center gap-4 mt-4 pt-3 ${commonStyles.divider}/50 text-sm text-gray-400`}>
                    <span className="flex items-center gap-1.5">
                      <HeartIcon />
                      {post.likes || 0}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CommentIcon />
                      {totalComments}
                    </span>
                    <div className="flex-grow" />
                    {post.author !== userProfile.nickname && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setReportingPost(post);
                            }}
                            className="text-gray-500 hover:text-red-400"
                            aria-label="게시물 신고"
                        >
                            <SirenIcon />
                        </button>
                    )}
                  </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>{showBookmarksOnly ? "북마크한 게시물이 없습니다." : "조건에 맞는 게시물이 없습니다."}</p>
          </div>
        )}
      </div>
      
       <div className={`mt-4 pt-4 ${commonStyles.divider}`}>
        <button 
          onClick={() => setIsWriting(true)}
          className={`${commonStyles.buttonBase} ${commonStyles.indigoButton} py-3 flex items-center justify-center gap-2`}
        >
          <PencilIcon />
          새 게시물 작성
        </button>
      </div>
    </div>
  );
};

// SVG Icons
const BookmarkIcon = ({ filled = false, className = 'h-6 w-6' }: { filled?: boolean, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.125L5 18V4z" />
    </svg>
);
const SirenIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
    </svg>
);
const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);
const StarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);
const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
  </svg>
);
const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);
const CommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
  </svg>
);

export default BoardView;
