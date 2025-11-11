import { Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={
          <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Hello World! 🎵
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Mysic - 악기 연주자 연습 기록 서비스
            </p>
            <p className="text-sm text-gray-500 mt-4">
              프로젝트 구조 확장 완료! ✅
            </p>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
