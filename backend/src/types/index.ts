import { Request } from 'express'

// JWT payload shape — what we store inside every token
export interface JwtPayload {
  userId: number
  role: string
}

// Extended request type — used in protected routes
// Instead of importing AuthRequest from middleware everywhere,
// import it from here — single source of truth
export interface AuthRequest extends Request {
  user?: JwtPayload
}

// Standard API response shapes
export interface ApiSuccess<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
}

//campaign types
export interface CreateCampaignBody{
  title:string
  description:string
  goalAmount:number
  deadline:string
  imageUrl?:string
}

export interface UpdateCampaignBody{
  title?: string
  description?: string
  goalAmount?: number
  deadline?: string
  imageUrl?: string
}
export interface DepositBody{
  amount: number
}

export interface CreateDonationBody{
  campaignId:number
  amount : number
  idempotencyKey: string
}
