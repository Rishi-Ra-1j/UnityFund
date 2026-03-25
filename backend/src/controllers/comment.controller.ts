import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../types'

const prisma = new PrismaClient()

// ── CREATE COMMENT ────────────────────────────────────────────
// POST /campaigns/:id/comments
// Any logged in user can comment
export const createComment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaignId = parseInt(req.params['id'] as string)
    const { content } = req.body

    if (!content || content.trim() === '') {
      res.status(400).json({ error: 'Comment content is required' })
      return
    }

    // Check campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' })
      return
    }

    const comment = await prisma.comment.create({
      data: {
        campaignId,
        authorId: req.user!.userId,
        content: content.trim()
      },
      include: {
        author: { select: { id: true, name: true } }
      }
    })

    res.status(201).json({ comment })

  } catch (error) {
    console.error('Create comment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── GET COMMENTS ──────────────────────────────────────────────
// GET /campaigns/:id/comments
// Public
export const getComments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaignId = parseInt(req.params['id'] as string)

    const comments = await prisma.comment.findMany({
      where: { campaignId },
      include: {
        author: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ comments })

  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}