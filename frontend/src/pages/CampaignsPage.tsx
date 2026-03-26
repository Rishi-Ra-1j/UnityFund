import { useEffect, useState } from 'react'
import { getCampaignsApi } from '../api/campaigns'
import CampaignCard from '../components/CampaignCard'
import Navbar from '../components/Navbar'
import type { Campaign } from '../types'

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const data = await getCampaignsApi()
        setCampaigns(data)
      } catch (err) {
        console.error('Failed to fetch campaigns', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCampaigns()
  }, [])

  // Filter campaigns by search term
  const filtered = campaigns.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Browse Campaigns
          </h1>
          <p className="text-gray-500">
            Discover and support campaigns making a difference
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Campaign Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">
              {search ? 'No campaigns match your search' : 'No active campaigns yet'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">
              {filtered.length} campaign{filtered.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filtered.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CampaignsPage