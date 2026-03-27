import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyCampaignsApi, deleteCampaignApi } from '../api/campaigns'
import { getMyDonationsApi } from '../api/donations'
import Navbar from '../components/Navbar'
import type { Campaign, Donation } from '../types'

type MyCampaign = Campaign & {
  _count: { donations: number; comments: number }
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-orange-100 text-orange-700',
  SUCCESSFUL: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
}

const donationStatusColors: Record<string, string> = {
  HELD: 'bg-yellow-100 text-yellow-700',
  RELEASED: 'bg-green-100 text-green-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
}

const DashboardPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [myCampaigns, setMyCampaigns] = useState<MyCampaign[]>([])
  const [myDonations, setMyDonations] = useState<Donation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'campaigns' | 'donations'>('campaigns')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campaigns, donations] = await Promise.all([
          getMyCampaignsApi(),
          getMyDonationsApi()
        ])
        setMyCampaigns(campaigns as MyCampaign[])
        setMyDonations(donations)
      } catch (err) {
        console.error('Dashboard fetch error', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleDelete = async (campaignId: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      await deleteCampaignApi(campaignId)
      setMyCampaigns(prev => prev.filter(c => c.id !== campaignId))
    } catch (_err) {
      setDeleteError('Could not delete — only pending campaigns can be deleted')
      setTimeout(() => setDeleteError(''), 3000)
    }
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{user.name}</h1>
              <p className="text-gray-500 text-sm mt-1">{user.email}</p>
              <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full font-medium ${
                user.role === 'ADMIN'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {user.role}
              </span>
            </div>
            <button
              onClick={() => navigate('/campaign/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New Campaign
            </button>
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
            My Campaigns ({myCampaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('donations')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'donations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Donations ({myDonations.length})
          </button>
        </div>

        {deleteError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {deleteError}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg h-24 animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'campaigns' ? (

          // ── My Campaigns Tab ──────────────────────────────────
          <div className="space-y-4">
            {myCampaigns.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p>You haven't created any campaigns yet</p>
                <button
                  onClick={() => navigate('/campaign/new')}
                  className="mt-3 text-blue-600 font-medium hover:underline text-sm"
                >
                  Create your first campaign
                </button>
              </div>
            ) : (
              myCampaigns.map((campaign) => {
                const progress = Math.min(
                  (Number(campaign.currentAmount) / Number(campaign.goalAmount)) * 100,
                  100
                )
                return (
                  <div
                    key={campaign.id}
                    className="bg-white rounded-lg shadow-sm p-5 border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-800">
                            {campaign.title}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[campaign.status] || 'bg-gray-100 text-gray-700'}`}>
                            {campaign.status}
                          </span>
                        </div>

                        <p className="text-gray-500 text-sm mb-3 line-clamp-1">
                          {campaign.description}
                        </p>

                        {/* Progress */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="flex gap-4 text-xs text-gray-400">
                          <span>
                            ₹{Number(campaign.currentAmount).toLocaleString()} of ₹{Number(campaign.goalAmount).toLocaleString()}
                          </span>
                          <span>{campaign._count.donations} donations</span>
                          <span>{campaign._count.comments} comments</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                          className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
                        >
                          View
                        </button>
                        {campaign.status === 'PENDING' && (
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

        ) : (

          // ── My Donations Tab ──────────────────────────────────
          <div className="space-y-4">
            {myDonations.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p>You haven't donated to any campaigns yet</p>
                <button
                  onClick={() => navigate('/campaigns')}
                  className="mt-3 text-blue-600 font-medium hover:underline text-sm"
                >
                  Browse campaigns
                </button>
              </div>
            ) : (
              myDonations.map((donation) => (
                <div
                  key={donation.id}
                  className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 flex justify-between items-center"
                >
                  <div>
                    <h3
                      className="font-medium text-gray-800 hover:text-blue-600 cursor-pointer"
                      onClick={() => navigate(`/campaigns/${donation.campaign.id}`)}
                    >
                      {donation.campaign.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">
                      ₹{Number(donation.amount).toLocaleString()}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${donationStatusColors[donation.status] || 'bg-gray-100 text-gray-700'}`}>
                      {donation.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage