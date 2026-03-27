import api from './axios'

export const getAdminCampaignsApi = async () => {
  const response = await api.get('/admin/campaigns')
  return response.data.campaigns
}

export const getAdminUsersApi = async () => {
  const response = await api.get('/admin/users')
  return response.data.users
}

export const approveCampaignApi = async (id: number) => {
  const response = await api.post(`/admin/campaigns/${id}/approve`)
  return response.data
}

export const rejectCampaignApi = async (id: number) => {
  const response = await api.post(`/admin/campaigns/${id}/reject`)
  return response.data
}

export const pauseCampaignApi = async (id: number) => {
  const response = await api.post(`/admin/campaigns/${id}/pause`)
  return response.data
}

export const unpauseCampaignApi = async (id: number) => {
  const response = await api.post(`/admin/campaigns/${id}/unpause`)
  return response.data
}

export const cancelCampaignApi = async (id: number, reason: string) => {
  const response = await api.post(`/admin/campaigns/${id}/cancel`, { reason })
  return response.data
}