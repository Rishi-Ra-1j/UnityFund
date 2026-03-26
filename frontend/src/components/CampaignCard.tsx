import { useNavigate } from 'react-router-dom'
import type { Campaign } from '../types'

interface Props {
  campaign: Campaign
}

const CampaignCard = ({ campaign }: Props) => {
  const navigate = useNavigate()

  // Calculate progress percentage
  const progress = Math.min(
    (Number(campaign.currentAmount) / Number(campaign.goalAmount)) * 100,
    100
  )

  // Calculate days remaining
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(campaign.deadline).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
    )
  )

  return (
    <div
      onClick={() => navigate(`/campaigns/${campaign.id}`)}
      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Campaign Image */}
      <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
        {campaign.imageUrl ? (
          <img
            src={campaign.imageUrl}
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white text-4xl">🎯</span>
        )}
      </div>

      {/* Campaign Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 text-lg mb-1 line-clamp-1">
          {campaign.title}
        </h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">
          {campaign.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-sm">
          <div>
            <span className="font-semibold text-gray-800">
              ₹{Number(campaign.currentAmount).toLocaleString()}
            </span>
            <span className="text-gray-400">
              {' '}of ₹{Number(campaign.goalAmount).toLocaleString()}
            </span>
          </div>
          <span className="text-gray-400">{daysLeft} days left</span>
        </div>

        <div className="mt-2 text-xs text-gray-400">
          {Math.round(progress)}% funded • by {campaign.creator.name}
        </div>
      </div>
    </div>
  )
}

export default CampaignCard