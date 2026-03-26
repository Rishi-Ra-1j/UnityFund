import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-blue-600">
          UnityFund
        </Link>

        <div className="flex items-center gap-6">
          <Link
            to="/campaigns"
            className="text-gray-600 hover:text-blue-600 text-sm font-medium"
          >
            Browse
          </Link>

          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-blue-600 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/wallet"
                className="text-gray-600 hover:text-blue-600 text-sm font-medium"
              >
                Wallet
              </Link>
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="text-gray-600 hover:text-blue-600 text-sm font-medium"
                >
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-red-50 text-red-500 px-3 py-1 rounded-md hover:bg-red-100 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar