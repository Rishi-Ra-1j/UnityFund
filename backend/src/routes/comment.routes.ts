import { Router } from 'express'
import { createComment, getComments } from '../controllers/comment.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router({ mergeParams: true })

router.get('/', getComments)
router.post('/', authMiddleware, createComment)

export default router