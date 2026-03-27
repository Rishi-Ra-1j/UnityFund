import api from './axios'
import type { Wallet } from '../types'

export const getWalletApi = async (): Promise<Wallet> => {
  const response = await api.get('/wallet')
  return response.data.wallet
}

export const depositApi = async (amount: number): Promise<void> => {
  await api.post('/wallet/deposit', { amount })
}