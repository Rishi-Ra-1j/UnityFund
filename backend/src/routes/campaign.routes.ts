import { Router } from 'express'
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign
} from '../controllers/campaign.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

// Public routes — no auth needed
router.get('/', getCampaigns)
router.get('/:id', getCampaignById)

// Protected routes — auth required
router.post('/', authMiddleware, createCampaign)
router.patch('/:id', authMiddleware, updateCampaign)
router.delete('/:id', authMiddleware, deleteCampaign)

export default router