import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../types'

const prisma = new PrismaClient()

// ── CREATE CAMPAIGN UPDATE ────────────────────────────────────
// POST /campaigns/:id/updates
// Creator only
export const createUpdate = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaignId = parseInt(req.params['id'] as string)
    const { title, content } = req.body

    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' })
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

    // Only the creator can post updates
    if (campaign.creatorId !== req.user!.userId) {
      res.status(403).json({ error: 'Only the campaign creator can post updates' })
      return
    }

    const update = await prisma.campaignUpdate.create({
      data: {
        campaignId,
        title,
        content
      }
    })

    res.status(201).json({ update })

  } catch (error) {
    console.error('Create update error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── GET CAMPAIGN UPDATES ──────────────────────────────────────
// GET /campaigns/:id/updates
// Public
export const getUpdates = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaignId = parseInt(req.params['id'] as string)

    const updates = await prisma.campaignUpdate.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ updates })

  } catch (error) {
    console.error('Get updates error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}