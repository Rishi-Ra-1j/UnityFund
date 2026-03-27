import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCampaignApi } from '../api/campaigns'
import Navbar from '../components/Navbar'

const CreateCampaignPage = () => {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    goalAmount: '',
    deadline: '',
    imageUrl: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const campaign = await createCampaignApi({
        title: form.title,
        description: form.description,
        goalAmount: Number(form.goalAmount),
        deadline: new Date(form.deadline).toISOString(),
        imageUrl: form.imageUrl || undefined
      })

      // Redirect to the new campaign page
      navigate(`/campaigns/${campaign.id}`)

    } catch (_err) {
      setError('Failed to create campaign. Please check your inputs.')
    } finally {
      setIsLoading(false)
    }
  }

  // Minimum date is tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Start a Campaign
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Fill in the details below. Your campaign will be reviewed before going live.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-100">

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Title
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Give your campaign a clear title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Explain what you're raising money for and why it matters"
                required
              />
            </div>

            {/* Goal Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Funding Goal (₹)
              </label>
              <input
                type="number"
                name="goalAmount"
                value={form.goalAmount}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="How much do you need to raise?"
                min="1"
                required
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Deadline
              </label>
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={minDate}
                required
              />
            </div>

            {/* Image URL (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="url"
                name="imageUrl"
                value={form.imageUrl}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Info box */}
            <div className="bg-blue-50 text-blue-700 p-4 rounded-md text-sm">
              Your campaign will be in <strong>PENDING</strong> status until an admin approves it. Once approved it will go live and start accepting donations.
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create Campaign'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 border border-gray-300 text-gray-600 py-2.5 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateCampaignPage