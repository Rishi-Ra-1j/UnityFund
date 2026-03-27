import api from './axios'

export const donateToCampaignApi = async (data: {
  campaignId: number
  amount: number
  idempotencyKey: string
}) => {
  const response = await api.post('/donations', data)
  return response.data
}

export const getMyDonationsApi = async () => {
  const response = await api.get('/donations')
  return response.data.donations
}