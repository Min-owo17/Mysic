
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { commonStyles } from '../styles/commonStyles';
import { authApi } from '../services/api/auth';
import toast from 'react-hot-toast';

const AuthView: React.FC = () => {
    const { login } = useAppContext();
    const navigate = useNavigate();
    const [mode, setMode] = useState<'login' | 'signup' | 'forgotPassword'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (mode === 'login') {
                // 로그인
                const response = await authApi.login({ email, password });
                
                // 토큰 저장
                localStorage.setItem('access_token', response.access_token);
                
                // 인증 상태 업데이트
                login();
                
                toast.success('로그인 성공!');
                navigate('/record');
            } else if (mode === 'signup') {
                // 비밀번호 확인
                if (password !== confirmPassword) {
                    toast.error('비밀번호가 일치하지 않습니다.');
                    setIsLoading(false);
                    return;
                }

                // 비밀번호 길이 확인
                if (password.length < 8) {
                    toast.error('비밀번호는 8자 이상이어야 합니다.');
                    setIsLoading(false);
                    return;
                }

                // 닉네임 확인
                if (!nickname || nickname.trim().length === 0) {
                    toast.error('닉네임을 입력해주세요.');
                    setIsLoading(false);
                    return;
                }

                // 회원가입
                const response = await authApi.register({ email, password, nickname: nickname.trim() });
                
                // 토큰 저장
                localStorage.setItem('access_token', response.access_token);
                
                // 인증 상태 업데이트
                login();
                
                toast.success('회원가입 성공!');
                navigate('/record');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || error.message || '오류가 발생했습니다.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordReset = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmationModal(true);
    };

    const handleCloseConfirmationModal = () => {
        setShowConfirmationModal(false);
        setResetEmail('');
        setMode('login');
    };

    return (
        <>
        {showConfirmationModal && (
            <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                <div className={`${commonStyles.modalContainer} p-8 text-center flex flex-col items-center`}>
                    <MailSentIcon />
                    <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-300 mt-4">인증 메일 발송 완료</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        <span className="font-semibold text-purple-600 dark:text-purple-300">{resetEmail}</span>(으)로<br/>비밀번호 재설정 안내 메일을 보냈습니다.
                    </p>
                    <button
                        onClick={handleCloseConfirmationModal}
                        className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} mt-6`}
                    >
                        확인
                    </button>
                </div>
            </div>
        )}
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transform animate-scale-in">
                <h1 className="text-3xl font-bold text-center text-purple-600 dark:text-purple-300 mb-2">Mysic: 연주 일기</h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
                    {mode === 'forgotPassword' ? '비밀번호 찾기' : '당신의 연습 일지'}
                </p>

                {mode !== 'forgotPassword' && (
                    <div className={`flex border-b ${commonStyles.divider} mb-6`}>
                        <button
                            onClick={() => setMode('login')}
                            className={`${commonStyles.navTab} ${mode === 'login' ? commonStyles.navTabActive : commonStyles.navTabInactive}`}
                        >
                            로그인
                        </button>
                        <button
                            onClick={() => setMode('signup')}
                            className={`${commonStyles.navTab} ${mode === 'signup' ? commonStyles.navTabActive : commonStyles.navTabInactive}`}
                        >
                            회원가입
                        </button>
                    </div>
                )}
                
                {mode === 'login' && (
                     <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="email"
                            placeholder="이메일"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            className={commonStyles.textInputDarkerP3}
                        />
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className={commonStyles.textInputDarkerP3}
                        />
                        <div className="text-right">
                             <button type="button" onClick={() => setMode('forgotPassword')} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                                비밀번호를 잊으셨나요?
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} py-3 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>
                    </form>
                )}
                
                {mode === 'signup' && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="email"
                            placeholder="이메일"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            className={commonStyles.textInputDarkerP3}
                        />
                        <input
                            type="text"
                            placeholder="닉네임"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            required
                            disabled={isLoading}
                            maxLength={100}
                            className={commonStyles.textInputDarkerP3}
                        />
                        <input
                            type="password"
                            placeholder="비밀번호 (8자 이상)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            minLength={8}
                            className={commonStyles.textInputDarkerP3}
                        />
                        <input
                            type="password"
                            placeholder="비밀번호 확인"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className={commonStyles.textInputDarkerP3}
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} py-3 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? '회원가입 중...' : '회원가입'}
                        </button>
                    </form>
                )}
                
                {mode === 'forgotPassword' && (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">가입하신 이메일 주소를 입력해주세요. 비밀번호 재설정 링크를 보내드립니다.</p>
                        <input
                            type="email"
                            placeholder="이메일"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            className={commonStyles.textInputDarkerP3}
                        />
                        <button
                            type="submit"
                            className={`${commonStyles.buttonBase} ${commonStyles.indigoButton} py-3`}
                        >
                            인증 메일 보내기
                        </button>
                        <div className="text-center">
                            <button type="button" onClick={() => setMode('login')} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors mt-2">
                                로그인으로 돌아가기
                            </button>
                        </div>
                    </form>
                )}


                {mode !== 'forgotPassword' && (
                    <>
                    <div className="flex items-center my-6">
                        <div className={`flex-grow border-t ${commonStyles.divider}`}></div>
                        <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-500 text-sm">또는</span>
                        <div className={`flex-grow border-t ${commonStyles.divider}`}></div>
                    </div>
                    <div className="space-y-3">
                        <SocialButton provider="Google" onClick={() => { login(); navigate('/record'); }} />
                        <SocialButton provider="Kakao" onClick={() => { login(); navigate('/record'); }} />
                        <SocialButton provider="Naver" onClick={() => { login(); navigate('/record'); }} />
                    </div>
                    </>
                )}
            </div>
        </div>
        </>
    );
};

interface SocialButtonProps {
    provider: 'Google' | 'Kakao' | 'Naver';
    onClick: () => void;
}

const SocialButton: React.FC<SocialButtonProps> = ({ provider, onClick }) => {
    const providerStyles = {
        Google: { bg: 'bg-white', text: 'text-gray-800', icon: <GoogleIcon /> },
        Kakao: { bg: 'bg-[#FEE500]', text: 'text-[#191919]', icon: <KakaoIcon /> },
        Naver: { bg: 'bg-[#03C75A]', text: 'text-white', icon: <NaverIcon /> },
    };
    
    const { bg, text, icon } = providerStyles[provider];

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md transition-opacity hover:opacity-90 ${bg} ${text}`}
        >
            {icon}
            <span className="font-bold text-sm">{provider} 계정으로 시작</span>
        </button>
    );
};

const MailSentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M12 12l-2 2m0 0l-2-2m2 2l2 2m0 0l2-2" />
    </svg>
);
const GoogleIcon = () => (<svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.618-3.226-11.283-7.66l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.863 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>);
const KakaoIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c-5.523 0-10 3.582-10 8 0 2.924 1.933 5.518 4.783 6.91-1.23.974-3.58 2.55-3.58 2.55s.87.21 2.33.02c.025-.002.05-.005.075-.008.31-.03.626-.067.95-.11.91-.12 1.85-.29 2.82-.49 4.38-1.02 6.62-4.23 6.62-7.87 0-4.418-4.477-8-10-8Z"/></svg>);
const NaverIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M16.273 12.845h-4.364v-1.69h4.364V8H8.364v8h8.364v-1.69h-.455v.001Z"/></svg>);


export default AuthView;