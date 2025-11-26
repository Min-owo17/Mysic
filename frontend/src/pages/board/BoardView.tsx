import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import CreatePostView from './CreatePostView';
import PostDetailView from './PostDetailView';
import { boardApi, Post } from '../../services/api/board';
import { instrumentsApi } from '../../services/api/instruments';
import { userTypesApi } from '../../services/api/userTypes';
import { timeAgo } from '../../utils/time';
import { defaultAvatar } from '../../utils/avatar';
import { commonStyles } from '../../styles/commonStyles';
import toast from 'react-hot-toast';

const BoardView: React.FC = () => {
  const { 
    userProfile, userProfiles, 
    postNotifications, markPostNotificationsAsRead
  } = useAppContext();
  const queryClient = useQueryClient();
  
  const [isWriting, setIsWriting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [page, setPage] = useState(1);

  // --- Report Modal State ---
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const reportReasons = ['분쟁 유발', '욕설/비방', '음란물', '광고/홍보성', '개인정보 유출', '기타'];

  // 게시글 목록 조회
  const { data: postsData, isLoading, error } = useQuery({
    queryKey: ['board', 'posts', page, searchQuery, selectedCategory, selectedTags],
    queryFn: () => boardApi.getPosts({
      page,
      page_size: 20,
      category: selectedCategory || undefined,
      tag: selectedTags.length > 0 ? selectedTags[0] : undefined, // 첫 번째 태그만 사용
      search: searchQuery || undefined,
    }),
    staleTime: 2 * 60 * 1000, // 2분
  });

  // 게시글 삭제 Mutation
  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => boardApi.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', 'posts'] });
      toast.success('게시글이 삭제되었습니다.');
      setSelectedPost(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '게시글 삭제에 실패했습니다.');
    },
  });

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
        targetId: reportingPost?.post_id,
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

  const handleSavePost = async (postData: { title: string; content: string; tags: string[]; category?: string }) => {
    try {
      await boardApi.createPost({
        title: postData.title,
        content: postData.content,
        category: postData.category || 'general',
        manual_tags: postData.tags.length > 0 ? postData.tags : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['board', 'posts'] });
      toast.success('게시글이 작성되었습니다.');
      setIsWriting(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '게시글 작성에 실패했습니다.');
    }
  };

  const handleUpdatePost = async (postData: { title: string; content: string; tags: string[]; category?: string }) => {
    if (!editingPost) return;
    
    try {
      await boardApi.updatePost(editingPost.post_id, {
        title: postData.title,
        content: postData.content,
        category: postData.category || editingPost.category,
        manual_tags: postData.tags.length > 0 ? postData.tags : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['board', 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['board', 'post', editingPost.post_id] });
      toast.success('게시글이 수정되었습니다.');
      setEditingPost(null);
      setSelectedPost(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '게시글 수정에 실패했습니다.');
    }
  };

  const handleDeletePost = (postId: number) => {
    deletePostMutation.mutate(postId);
  };

  // instruments 목록 조회
  const { data: instrumentsData } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => instrumentsApi.getInstruments(),
    staleTime: 30 * 60 * 1000, // 30분
  });

  // user_types 목록 조회
  const { data: userTypesData } = useQuery({
    queryKey: ['userTypes'],
    queryFn: () => userTypesApi.getUserTypes(),
    staleTime: 30 * 60 * 1000, // 30분
  });

  // 한글 가나다 순 정렬 함수
  const sortKorean = (a: string, b: string): number => {
    return a.localeCompare(b, 'ko-KR');
  };

  // 모든 태그 수집 및 정렬 (우선순위: 우수 게시글 > instruments > user_types, 각 그룹 내 가나다 순)
  const allAvailableTags = useMemo(() => {
    // '우수 게시글'
    const excellentTag = ['우수 게시글'];
    
    // instruments (가나다 순)
    const instrumentTags = instrumentsData 
      ? instrumentsData.map(inst => inst.name).sort(sortKorean)
      : [];
    
    // user_types (가나다 순)
    const userTypeTags = userTypesData
      ? userTypesData.map(ut => ut.name).sort(sortKorean)
      : [];
    
    // 우선순위 순서로 합치기
    return [...excellentTag, ...instrumentTags, ...userTypeTags];
  }, [instrumentsData, userTypesData]);

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

  // 필터링 및 정렬된 게시글
  const filteredAndSortedPosts = useMemo(() => {
    if (!postsData?.posts) return [];
    
    let filteredPosts = [...postsData.posts];
    
    // 북마크 필터는 나중에 구현 (현재는 API에 없음)
    if (showBookmarksOnly) {
      return [];
    }

    // 태그 필터링 (백엔드에서 이미 처리되지만, 프론트엔드에서도 추가 필터링 가능)
    if (selectedTags.length > 0) {
      const isExcellentFilterActive = selectedTags.includes('우수 게시글');
      const normalTags = selectedTags.filter(tag => tag !== '우수 게시글');

      filteredPosts = filteredPosts.filter(post => {
        const excellentCondition = !isExcellentFilterActive || post.like_count >= 30;
        const allPostTags = post.tags || [];
        const normalTagsCondition = normalTags.length === 0 || normalTags.every(tag => allPostTags.includes(tag));
        return excellentCondition && normalTagsCondition;
      });
    }

    // 맞춤 게시글 우선 정렬
    const userFeaturesSet = new Set(userProfile.features);
    filteredPosts.sort((a, b) => {
      const aTags = a.tags || [];
      const bTags = b.tags || [];
      
      const aIsPrioritized = selectedTags.length === 0 && aTags.some(tag => userFeaturesSet.has(tag));
      const bIsPrioritized = selectedTags.length === 0 && bTags.some(tag => userFeaturesSet.has(tag));

      if (aIsPrioritized && !bIsPrioritized) return -1;
      if (!aIsPrioritized && bIsPrioritized) return 1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filteredPosts;
  }, [postsData, selectedTags, userProfile.features, showBookmarksOnly]);

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
      // API에서 게시글 조회
      const postIdNum = parseInt(postId, 10);
      if (!isNaN(postIdNum)) {
        boardApi.getPost(postIdNum).then(post => {
          setSelectedPost(post);
          setIsNotificationPanelOpen(false);
        });
      }
  };

  const getProfile = (nickname: string) => {
    if (nickname === userProfile.nickname) return userProfile;
    return userProfiles[nickname] || {};
  };

  if (editingPost) {
    return <CreatePostView 
      postToEdit={editingPost} 
      onSave={handleUpdatePost} 
      onCancel={() => setEditingPost(null)} 
    />;
  }
  if (isWriting) {
    return <CreatePostView 
      onSave={handleSavePost} 
      onCancel={() => setIsWriting(false)} 
    />;
  }
  
  if (selectedPost) {
    return <PostDetailView
      post={selectedPost}
      onBack={() => setSelectedPost(null)}
      onEditRequest={(postToEdit) => {
        setSelectedPost(null);
        setEditingPost(postToEdit);
      }}
      onDeleteRequest={(postId) => handleDeletePost(postId)}
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
                        if (!showBookmarksOnly) {
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

          {/* 카테고리 필터 */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-md text-sm ${selectedCategory === '' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              전체
            </button>
            <button
              onClick={() => setSelectedCategory('tip')}
              className={`px-3 py-1 rounded-md text-sm ${selectedCategory === 'tip' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              팁
            </button>
            <button
              onClick={() => setSelectedCategory('question')}
              className={`px-3 py-1 rounded-md text-sm ${selectedCategory === 'question' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              질문
            </button>
            <button
              onClick={() => setSelectedCategory('free')}
              className={`px-3 py-1 rounded-md text-sm ${selectedCategory === 'free' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              자유
            </button>
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
      
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 -mr-2 pb-24 md:pb-20">
        {isLoading ? (
          <div className="text-center py-10 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4">게시글을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-400">
            <p>게시글을 불러오는 중 오류가 발생했습니다.</p>
          </div>
        ) : filteredAndSortedPosts.length > 0 ? (
          filteredAndSortedPosts.map(post => {
            const isRecommended = selectedTags.length === 0 && post.tags?.some(tag => userProfile.features.includes(tag));
            const authorProfile = getProfile(post.author.nickname);
            const isExcellentPost = post.like_count >= 30;

            return (
              <div 
                key={post.post_id} 
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
                      <img src={post.author.profile_image_url || defaultAvatar(post.author.nickname)} alt={post.author.nickname} className="w-9 h-9 rounded-full bg-gray-700" />
                      <div>
                          <p className="font-semibold text-gray-200 leading-tight">{post.author.nickname}</p>
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
                      {post.like_count || 0}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CommentIcon />
                      {post.view_count || 0}
                    </span>
                    <div className="flex-grow" />
                    {post.author.nickname !== userProfile.nickname && (
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
      
       {/* 고정된 게시물 작성 버튼 - 모바일: BottomNavBar 위, 데스크톱: 화면 하단 */}
       <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-64 z-30 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:border-t-0 shadow-lg md:shadow-none">
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto p-4 md:p-6">
          <button 
            onClick={() => setIsWriting(true)}
            className={`${commonStyles.buttonBase} ${commonStyles.indigoButton} py-3 flex items-center justify-center gap-2 w-full`}
          >
            <PencilIcon />
            새 게시물 작성
          </button>
        </div>
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
