
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BoardPost } from '../types';
import { useAppContext } from '../context/AppContext';
import { allFeatures, instruments } from '../utils/constants';
import { commonStyles } from '../styles/commonStyles';

interface CreatePostViewProps {
    postToEdit?: BoardPost;
    onSave: (postData: { title: string; content: string; tags: string[] }) => void;
    onCancel: () => void;
}

const CreatePostView: React.FC<CreatePostViewProps> = ({ postToEdit, onSave, onCancel }) => {
    const { userProfile } = useAppContext();
    const [title, setTitle] = useState(postToEdit?.title || '');
    const [content, setContent] = useState(postToEdit?.content || '');
    const [tags, setTags] = useState(postToEdit?.tags || userProfile.features || []);

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
            onSave({ title, content, tags });
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
                    <label htmlFor="tags" className={commonStyles.label}>태그</label>
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
