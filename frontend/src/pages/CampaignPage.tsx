import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { getCampaignByIdApi } from '../api/campaigns'
import { donateToCampaignApi } from '../api/donations'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import type { Campaign } from '../types'

interface Comment {
  id: number
  content: string
  createdAt: string
  author: { id: number; name: string }
}

interface CampaignUpdate {
  id: number
  title: string
  content: string
  createdAt: string
}

interface FullCampaign extends Campaign {
  comments: Comment[]
  updates: CampaignUpdate[]
}

const CampaignPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [campaign, setCampaign] = useState<FullCampaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [donateAmount, setDonateAmount] = useState('')
  const [donating, setDonating] = useState(false)
  const [donateError, setDonateError] = useState('')
  const [donateSuccess, setDonateSuccess] = useState('')

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const data = await getCampaignByIdApi(Number(id))
        setCampaign(data as FullCampaign)
      } catch (err) {
        console.error('Failed to fetch campaign', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCampaign()
  }, [id])

  const handleDonate = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    const amount = Number(donateAmount)

    if (!amount || amount <= 0) {
      setDonateError('Please enter a valid amount')
      return
    }

    setDonating(true)
    setDonateError('')
    setDonateSuccess('')

    try {
      // Generate unique idempotency key for this donation attempt
      const idempotencyKey = uuidv4()

      await donateToCampaignApi({
        campaignId: Number(id),
        amount,
        idempotencyKey
      })

      setDonateSuccess(`Successfully donated ₹${amount}!`)
      setDonateAmount('')

      // Refresh campaign to show updated amount
      const updated = await getCampaignByIdApi(Number(id))
      setCampaign(updated as FullCampaign)

    } catch (err: unknown) {
      if (err instanceof Error) {
        setDonateError('Donation failed. Check your wallet balance.')
      }
    } finally {
      setDonating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 rounded-lg" />
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-20 text-gray-400">
          Campaign not found
        </div>
      </div>
    )
  }

  const progress = Math.min(
    (Number(campaign.currentAmount) / Number(campaign.goalAmount)) * 100,
    100
  )

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(campaign.deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    )
  )

  const isActive = campaign.status === 'ACTIVE'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Campaign Header */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="h-64 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            {campaign.imageUrl ? (
              <img
                src={campaign.imageUrl}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-6xl">🎯</span>
            )}
          </div>

          <div className="p-6">
            {/* Status badge */}
            <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full mb-3 ${
              campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
              campaign.status === 'SUCCESSFUL' ? 'bg-blue-100 text-blue-700' :
              campaign.status === 'FAILED' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {campaign.status}
            </span>

            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {campaign.title}
            </h1>
            <p className="text-gray-500 text-sm mb-4">
              by {campaign.creator.name}
            </p>
            <p className="text-gray-700 leading-relaxed">
              {campaign.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left — Progress + Donate */}
          <div className="md:col-span-2 space-y-6">

            {/* Progress Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-3xl font-bold text-gray-800">
                    ₹{Number(campaign.currentAmount).toLocaleString()}
                  </span>
                  <span className="text-gray-400 ml-2">
                    of ₹{Number(campaign.goalAmount).toLocaleString()}
                  </span>
                </div>
                <span className="text-gray-500 text-sm">{daysLeft} days left</span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-sm text-gray-500">
                {Math.round(progress)}% funded
              </p>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Comments ({campaign.comments.length})
              </h2>

              {campaign.comments.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No comments yet. Be the first!
                </p>
              ) : (
                <div className="space-y-4">
                  {campaign.comments.map((comment) => (
                    <div key={comment.id} className="border-b border-gray-50 pb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Updates Section */}
            {campaign.updates.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Campaign Updates
                </h2>
                <div className="space-y-4">
                  {campaign.updates.map((update) => (
                    <div key={update.id} className="border-l-4 border-blue-500 pl-4">
                      <h3 className="font-medium text-gray-800">{update.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{update.content}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(update.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Donate Box */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Support this campaign
              </h2>

              {isActive ? (
                <>
                  {donateSuccess && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm mb-3">
                      {donateSuccess}
                    </div>
                  )}
                  {donateError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-3">
                      {donateError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={donateAmount}
                      onChange={(e) => setDonateAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                      min="1"
                    />
                  </div>

                  {/* Quick amount buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[100, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setDonateAmount(String(amt))}
                        className="text-sm border border-blue-200 text-blue-600 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleDonate}
                    disabled={donating}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {donating ? 'Processing...' : 'Donate now'}
                  </button>

                  {!user && (
                    <p className="text-xs text-center text-gray-400 mt-2">
                      You need to login to donate
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">
                    This campaign is no longer accepting donations
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default CampaignPage