import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes'
import campaignRoutes from './routes/campaign.routes'
import walletRoutes from './routes/wallet.routes'
const app = express()

// ── Middleware ───────────────────────────────────────────────
app.use(cors())
app.use(express.json())

// ── Routes ───────────────────────────────────────────────────
app.use('/auth', authRoutes)
app.use('/campaigns',campaignRoutes)
app.use('/wallet',walletRoutes)
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})