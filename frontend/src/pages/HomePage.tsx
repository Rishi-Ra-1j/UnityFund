import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCampaignsApi } from '../api/campaigns'
import CampaignCard from '../components/CampaignCard'
import Navbar from '../components/Navbar'
import type { Campaign } from '../types'

const HomePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const data = await getCampaignsApi()
        // Show only first 3 on home page as "featured"
        setCampaigns(data.slice(0, 3))
      } catch (err) {
        console.error('Failed to fetch campaigns', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCampaigns()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-4">
            Fund what matters
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Support campaigns that make a real difference in communities across India
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/campaigns')}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Browse campaigns
            </button>
            {user && (
              <button
                onClick={() => navigate('/campaign/new')}
                className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Start a campaign
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Featured Campaigns */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Featured Campaigns
          </h2>
          <button
            onClick={() => navigate('/campaigns')}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            View all →
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg h-72 animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No active campaigns yet</p>
            {user && (
              <button
                onClick={() => navigate('/campaign/new')}
                className="mt-4 text-blue-600 font-medium hover:underline"
              >
                Be the first to start one
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600">100%</div>
            <div className="text-gray-500 text-sm mt-1">Transparent funding</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">0%</div>
            <div className="text-gray-500 text-sm mt-1">Platform fee</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">Safe</div>
            <div className="text-gray-500 text-sm mt-1">Escrow protected</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage