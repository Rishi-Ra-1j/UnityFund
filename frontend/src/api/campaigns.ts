import api from './axios'
import type { Campaign } from '../types'

export const getCampaignsApi = async (): Promise<Campaign[]> => {
  const response = await api.get('/campaigns')
  return response.data.campaigns
}

export const getCampaignByIdApi = async (id: number): Promise<Campaign> => {
  const response = await api.get(`/campaigns/${id}`)
  return response.data.campaign
}

export const createCampaignApi = async (data: {
  title: string
  description: string
  goalAmount: number
  deadline: string
  imageUrl?: string
}): Promise<Campaign> => {
  const response = await api.post('/campaigns', data)
  return response.data.campaign
}