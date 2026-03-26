import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const HomePage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">UnityFund</h1>
        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-600 text-sm">Hello, {user.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-500 hover:underline"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-blue-600 hover:underline"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="text-center mt-20">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">
          Fund what matters
        </h2>
        <p className="text-gray-500 text-lg mb-8">
          Support campaigns that make a real difference
        </p>
        {!user && (
          <button
            onClick={() => navigate('/signup')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Get started
          </button>
        )}
      </div>
    </div>
  )
}

export default HomePage