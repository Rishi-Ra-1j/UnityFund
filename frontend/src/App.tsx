import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import CampaignsPage from './pages/CampaignsPage'
import CampaignPage from './pages/CampaignPage'
import DashboardPage from './pages/DashboardPage'
import WalletPage from './pages/WalletPage'
import CreateCampaignPage from './pages/CreateCampaignPage'
import AdminPage from './pages/AdminPage'

// ── Protected Route ───────────────────────────────────────────
// Requires user to be logged in
// If not logged in → redirect to /login
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── Admin Route ───────────────────────────────────────────────
// Requires user to be logged in AND have ADMIN role
// If not admin → redirect to home
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

// ── Guest Route ───────────────────────────────────────────────
// Only for non-logged-in users
// If already logged in → redirect to home
// Prevents logged in users from seeing login/signup pages
const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/campaigns" element={<CampaignsPage />} />
      <Route path="/campaigns/:id" element={<CampaignPage />} />

      {/* Guest only routes — logged in users redirected to home */}
      <Route path="/login" element={
        <GuestRoute><LoginPage /></GuestRoute>
      } />
      <Route path="/signup" element={
        <GuestRoute><SignupPage /></GuestRoute>
      } />

      {/* Protected routes — must be logged in */}
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/wallet" element={
        <ProtectedRoute><WalletPage /></ProtectedRoute>
      } />
      <Route path="/campaign/new" element={
        <ProtectedRoute><CreateCampaignPage /></ProtectedRoute>
      } />

      {/* Admin only routes */}
      <Route path="/admin" element={
        <AdminRoute><AdminPage /></AdminRoute>
      } />

      {/* Catch all — redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
