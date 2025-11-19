import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserDetailResponse,
  InstrumentResponse,
  UserTypeResponse,
  UpdateProfileRequest,
  UpdateInstrumentsRequest,
  UpdateUserTypesRequest,
} from '../types';
import { usersApi } from '../services/api/users';
import { instrumentsApi } from '../services/api/instruments';
import { userTypesApi } from '../services/api/userTypes';
import { commonStyles } from '../styles/commonStyles';

const CoffeeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 2a2 2 0 00-2 2v1h4V4a2 2 0 00-2-2z" />
    <path fillRule="evenodd" d="M4 6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 6a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
  </svg>
);

const ProfileView: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 프로필 데이터 조회
  const { data: profileData, isLoading: isLoadingProfile } = useQuery<UserDetailResponse>({
    queryKey: ['userProfile'],
    queryFn: () => usersApi.getMyProfile(),
  });

  // 악기 목록 조회
  const { data: instruments = [] } = useQuery<InstrumentResponse[]>({
    queryKey: ['instruments'],
    queryFn: () => instrumentsApi.getInstruments(),
  });

  // 특징 목록 조회
  const { data: userTypes = [] } = useQuery<UserTypeResponse[]>({
    queryKey: ['userTypes'],
    queryFn: () => userTypesApi.getUserTypes(),
  });

  // 폼 상태
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<number[]>([]);
  const [primaryInstrumentId, setPrimaryInstrumentId] = useState<number | null>(null);
  const [selectedUserTypes, setSelectedUserTypes] = useState<number[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // 검색 및 드롭다운 상태
  const [instrumentSearch, setInstrumentSearch] = useState('');
  const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState(false);
  const instrumentDropdownRef = useRef<HTMLDivElement>(null);

  const [userTypeSearch, setUserTypeSearch] = useState('');
  const [isUserTypeDropdownOpen, setIsUserTypeDropdownOpen] = useState(false);
  const userTypeDropdownRef = useRef<HTMLDivElement>(null);

  // 프로필 데이터가 로드되면 폼 상태 업데이트
  useEffect(() => {
    if (profileData) {
      setNickname(profileData.nickname || '');
      setBio(profileData.profile?.bio || '');
      setHashtags(profileData.profile?.hashtags || []);
      setProfileImageUrl(profileData.profile_image_url || null);
      
      // 악기 정보
      const instrumentIds = profileData.profile?.instruments.map(i => i.instrument_id) || [];
      setSelectedInstruments(instrumentIds);
      const primary = profileData.profile?.instruments.find(i => i.is_primary);
      setPrimaryInstrumentId(primary?.instrument_id || null);

      // 특징 정보
      const userTypeIds = profileData.profile?.user_types.map(t => t.user_type_id) || [];
      setSelectedUserTypes(userTypeIds);
    }
  }, [profileData]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (instrumentDropdownRef.current && !instrumentDropdownRef.current.contains(event.target as Node)) {
        setIsInstrumentDropdownOpen(false);
      }
      if (userTypeDropdownRef.current && !userTypeDropdownRef.current.contains(event.target as Node)) {
        setIsUserTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 프로필 수정 Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => usersApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });

  // 악기 수정 Mutation
  const updateInstrumentsMutation = useMutation({
    mutationFn: (data: UpdateInstrumentsRequest) => usersApi.updateInstruments(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });

  // 특징 수정 Mutation
  const updateUserTypesMutation = useMutation({
    mutationFn: (data: UpdateUserTypesRequest) => usersApi.updateUserTypes(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });

  // 필터링된 악기 목록
  const filteredInstruments = useMemo(() => {
    return instruments.filter(inst =>
      inst.name.toLowerCase().includes(instrumentSearch.toLowerCase()) &&
      !selectedInstruments.includes(inst.instrument_id)
    );
  }, [instruments, instrumentSearch, selectedInstruments]);

  // 필터링된 특징 목록
  const filteredUserTypes = useMemo(() => {
    return userTypes.filter(type =>
      type.name.toLowerCase().includes(userTypeSearch.toLowerCase()) &&
      !selectedUserTypes.includes(type.user_type_id)
    );
  }, [userTypes, userTypeSearch, selectedUserTypes]);

  // 악기 선택
  const handleSelectInstrument = (instrumentId: number) => {
    if (!selectedInstruments.includes(instrumentId)) {
      setSelectedInstruments([...selectedInstruments, instrumentId]);
      // 첫 번째 선택된 악기를 주요 악기로 설정
      if (selectedInstruments.length === 0) {
        setPrimaryInstrumentId(instrumentId);
      }
    }
    setInstrumentSearch('');
    setIsInstrumentDropdownOpen(false);
  };

  // 악기 제거
  const handleRemoveInstrument = (instrumentId: number) => {
    setSelectedInstruments(selectedInstruments.filter(id => id !== instrumentId));
    if (primaryInstrumentId === instrumentId) {
      setPrimaryInstrumentId(selectedInstruments.length > 1 ? selectedInstruments[0] : null);
    }
  };

  // 주요 악기 설정
  const handleSetPrimaryInstrument = (instrumentId: number) => {
    setPrimaryInstrumentId(instrumentId);
  };

  // 특징 선택
  const handleSelectUserType = (userTypeId: number) => {
    if (!selectedUserTypes.includes(userTypeId)) {
      setSelectedUserTypes([...selectedUserTypes, userTypeId]);
    }
    setUserTypeSearch('');
    setIsUserTypeDropdownOpen(false);
  };

  // 특징 제거
  const handleRemoveUserType = (userTypeId: number) => {
    setSelectedUserTypes(selectedUserTypes.filter(id => id !== userTypeId));
  };

  // 해시태그 추가
  const handleAddHashtag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !hashtags.includes(trimmedTag)) {
      setHashtags([...hashtags, trimmedTag]);
    }
  };

  // 해시태그 제거
  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  // 프로필 이미지 변경
  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        // TODO: 실제로는 이미지를 서버에 업로드하고 URL을 받아와야 함
        // 현재는 임시로 base64 사용
        setProfileImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 저장
  const handleSave = async () => {
    try {
      // 프로필 기본 정보 수정
      await updateProfileMutation.mutateAsync({
        nickname: nickname !== profileData?.nickname ? nickname : undefined,
        profile_image_url: profileImageUrl !== profileData?.profile_image_url ? profileImageUrl || undefined : undefined,
        bio: bio !== profileData?.profile?.bio ? bio : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
      });

      // 악기 정보 수정
      if (selectedInstruments.length > 0) {
        await updateInstrumentsMutation.mutateAsync({
          instrument_ids: selectedInstruments,
          primary_instrument_id: primaryInstrumentId || undefined,
        });
      }

      // 특징 정보 수정
      if (selectedUserTypes.length > 0) {
        await updateUserTypesMutation.mutateAsync({
          user_type_ids: selectedUserTypes,
        });
      }
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      alert('프로필 저장에 실패했습니다.');
    }
  };

  const isLoading = isLoadingProfile;
  const isSaving = updateProfileMutation.isPending || updateInstrumentsMutation.isPending || updateUserTypesMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-md md:max-w-2xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

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
        {/* 프로필 이미지 */}
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
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
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
          {/* 닉네임 */}
          <div>
            <label htmlFor="nickname" className={commonStyles.label}>닉네임</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={commonStyles.textInputP3}
            />
          </div>

          {/* 자기소개 */}
          <div>
            <label htmlFor="bio" className={commonStyles.label}>자기소개</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className={commonStyles.textInputP3}
              placeholder="자기소개를 입력하세요..."
            />
          </div>

          {/* 악기 선택 */}
          <div className="relative" ref={instrumentDropdownRef}>
            <label className={commonStyles.label}>악기</label>
            <div className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 focus-within:ring-2 focus-within:ring-purple-500 transition-colors flex flex-wrap gap-2 items-center">
              {selectedInstruments.map(instrumentId => {
                const instrument = instruments.find(i => i.instrument_id === instrumentId);
                if (!instrument) return null;
                const isPrimary = primaryInstrumentId === instrumentId;
                return (
                  <span
                    key={instrumentId}
                    className={`text-sm font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                      isPrimary
                        ? 'bg-purple-600 text-purple-100'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {instrument.name}
                    {isPrimary && <span className="text-xs">(주요)</span>}
                    <button
                      onClick={() => handleRemoveInstrument(instrumentId)}
                      className="hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {!isPrimary && selectedInstruments.length > 1 && (
                      <button
                        onClick={() => handleSetPrimaryInstrument(instrumentId)}
                        className="text-xs hover:underline ml-1"
                        title="주요 악기로 설정"
                      >
                        주요로
                      </button>
                    )}
                  </span>
                );
              })}
              <input
                type="text"
                value={instrumentSearch}
                onChange={(e) => setInstrumentSearch(e.target.value)}
                onFocus={() => setIsInstrumentDropdownOpen(true)}
                placeholder={selectedInstruments.length === 0 ? "악기 검색 및 추가..." : ""}
                autoComplete="off"
                className="bg-transparent flex-1 focus:outline-none p-1 min-w-[120px]"
              />
            </div>
            {isInstrumentDropdownOpen && filteredInstruments.length > 0 && (
              <ul className="absolute z-30 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg animate-fade-in">
                {filteredInstruments.map(inst => (
                  <li
                    key={inst.instrument_id}
                    onClick={() => handleSelectInstrument(inst.instrument_id)}
                    className="px-4 py-2 text-sm text-gray-200 cursor-pointer hover:bg-purple-600 hover:text-white"
                  >
                    {inst.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 특징 선택 */}
          <div className="relative" ref={userTypeDropdownRef}>
            <label className={commonStyles.label}>특징</label>
            <div className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 focus-within:ring-2 focus-within:ring-purple-500 transition-colors flex flex-wrap gap-2 items-center">
              {selectedUserTypes.map(userTypeId => {
                const userType = userTypes.find(t => t.user_type_id === userTypeId);
                if (!userType) return null;
                return (
                  <span
                    key={userTypeId}
                    className="bg-purple-600/50 text-purple-200 text-sm font-medium px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    {userType.name}
                    <button
                      onClick={() => handleRemoveUserType(userTypeId)}
                      className="text-purple-200 hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                );
              })}
              <input
                type="text"
                value={userTypeSearch}
                onChange={(e) => setUserTypeSearch(e.target.value)}
                onFocus={() => setIsUserTypeDropdownOpen(true)}
                placeholder={selectedUserTypes.length === 0 ? "특징 검색 및 추가..." : ""}
                autoComplete="off"
                className="bg-transparent flex-1 focus:outline-none p-1 min-w-[120px]"
              />
            </div>
            {isUserTypeDropdownOpen && filteredUserTypes.length > 0 && (
              <ul className="absolute z-30 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg animate-fade-in">
                {filteredUserTypes.map(type => (
                  <li
                    key={type.user_type_id}
                    onClick={() => handleSelectUserType(type.user_type_id)}
                    className="px-4 py-2 text-sm text-gray-200 cursor-pointer hover:bg-purple-600 hover:text-white"
                  >
                    {type.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 해시태그 */}
          <div>
            <label className={commonStyles.label}>해시태그</label>
            <div className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 focus-within:ring-2 focus-within:ring-purple-500 transition-colors flex flex-wrap gap-2 items-center">
              {hashtags.map(tag => (
                <span
                  key={tag}
                  className="bg-blue-600/50 text-blue-200 text-sm font-medium px-2 py-1 rounded-full flex items-center gap-1"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveHashtag(tag)}
                    className="text-blue-200 hover:text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={hashtags.length === 0 ? "해시태그 입력 후 Enter..." : ""}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    handleAddHashtag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="bg-transparent flex-1 focus:outline-none p-1 min-w-[120px]"
              />
            </div>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="w-full pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} py-3 flex items-center justify-center w-full`}
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
          {(updateProfileMutation.isSuccess || updateInstrumentsMutation.isSuccess || updateUserTypesMutation.isSuccess) && (
            <p className="text-green-400 text-center mt-4 text-sm animate-fade-in">
              프로필이 성공적으로 저장되었습니다!
            </p>
          )}
          {(updateProfileMutation.isError || updateInstrumentsMutation.isError || updateUserTypesMutation.isError) && (
            <p className="text-red-400 text-center mt-4 text-sm animate-fade-in">
              저장 중 오류가 발생했습니다.
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
