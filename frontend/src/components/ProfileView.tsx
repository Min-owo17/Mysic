

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UserProfile, View } from '../types';
import { instruments, allFeatures } from '../utils/constants';
import { commonStyles } from '../styles/commonStyles';

const CoffeeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a2 2 0 00-2 2v1h4V4a2 2 0 00-2-2z" />
      <path fillRule="evenodd" d="M4 6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 6a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
    </svg>
);

const ProfileView: React.FC = () => {
    const { userProfile, updateProfile } = useAppContext();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<UserProfile>({ features: [], ...userProfile });
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState(false);
    const instrumentDropdownRef = useRef<HTMLDivElement>(null);

    const [isFeatureDropdownOpen, setIsFeatureDropdownOpen] = useState(false);
    const [featureSearch, setFeatureSearch] = useState('');
    const featureDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Ensure form data is synced with global state, but don't keep password in form state
        const { password, ...profileData } = userProfile;
        setFormData({ features: [], ...profileData });
    }, [userProfile]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (instrumentDropdownRef.current && !instrumentDropdownRef.current.contains(event.target as Node)) {
                setIsInstrumentDropdownOpen(false);
            }
            if (featureDropdownRef.current && !featureDropdownRef.current.contains(event.target as Node)) {
                setIsFeatureDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleInstrumentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, instrument: e.target.value }));
        if (!isInstrumentDropdownOpen) {
            setIsInstrumentDropdownOpen(true);
        }
    };
    
    const handleInstrumentSelect = (instrument: string) => {
        setFormData(prev => ({ ...prev, instrument }));
        setIsInstrumentDropdownOpen(false);
    };

    const filteredInstruments = useMemo(() => {
        if (!formData.instrument) return instruments;
        return instruments.filter(inst =>
            inst.toLowerCase().includes(formData.instrument.toLowerCase())
        );
    }, [formData.instrument]);
    
    const handleAddFeature = (feature: string) => {
        if (!formData.features.includes(feature)) {
            setFormData(prev => ({ ...prev, features: [...prev.features, feature] }));
        }
        setFeatureSearch('');
    };

    const handleRemoveFeature = (featureToRemove: string) => {
        setFormData(prev => ({ ...prev, features: prev.features.filter(f => f !== featureToRemove) }));
    };
    
    const filteredFeatures = useMemo(() => {
        return allFeatures.filter(feature =>
            !formData.features.includes(feature) &&
            feature.toLowerCase().includes(featureSearch.toLowerCase())
        );
    }, [featureSearch, formData.features]);


    const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profilePicture: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const performSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            // Merge changes with the original userProfile to not lose email/password info
            const updatedProfile = { ...userProfile, ...formData };
            updateProfile(updatedProfile);
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 1000);
    };

    const handleSave = () => {
        performSave();
    };

    return (
        <div className="p-4 md:p-6 max-w-md md:max-w-2xl mx-auto animate-fade-in">
            <div className="relative mb-8 h-8">
                 <button 
                     onClick={() => navigate('/settings')}
                     className={`${commonStyles.iconButton} absolute right-0`}
                     aria-label="Settings"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                 </button>
            </div>


            <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                    <input
                        type="file"
                        id="profilePictureInput"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePictureChange}
                    />
                     <label htmlFor="profilePictureInput" className="cursor-pointer group">
                        <div className="relative w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-transparent">
                            {formData.profilePicture ? (
                                <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            )}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </label>
                </div>

                <div className="w-full space-y-4">
                    <div>
                        <label htmlFor="nickname" className={commonStyles.label}>닉네임</label>
                        <input
                            type="text"
                            id="nickname"
                            name="nickname"
                            value={formData.nickname}
                            onChange={handleChange}
                            className={commonStyles.textInputP3}
                        />
                    </div>

                    <div className="relative" ref={instrumentDropdownRef}>
                        <label htmlFor="instrument" className={commonStyles.label}>주요 악기</label>
                        <input
                            type="text"
                            id="instrument"
                            name="instrument"
                            value={formData.instrument}
                            onChange={handleInstrumentInputChange}
                            onFocus={() => setIsInstrumentDropdownOpen(true)}
                            placeholder="악기 검색..."
                            autoComplete="off"
                            className={commonStyles.textInputP3}
                        />
                         {isInstrumentDropdownOpen && (
                            <ul className="absolute z-30 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg animate-fade-in">
                                {filteredInstruments.length > 0 ? (
                                    filteredInstruments.map(inst => (
                                        <li
                                            key={inst}
                                            onClick={() => handleInstrumentSelect(inst)}
                                            className="px-4 py-2 text-sm text-gray-200 cursor-pointer hover:bg-purple-600 hover:text-white"
                                        >
                                            {inst}
                                        </li>
                                    ))
                                ) : (
                                    <li className="px-4 py-2 text-sm text-gray-400">결과 없음</li>
                                )}
                            </ul>
                        )}
                    </div>
                    
                    <div className="relative" ref={featureDropdownRef}>
                        <label htmlFor="features" className={commonStyles.label}>특징</label>
                        <div className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 focus-within:ring-2 focus-within:ring-purple-500 transition-colors flex flex-wrap gap-2 items-center">
                            {formData.features.map(feature => (
                                <span key={feature} className="bg-purple-600/50 text-purple-200 text-sm font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                    {feature}
                                    <button onClick={() => handleRemoveFeature(feature)} className="text-purple-200 hover:text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                id="features"
                                value={featureSearch}
                                onChange={(e) => setFeatureSearch(e.target.value)}
                                onFocus={() => setIsFeatureDropdownOpen(true)}
                                placeholder={formData.features.length === 0 ? "특징 검색 및 추가..." : ""}
                                autoComplete="off"
                                className="bg-transparent flex-1 focus:outline-none p-1 min-w-[120px]"
                            />
                        </div>
                        {isFeatureDropdownOpen && (
                            <ul className="absolute z-30 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg animate-fade-in">
                                {filteredFeatures.length > 0 ? (
                                    filteredFeatures.map(feature => (
                                        <li
                                            key={feature}
                                            onClick={() => handleAddFeature(feature)}
                                            className="px-4 py-2 text-sm text-gray-200 cursor-pointer hover:bg-purple-600 hover:text-white"
                                        >
                                            {feature}
                                        </li>
                                    ))
                                ) : (
                                     <li className="px-4 py-2 text-sm text-gray-400">결과 없음</li>
                                )}
                            </ul>
                        )}
                    </div>

                    <div>
                        <label htmlFor="title" className={commonStyles.label}>칭호</label>
                        <div className="relative">
                            <select
                                id="title"
                                name="title"
                                value={formData.title || ''}
                                onChange={handleChange}
                                className={`${commonStyles.textInputP3} appearance-none`}
                            >
                                <option value="">칭호 없음</option>
                                <option value="개발자에게 커피를 산">개발자에게 커피를 산</option>
                                <option value="Cello Maestro">Cello Maestro</option>
                                <option value="Jazz Legend">Jazz Legend</option>
                            </select>
                             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                         {formData.title && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                                <span className="font-semibold">현재 칭호:</span>
                                <span className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-300 font-bold px-2 py-0.5 rounded-full">
                                    {formData.title === '개발자에게 커피를 산' && <CoffeeIcon />}
                                    {formData.title}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full pt-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} py-3 flex items-center justify-center`}
                    >
                        {isSaving ? (
                            <>
                                <Spinner />
                                <span className="ml-2">저장 중...</span>
                            </>
                        ) : (
                            '저장'
                        )}
                    </button>
                    {showSuccess && (
                        <p className="text-green-400 text-center mt-4 text-sm animate-fade-in">
                            프로필이 성공적으로 저장되었습니다!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};


const Spinner = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
);

export default ProfileView;
