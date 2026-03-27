import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAdminCampaignsApi,
  getAdminUsersApi,
  approveCampaignApi,
  rejectCampaignApi,
  pauseCampaignApi,
  unpauseCampaignApi,
  cancelCampaignApi
} from '../api/admin'
import Navbar from '../components/Navbar'

interface AdminCampaign {
  id: number
  title: string
  description: string
  status: string
  goalAmount: number
  currentAmount: number
  createdAt: string
  creator: { id: number; name: string; email: string }
  _count: { donations: number }
}

interface AdminUser {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
  _count: { campaigns: number; donations: number }
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-orange-100 text-orange-700',
  SUCCESSFUL: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
}

const AdminPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'campaigns' | 'users'>('campaigns')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [c, u] = await Promise.all([
        getAdminCampaignsApi(),
        getAdminUsersApi()
      ])
      setCampaigns(c)
      setUsers(u)
    } catch (err) {
      console.error('Admin fetch error', err)
    } finally {
      setIsLoading(false)
    }
  }

  const showSuccess = (msg: string) => {
    setActionSuccess(msg)
    setActionError('')
    setTimeout(() => setActionSuccess(''), 3000)
  }

  const showError = (msg: string) => {
    setActionError(msg)
    setActionSuccess('')
    setTimeout(() => setActionError(''), 3000)
  }

  const handleApprove = async (id: number) => {
    try {
      await approveCampaignApi(id)
      showSuccess('Campaign approved successfully')
      await fetchData()
    } catch (_err) {
      showError('Failed to approve campaign')
    }
  }

  const handleReject = async (id: number) => {
    try {
      await rejectCampaignApi(id)
      showSuccess('Campaign rejected')
      await fetchData()
    } catch (_err) {
      showError('Failed to reject campaign')
    }
  }

  const handlePause = async (id: number) => {
    try {
      await pauseCampaignApi(id)
      showSuccess('Campaign paused')
      await fetchData()
    } catch (_err) {
      showError('Failed to pause campaign')
    }
  }

  const handleUnpause = async (id: number) => {
    try {
      await unpauseCampaignApi(id)
      showSuccess('Campaign unpaused')
      await fetchData()
    } catch (_err) {
      showError('Failed to unpause campaign')
    }
  }

  const handleCancel = async (id: number) => {
    if (!cancelReason.trim()) {
      showError('Please enter a reason for cancellation')
      return
    }
    try {
      await cancelCampaignApi(id, cancelReason)
      showSuccess('Campaign cancelled and donors refunded')
      setCancellingId(null)
      setCancelReason('')
      await fetchData()
    } catch (_err) {
      showError('Failed to cancel campaign')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage campaigns and users
          </p>
        </div>

        {/* Feedback messages */}
        {actionSuccess && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm mb-4">
            {actionSuccess}
          </div>
        )}
        {actionError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {actionError}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-800">{campaigns.length}</p>
            <p className="text-sm text-gray-500">Total Campaigns</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {campaigns.filter(c => c.status === 'PENDING').length}
            </p>
            <p className="text-sm text-gray-500">Pending Review</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-800">{users.length}</p>
            <p className="text-sm text-gray-500">Total Users</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'campaigns'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Users ({users.length})
          </button>
        </div>

        {activeTab === 'campaigns' ? (

          // ── Campaigns Tab ─────────────────────────────────────
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-lg shadow-sm p-5 border border-gray-100"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">
                        {campaign.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      by {campaign.creator.name} ({campaign.creator.email})
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Goal: ₹{Number(campaign.goalAmount).toLocaleString()} •{' '}
                      Raised: ₹{Number(campaign.currentAmount).toLocaleString()} •{' '}
                      {campaign._count.donations} donations
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
                    >
                      View
                    </button>

                    {campaign.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(campaign.id)}
                          className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded hover:bg-green-100 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(campaign.id)}
                          className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {campaign.status === 'ACTIVE' && (
                      <>
                        <button
                          onClick={() => handlePause(campaign.id)}
                          className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded hover:bg-orange-100 transition-colors"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => setCancellingId(campaign.id)}
                          className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {campaign.status === 'PAUSED' && (
                      <>
                        <button
                          onClick={() => handleUnpause(campaign.id)}
                          className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded hover:bg-green-100 transition-colors"
                        >
                          Unpause
                        </button>
                        <button
                          onClick={() => setCancellingId(campaign.id)}
                          className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Cancel reason input */}
                {cancellingId === campaign.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Reason for cancellation:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="Enter reason..."
                      />
                      <button
                        onClick={() => handleCancel(campaign.id)}
                        className="text-sm bg-red-600 text-white px-4 py-1.5 rounded hover:bg-red-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => {
                          setCancellingId(null)
                          setCancelReason('')
                        }}
                        className="text-sm bg-gray-100 text-gray-600 px-4 py-1.5 rounded hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        ) : (

          // ── Users Tab ─────────────────────────────────────────
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800">{u.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <p>{u._count.campaigns} campaigns</p>
                  <p>{u._count.donations} donations</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPage