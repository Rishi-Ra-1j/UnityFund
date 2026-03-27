import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

// Pages — we'll create these next
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import CampaignsPage from './pages/CampaignsPage'
import CampaignPage from './pages/CampaignPage'
import DashboardPage from './pages/DashboardPage'
import WalletPage from './pages/WalletPage'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/campaigns" element={<CampaignsPage/>}/>
      <Route path="/campaigns/:id" element={<CampaignPage/>}/>
      <Route path="/dashboard" element={<DashboardPage/>}/>
      <Route path="/wallet" element={<WalletPage/>}/>
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