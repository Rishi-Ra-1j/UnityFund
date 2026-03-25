import { Router } from 'express'
import { createUpdate, getUpdates } from '../controllers/campaignUpdate.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router({ mergeParams: true })

router.get('/', getUpdates)
router.post('/', authMiddleware, createUpdate)

export default router