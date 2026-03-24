import { Router } from 'express'
import { createDonation, getMyDonations } from '../controllers/donation.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

router.post('/', authMiddleware, createDonation)
router.get('/', authMiddleware, getMyDonations)

export default router