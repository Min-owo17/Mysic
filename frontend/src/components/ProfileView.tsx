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
import { resizeImage, validateImageFile } from '../utils/imageResize';

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
  const { data: profileData, isLoading: isLoadingProfile, error: profileError } = useQuery<UserDetailResponse>({
    queryKey: ['userProfile'],
    queryFn: () => {
      console.log('프로필 조회 API 호출 시작');
      return usersApi.getMyProfile();
    },
    retry: false, // 401 에러 시 재시도 방지
    onError: (error: any) => {
      console.error('프로필 조회 React Query 에러:', error);
      console.error('에러 상태 코드:', error.response?.status);
      console.error('에러 응답 데이터:', error.response?.data);
      console.error('에러 전체:', error);
      
      // 401 에러인 경우 상세 정보 출력
      if (error.response?.status === 401) {
        console.error('=== 401 인증 에러 상세 정보 ===');
        console.error('요청 URL:', error.config?.url);
        console.error('요청 헤더:', error.config?.headers);
        console.error('토큰 존재 여부:', !!localStorage.getItem('access_token'));
        console.error('응답 데이터:', error.response?.data);
        console.error('============================');
      }
    },
    onSuccess: (data) => {
      console.log('프로필 조회 성공:', data);
    },
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
  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) {
      return;
    }

    const file = e.target.files[0];

    // 파일 유효성 검사
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error || '파일을 확인할 수 없습니다.');
      e.target.value = ''; // 파일 입력 초기화
      return;
    }

    try {
      // 이미지 리사이징 및 최적화 (WebP 포맷)
      const optimizedImage = await resizeImage(file, {
        maxSize: 300,
        quality: 0.85,
        format: 'webp',
      });

      // 최적화된 이미지로 상태 업데이트
      setProfileImageUrl(optimizedImage);
    } catch (error) {
      console.error('이미지 처리 오류:', error);
      alert(error instanceof Error ? error.message : '이미지 처리 중 오류가 발생했습니다.');
      e.target.value = ''; // 파일 입력 초기화
    }
  };

  // 저장
  const handleSave = async () => {
    try {
      // 프로필 기본 정보 수정
      // 빈 문자열을 undefined로 변환하여 유효성 검사 통과
      const updateData: UpdateProfileRequest = {};
      
      // nickname: 변경되었고 빈 문자열이 아닐 때만 전송
      if (nickname !== profileData?.nickname && nickname.trim() !== '') {
        updateData.nickname = nickname.trim();
      }
      
      // profile_image_url: 변경되었고 값이 있을 때만 전송
      if (profileImageUrl !== profileData?.profile_image_url) {
        // WebP로 최적화된 이미지 (약 30-50KB)를 base64로 전송
        // 향후 S3 업로드 API 구현 시 변경 예정
        if (profileImageUrl && profileImageUrl.trim() !== '') {
          // 최적화된 이미지는 일반적으로 50KB 이하이므로 500자 제한은 충분
          // base64 인코딩 시 원본 크기의 약 133%가 되므로, 50KB 이미지는 약 67KB base64 문자열
          updateData.profile_image_url = profileImageUrl;
        } else {
          // null이나 빈 문자열이면 undefined로 설정 (필드 제외)
          updateData.profile_image_url = undefined;
        }
      }
      
      // bio: 변경되었을 때만 전송 (빈 문자열도 허용)
      if (bio !== profileData?.profile?.bio) {
        updateData.bio = bio || undefined;
      }
      
      // hashtags: 변경되었고 배열이 비어있지 않을 때만 전송
      if (JSON.stringify(hashtags) !== JSON.stringify(profileData?.profile?.hashtags || [])) {
        updateData.hashtags = hashtags.length > 0 ? hashtags : undefined;
      }
      
      await updateProfileMutation.mutateAsync(updateData);

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

  // 401 에러가 아닌 다른 에러가 발생한 경우
  if (profileError && (profileError as any).response?.status !== 401) {
    return (
      <div className="p-4 md:p-6 max-w-md md:max-w-2xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-400 mb-4">프로필을 불러오는 중 오류가 발생했습니다.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['userProfile'] })}
            className={`${commonStyles.buttonBase} ${commonStyles.primaryButton}`}
          >
            다시 시도
          </button>
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
