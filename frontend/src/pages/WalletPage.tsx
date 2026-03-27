import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getWalletApi, depositApi } from '../api/wallet'
import Navbar from '../components/Navbar'
import type { Wallet } from '../types'

const transactionColors: Record<string, string> = {
  DEPOSIT: 'text-green-600',
  DONATION: 'text-red-500',
  RELEASE: 'text-blue-600',
  REFUND: 'text-green-600',
}

const transactionIcons: Record<string, string> = {
  DEPOSIT: '↓',
  DONATION: '↑',
  RELEASE: '↓',
  REFUND: '↓',
}

const WalletPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [depositError, setDepositError] = useState('')
  const [depositSuccess, setDepositSuccess] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchWallet()
  }, [user])

  const fetchWallet = async () => {
    try {
      const data = await getWalletApi()
      setWallet(data)
    } catch (err) {
      console.error('Failed to fetch wallet', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeposit = async () => {
    const amount = Number(depositAmount)

    if (!amount || amount <= 0) {
      setDepositError('Please enter a valid amount')
      return
    }

    setDepositing(true)
    setDepositError('')
    setDepositSuccess('')

    try {
      await depositApi(amount)
      setDepositSuccess(`₹${amount} added to your wallet`)
      setDepositAmount('')
      // Refresh wallet to show updated balance
      await fetchWallet()
    } catch (_err) {
      setDepositError('Deposit failed. Please try again.')
    } finally {
      setDepositing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
          <div className="h-32 bg-white rounded-lg animate-pulse" />
          <div className="h-64 bg-white rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Wallet</h1>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-gray-800">
              ₹{Number(wallet?.balance || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Ready to spend</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Locked Balance</p>
            <p className="text-3xl font-bold text-orange-500">
              ₹{Number(wallet?.lockedBalance || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">In escrow</p>
          </div>
        </div>

        {/* Deposit Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Add Funds
          </h2>

          {depositSuccess && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm mb-3">
              {depositSuccess}
            </div>
          )}
          {depositError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-3">
              {depositError}
            </div>
          )}

          <div className="flex gap-3 mb-3">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter amount"
              min="1"
            />
            <button
              onClick={handleDeposit}
              disabled={depositing}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {depositing ? 'Adding...' : 'Add funds'}
            </button>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            {[500, 1000, 2000, 5000].map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(String(amt))}
                className="text-sm border border-gray-200 text-gray-600 px-3 py-1 rounded hover:bg-gray-50 transition-colors"
              >
                ₹{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Transaction History
          </h2>

          {!wallet?.transactions || wallet.transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {wallet.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${transactionColors[tx.type] || 'text-gray-600'}`}>
                      {transactionIcons[tx.type] || '•'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {tx.type}
                      </p>
                      <p className="text-xs text-gray-400">
                        {tx.description || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transactionColors[tx.type] || 'text-gray-600'}`}>
                      {tx.type === 'DONATION' ? '-' : '+'}₹{Number(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default WalletPage