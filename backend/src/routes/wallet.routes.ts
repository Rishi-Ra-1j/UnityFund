import { Router } from 'express'
import { getWallet, deposit } from '../controllers/wallet.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

// All wallet routes require auth
router.get('/', authMiddleware, getWallet)
router.post('/deposit', authMiddleware, deposit)

export default router