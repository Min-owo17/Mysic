import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppContext } from './context/AppContext'
import { ThemeProvider } from './context/ThemeProvider'
import AuthView from './pages/auth/AuthView'
import RecordView from './pages/practice/RecordView'
import CalendarView from './pages/practice/CalendarView'
import GroupsView from './components/GroupsView'
import GroupDetailView from './components/GroupDetailView'
import GroupStatisticsView from './components/GroupStatisticsView'
import BoardView from './pages/board/BoardView'
import ProfileView from './pages/profile/ProfileView'
import SettingsView from './components/SettingsView'
import AchievementView from './pages/profile/AchievementView'
import BottomNavBar from './components/BottomNavBar'
import SideNavBar from './components/SideNavBar'
import { Header } from './components/layout/Header'
import { useMemo, useState, useContext, ReactNode, useEffect } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { View } from './types'
import { authApi } from './services/api/auth'
import { useAuthStore } from './store/slices/authSlice'
import { groupsApi } from './services/api/groups'

// Protected Route Component
function ProtectedRoute({ children }: { children: ReactNode }) {
  const contextValue = useContext(AppContext)
  const location = useLocation()
  
  if (!contextValue?.isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }
  
  return <>{children}</>
}

// Group Statistics View Wrapper
function GroupStatisticsViewWrapper() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: group } = useQuery({
    queryKey: ['groups', Number(groupId)],
    queryFn: () => groupsApi.getGroup(Number(groupId)),
    enabled: !!groupId,
  })

  if (!groupId || !group) {
    return <Navigate to="/groups" replace />
  }

  const handleBack = () => {
    // 그룹 상세 페이지로 이동하기 위해 GroupsView에 그룹 ID를 전달
    // GroupsView에서 해당 그룹을 자동으로 선택하여 그룹 상세 페이지를 표시
    navigate('/groups', { state: { selectGroupId: Number(groupId) } })
  }
  
  return <GroupStatisticsView groupId={Number(groupId)} onBack={handleBack} />
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
    '/achievements': View.PROFILE, // 칭호 페이지는 프로필 탭으로 인식
    '/settings': View.SETTINGS,
  }
  
  const currentView = pathToView[location.pathname] || View.RECORD
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SideNavBar currentView={currentView} />
      <div className="md:ml-64 pb-16 md:pb-0">
        <Header />
        <main className="pt-20 p-4 md:p-8 min-h-[calc(100vh-5rem)]">
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
  const { setUser } = useAuthStore()

  // 컴포넌트 마운트 시 토큰 확인
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          // 토큰이 있으면 사용자 정보 확인 및 저장
          const user = await authApi.getMe()
          setUser(user)
          setIsAuthenticated(true)
        } catch (error) {
          // 토큰이 유효하지 않으면 삭제
          localStorage.removeItem('access_token')
          setUser(null)
          setIsAuthenticated(false)
          // 캐시도 클리어
          queryClient.clear()
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
      setIsCheckingAuth(false)
    }
    checkAuth()
  }, [queryClient, setUser])

  const contextValue = useMemo(() => ({
    // 실제로 사용되는 필드만 유지
    records: [],
    addRecord: () => {},
    resetRecords: () => {},
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
    postNotifications: [],
    markPostNotificationsAsRead: () => {},
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
            path="/groups/:groupId/statistics"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <GroupStatisticsViewWrapper />
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
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AchievementView />
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
