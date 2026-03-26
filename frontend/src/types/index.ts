export interface User {
  id: number
  name: string
  email: string
  role: string
}

export interface Campaign {
  id: number
  title: string
  description: string
  goalAmount: number
  currentAmount: number
  deadline: string
  imageUrl: string | null
  status: string
  createdAt: string
  creator: {
    id: number
    name: string
  }
}

export interface Donation {
  id: number
  amount: number
  status: string
  createdAt: string
  campaign: {
    id: number
    title: string
    status: string
    goalAmount: number
    currentAmount: number
  }
}

export interface Wallet {
  id: number
  balance: number
  lockedBalance: number
  transactions: WalletTransaction[]
}

export interface WalletTransaction {
  id: number
  type: string
  amount: number
  description: string | null
  createdAt: string
}