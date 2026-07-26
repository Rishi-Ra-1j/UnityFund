import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes'
import campaignRoutes from './routes/campaign.routes'
import walletRoutes from './routes/wallet.routes'
import donationRoutes from './routes/donation.routes'
import adminRoutes from './routes/admin.routes'
import commentRoutes from './routes/comment.routes'
import campaignUpdateRoutes from './routes/campaignUpdate.routes'
import { startCronJobs } from './cron/campaignResolver'
const app = express()

// ── Middleware ───────────────────────────────────────────────
app.use(cors())
app.use(express.json())

// ── Routes ───────────────────────────────────────────────────
app.use('/auth', authRoutes)
app.use('/campaigns',campaignRoutes)
app.use('/campaigns/:id/comments', commentRoutes)
app.use('/campaigns/:id/updates',campaignUpdateRoutes)
app.use('/wallet',walletRoutes)
app.use('/donations',donationRoutes)
app.use('/admin',adminRoutes)
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  startCronJobs()
})