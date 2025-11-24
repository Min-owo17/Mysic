import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppContext } from './context/AppContext'
import { ThemeProvider } from './context/ThemeProvider'
import AuthView from './components/AuthView'
import RecordView from './components/RecordView'
import CalendarView from './components/CalendarView'
import GroupsView from './components/GroupsView'
import BoardView from './components/BoardView'
import ProfileView from './components/ProfileView'
import SettingsView from './components/SettingsView'
import BottomNavBar from './components/BottomNavBar'
import SideNavBar from './components/SideNavBar'
import { Header } from './components/layout/Header'
import { useMemo, useState, useContext, ReactNode, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { View } from './types'
import { authApi } from './services/api/auth'

// Protected Route Component
function ProtectedRoute({ children }: { children: ReactNode }) {
  const contextValue = useContext(AppContext)
  const location = useLocation()
  
  if (!contextValue?.isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }
  
  return <>{children}</>
}

// Main Layout Component
function MainLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  
  // View enum과 URL 경로 매핑
  const pathToView: Record<string, View> = {
    '/record': View.RECORD,
    '/calendar': View.CALENDAR,
    '/groups': View.GROUPS,
    '/board': View.BOARD,
    '/profile': View.PROFILE,
    '/settings': View.SETTINGS,
  }
  
  const currentView = pathToView[location.pathname] || View.RECORD
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SideNavBar currentView={currentView} />
      <div className="md:ml-64 pb-16 md:pb-0">
        <Header />
        <main className="p-4 md:p-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
      <BottomNavBar currentView={currentView} />
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const queryClient = useQueryClient()

  // 컴포넌트 마운트 시 토큰 확인
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          // 토큰이 있으면 사용자 정보 확인
          await authApi.getMe()
          setIsAuthenticated(true)
        } catch (error) {
          // 토큰이 유효하지 않으면 삭제
          localStorage.removeItem('access_token')
          setIsAuthenticated(false)
          // 캐시도 클리어
          queryClient.clear()
        }
      } else {
        setIsAuthenticated(false)
      }
      setIsCheckingAuth(false)
    }
    checkAuth()
  }, [queryClient])

  const contextValue = useMemo(() => ({
    records: [],
    addRecord: () => {},
    resetRecords: () => {},
    posts: [],
    addPost: () => {},
    updatePost: () => {},
    deletePost: () => {},
    addComment: () => {},
    addReply: () => {},
    togglePostLike: () => {},
    toggleCommentLike: () => {},
    togglePostBookmark: () => {},
    userProfile: {
      nickname: '',
      instrument: '',
      features: [],
      email: '',
      userCode: '',
      bookmarkedPosts: []
    },
    updateProfile: () => {},
    deleteAccount: () => {},
    userProfiles: {},
    allUsers: [],
    groups: [],
    addGroup: () => {},
    leaveGroup: () => {},
    kickMember: () => {},
    deleteGroup: () => {},
    transferOwnership: () => {},
    sendGroupInvitation: () => {},
    acceptInvitation: () => {},
    declineInvitation: () => {},
    postNotifications: [],
    groupNotifications: [],
    markPostNotificationsAsRead: () => {},
    markGroupNotificationsAsRead: () => {},
    setCurrentView: () => {},
    isAuthenticated,
    login: () => setIsAuthenticated(true),
    logout: () => {
      localStorage.removeItem('access_token')
      setIsAuthenticated(false)
      // React Query 캐시 클리어 - 이전 사용자의 데이터가 남지 않도록
      queryClient.clear()
    }
  }), [isAuthenticated, queryClient])

  // 인증 확인 중일 때는 로딩 표시 (선택사항)
  if (isCheckingAuth) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <AppContext.Provider value={contextValue}>
        <Routes>
          <Route path="/auth" element={<AuthView />} />
          <Route
            path="/record"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <RecordView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CalendarView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <GroupsView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/board"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <BoardView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ProfileView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SettingsView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/record" : "/auth"} replace />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/record" : "/auth"} replace />} />
        </Routes>
      </AppContext.Provider>
    </ThemeProvider>
  )
}

export default App
