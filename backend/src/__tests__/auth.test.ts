import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRoutes from '../routes/auth.routes'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const app = express()
app.use(cors())
app.use(express.json())
app.use('/auth', authRoutes)

// Clean up test users after all tests
afterAll(async () => {
  await prisma.wallet.deleteMany({
    where: { user: { email: { contains: 'test_jest' } } }
  })
  await prisma.user.deleteMany({
    where: { email: { contains: 'test_jest' } }
  })
  await prisma.$disconnect()
})

describe('Auth Endpoints', () => {

  const testUser = {
    name: 'Jest Test User',
    email: 'test_jest_auth@example.com',
    password: 'password123'
  }

  describe('POST /auth/signup', () => {
    it('should create a new user and return token', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send(testUser)

      expect(res.status).toBe(201)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.email).toBe(testUser.email)
      expect(res.body.user.role).toBe('USER')
    })

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send(testUser)

      expect(res.status).toBe(409)
      expect(res.body.error).toBe('Email already in use')
    })

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'test@example.com' })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })

      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
    })

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Invalid email or password')
    })

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })

      expect(res.status).toBe(401)
    })
  })
})