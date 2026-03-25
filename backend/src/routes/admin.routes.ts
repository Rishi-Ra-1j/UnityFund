import { Router } from 'express'
import {
  resolveCampaign,
  approveCampaign,
  rejectCampaign,
  pauseCampaign,
  unpauseCampaign,
  cancelCampaign,
  getAllCampaignsAdmin,
  getAllUsers
} from '../controllers/admin.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { adminMiddleware } from '../middleware/admin.middleware'

const router = Router()

// All admin routes require both auth AND admin role
router.use(authMiddleware)
router.use(adminMiddleware)

router.get('/campaigns', getAllCampaignsAdmin)
router.get('/users', getAllUsers)
router.post('/campaigns/:id/approve', approveCampaign)
router.post('/campaigns/:id/reject', rejectCampaign)
router.post('/campaigns/:id/pause', pauseCampaign)
router.post('/campaigns/:id/unpause', unpauseCampaign)
router.post('/campaigns/:id/cancel', cancelCampaign)
router.post('/campaigns/:id/resolve', resolveCampaign)

export default router