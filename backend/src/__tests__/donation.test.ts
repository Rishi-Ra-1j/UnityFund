import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRoutes from '../routes/auth.routes'
import donationRoutes from '../routes/donation.routes'
import walletRoutes from '../routes/wallet.routes'
import campaignRoutes from '../routes/campaign.routes'
import { authMiddleware } from '../middleware/auth.middleware'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const app = express()
app.use(cors())
app.use(express.json())
app.use('/auth', authRoutes)
app.use('/wallet', walletRoutes)
app.use('/campaigns', campaignRoutes)
app.use('/donations', donationRoutes)

// Test data
let donorToken: string
let donorId: number
let campaignId: number

// Setup — create test user, deposit funds, create campaign
beforeAll(async () => {
  // Create donor
  const signupRes = await request(app)
    .post('/auth/signup')
    .send({
      name: 'Jest Donor',
      email: 'test_jest_donor@example.com',
      password: 'password123'
    })

  donorToken = signupRes.body.token
  donorId = signupRes.body.user.id

  // Deposit funds directly in DB for speed
  await prisma.wallet.update({
    where: { userId: donorId },
    data: { balance: 1000 }
  })

  // Create and activate a campaign
  const creatorSignup = await request(app)
    .post('/auth/signup')
    .send({
      name: 'Jest Creator',
      email: 'test_jest_creator@example.com',
      password: 'password123'
    })

  const creatorToken = creatorSignup.body.token

  const campaignRes = await request(app)
    .post('/campaigns')
    .set('Authorization', `Bearer ${creatorToken}`)
    .send({
      title: 'Jest Test Campaign',
      description: 'Testing donations',
      goalAmount: 500,
      deadline: '2027-12-31T00:00:00.000Z'
    })

  campaignId = campaignRes.body.campaign.id

  // Activate campaign directly in DB
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'ACTIVE' }
  })
})

// Cleanup after all tests
afterAll(async () => {
  await prisma.walletTransaction.deleteMany({
    where: { wallet: { user: { email: { contains: 'test_jest' } } } }
  })
  await prisma.donation.deleteMany({
    where: { campaign: { title: 'Jest Test Campaign' } }
  })
  await prisma.campaign.deleteMany({
    where: { title: 'Jest Test Campaign' }
  })
  await prisma.wallet.deleteMany({
    where: { user: { email: { contains: 'test_jest' } } }
  })
  await prisma.user.deleteMany({
    where: { email: { contains: 'test_jest' } }
  })
  await prisma.$disconnect()
})

describe('Donation Endpoints', () => {

  describe('POST /donations', () => {

    it('should successfully donate to a campaign', async () => {
      const res = await request(app)
        .post('/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          campaignId,
          amount: 100,
          idempotencyKey: crypto.randomUUID()
        })

      expect(res.status).toBe(201)
      expect(res.body.donation.status).toBe('HELD')

      // Verify wallet balance decreased
      const wallet = await prisma.wallet.findUnique({
        where: { userId: donorId }
      })
      expect(Number(wallet!.balance)).toBe(900)
      expect(Number(wallet!.lockedBalance)).toBe(100)
    })

    it('should reject donation with insufficient balance', async () => {
      const res = await request(app)
        .post('/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          campaignId,
          amount: 99999,
          idempotencyKey: crypto.randomUUID()
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Insufficient balance')
    })

    it('should handle idempotency — duplicate request ignored', async () => {
      const idempotencyKey = crypto.randomUUID()

      // First request
      const res1 = await request(app)
        .post('/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ campaignId, amount: 50, idempotencyKey })

      // Second request with same key
      const res2 = await request(app)
        .post('/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ campaignId, amount: 50, idempotencyKey })

      expect(res1.status).toBe(201)
      expect(res2.status).toBe(200)
      expect(res2.body.message).toBe('Donation already processed')

      // Verify money was only deducted once
      const wallet = await prisma.wallet.findUnique({
        where: { userId: donorId }
      })
      // Balance should be 900 - 50 = 850 (not 800)
      expect(Number(wallet!.balance)).toBe(850)
    })

    it('should handle concurrent donations without race condition', async () => {
      // Reset wallet balance for clean test
      await prisma.wallet.update({
        where: { userId: donorId },
        data: { balance: 200, lockedBalance: 0 }
      })

      // Also reset campaign for clean test
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { currentAmount: 0 }
      })

      await prisma.donation.deleteMany({
        where: { campaignId }
      })

      // Fire two concurrent donations of 150 each
      // Wallet only has 200 — only one should succeed
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/donations')
          .set('Authorization', `Bearer ${donorToken}`)
          .send({ campaignId, amount: 150, idempotencyKey: crypto.randomUUID() }),
        request(app)
          .post('/donations')
          .set('Authorization', `Bearer ${donorToken}`)
          .send({ campaignId, amount: 150, idempotencyKey: crypto.randomUUID() })
      ])

      // One should succeed, one should fail
      const statuses = [res1.status, res2.status].sort()
      expect(statuses).toContain(201) // one succeeded
      expect(statuses).toContain(400) // one failed

      // Most importantly — balance should never go negative
      const wallet = await prisma.wallet.findUnique({
        where: { userId: donorId }
      })
      expect(Number(wallet!.balance)).toBeGreaterThanOrEqual(0)
      expect(Number(wallet!.lockedBalance)).toBeGreaterThanOrEqual(0)

      // Total balance should add up correctly
      const total = Number(wallet!.balance) + Number(wallet!.lockedBalance)
      expect(total).toBe(200)
    })

  })
})