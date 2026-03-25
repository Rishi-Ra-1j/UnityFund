// src/middleware/admin.middleware.ts
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // authMiddleware runs first so req.user is already set
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}