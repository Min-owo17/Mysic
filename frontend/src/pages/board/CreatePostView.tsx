import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { allFeatures, instruments } from '../../utils/constants';
import { commonStyles } from '../../styles/commonStyles';
import { Post } from '../../services/api/board';
import { usersApi } from '../../services/api/users';
import { UserDetailResponse } from '../../types';

interface CreatePostViewProps {
    postToEdit?: Post;
    onSave: (postData: { title: string; content: string; tags: string[]; category?: string }) => void;
    onCancel: () => void;
}

const CreatePostView: React.FC<CreatePostViewProps> = ({ postToEdit, onSave, onCancel }) => {
    const { userProfile } = useAppContext();
    const [title, setTitle] = useState(postToEdit?.title || '');
    const [content, setContent] = useState(postToEdit?.content || '');
    const [category, setCategory] = useState(postToEdit?.category || 'general');
    const [tags, setTags] = useState<string[]>(postToEdit?.tags || []);

    // 사용자 프로필 정보 조회 (자동 태그 생성을 위해)
    const { data: profileData } = useQuery<UserDetailResponse>({
        queryKey: ['userProfile'],
        queryFn: () => usersApi.getMyProfile(),
        enabled: !postToEdit, // 수정 모드가 아닐 때만 조회
    });

    // 새로운 게시물 작성 시 프로필 정보 기반으로 자동 태그 설정
    useEffect(() => {
        if (!postToEdit && profileData?.profile) {
            const autoTags: string[] = [];
            
            // 주요 악기 추가
            const primaryInstrument = profileData.profile.instruments.find(i => i.is_primary);
            if (primaryInstrument?.instrument_name) {
                autoTags.push(primaryInstrument.instrument_name);
            }
            
            // 특징(사용자 타입) 추가
            profileData.profile.user_types.forEach(userType => {
                if (userType.user_type_name && !autoTags.includes(userType.user_type_name)) {
                    autoTags.push(userType.user_type_name);
                }
            });
            
            // 기존 태그와 병합 (중복 제거)
            if (autoTags.length > 0) {
                setTags(prevTags => {
                    const merged = [...new Set([...autoTags, ...prevTags])];
                    return merged;
                });
            }
        }
    }, [profileData, postToEdit]);

    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const tagDropdownRef = useRef<HTMLDivElement>(null);

    const allAvailableTags = useMemo(() => [...allFeatures, ...instruments].sort(), []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
                setIsTagDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAddTag = (tag: string) => {
        if (!tags.includes(tag)) {
            setTags(prev => [...prev, tag]);
        }
        setTagSearch('');
        setIsTagDropdownOpen(false);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(prev => prev.filter(t => t !== tagToRemove));
    };

    const filteredTags = useMemo(() => {
        return allAvailableTags.filter(tag =>
            !tags.includes(tag) &&
            tag.toLowerCase().includes(tagSearch.toLowerCase())
        );
    }, [tagSearch, tags, allAvailableTags]);

    const handleSaveClick = () => {
        if (title.trim() && content.trim()) {
            onSave({ title, content, tags, category });
        }
    };
    
    const isSaveDisabled = !title.trim() || !content.trim();

    return (
        <div className={`${commonStyles.pageContainerFullHeight} animate-fade-in`}>
            <div className="flex items-center mb-6">
                 <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-700 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-3xl font-bold text-purple-300">{postToEdit ? '게시물 수정' : '새 게시물'}</h1>
            </div>

            <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-2">
                <div>
                    <label htmlFor="title" className={commonStyles.label}>제목</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={commonStyles.textInputP3}
                        placeholder="게시물 제목을 입력하세요"
                    />
                </div>

                <div>
                    <label htmlFor="category" className={commonStyles.label}>카테고리</label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={commonStyles.textInputP3}
                    >
                        <option value="general">일반</option>
                        <option value="tip">팁</option>
                        <option value="question">질문</option>
                        <option value="free">자유</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="content" className={commonStyles.label}>본문</label>
                    <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={8}
                        className={`${commonStyles.textInputP3} resize-none`}
                        placeholder="내용을 입력하세요..."
                    />
                </div>

                <div className="relative" ref={tagDropdownRef}>
                    <label htmlFor="tags" className={commonStyles.label}>태그 (선택사항)</label>
                    <p className="text-xs text-gray-400 mb-2">작성자의 악기와 특징은 자동으로 태그로 추가됩니다.</p>
                    <div className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 focus-within:ring-2 focus-within:ring-purple-500 transition-colors flex flex-wrap gap-2 items-center">
                        {tags.map(tag => (
                            <span key={tag} className="bg-purple-600/50 text-purple-200 text-sm font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="text-purple-200 hover:text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            id="tags"
                            value={tagSearch}
                            onChange={(e) => setTagSearch(e.target.value)}
                            onFocus={() => setIsTagDropdownOpen(true)}
                            placeholder={tags.length < 5 ? "태그 검색 및 추가..." : ""}
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
            
            <div className="flex gap-4 pt-4 mt-auto">
                <button onClick={onCancel} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} py-3`}>취소</button>
                <button onClick={handleSaveClick} disabled={isSaveDisabled} className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} py-3`}>
                    {postToEdit ? '수정 완료' : '작성 완료'}
                </button>
            </div>
        </div>
    );
};

export default CreatePostView;
