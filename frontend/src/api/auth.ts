import api from './axios'
import type { User } from '../types'

interface AuthResponse {
  token: string
  user: User
}

export const loginApi = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export const signupApi = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/signup', { name, email, password })
  return response.data
}

export const getMeApi = async (): Promise<User> => {
  const response = await api.get('/auth/me')
  return response.data.user
}