import { Response } from 'express'
import { PrismaClient, CampaignStatus } from '@prisma/client'
import { AuthRequest, CreateCampaignBody, UpdateCampaignBody } from '../types'

const prisma = new PrismaClient()

// ── CREATE CAMPAIGN ───────────────────────────────────────────
export const createCampaign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, description, goalAmount, deadline, imageUrl } =
      req.body as CreateCampaignBody

    if (!title || !description || !goalAmount || !deadline) {
      res.status(400).json({ error: 'Title, description, goalAmount and deadline are required' })
      return
    }

    if (goalAmount <= 0) {
      res.status(400).json({ error: 'Goal amount must be greater than 0' })
      return
    }

    const deadlineDate = new Date(deadline)
    if (deadlineDate <= new Date()) {
      res.status(400).json({ error: 'Deadline must be in the future' })
      return
    }

    const campaign = await prisma.campaign.create({
      data: {
        title,
        description,
        goalAmount,
        deadline: deadlineDate,
        imageUrl,
        creatorId: req.user!.userId,
      }
    })

    res.status(201).json({ campaign })

  } catch (error) {
    console.error('Create campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── GET ALL CAMPAIGNS ─────────────────────────────────────────
export const getCampaigns = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Pagination params from query string
    // GET /campaigns?page=1&limit=10
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1)
    const limit = Math.min(50, parseInt(req.query['limit'] as string) || 10)
    const skip = (page - 1) * limit

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { status: CampaignStatus.ACTIVE },
        select: {
          id: true,
          title: true,
          description: true,
          goalAmount: true,
          currentAmount: true,
          deadline: true,
          imageUrl: true,
          status: true,
          createdAt: true,
          creator: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.campaign.count({
        where: { status: CampaignStatus.ACTIVE }
      })
    ])

    res.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Get campaigns error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── GET SINGLE CAMPAIGN ───────────────────────────────────────
export const getCampaignById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Fix 2: cast to string first — req.params.id can technically
    // be string | string[] but in Express routes it's always string
    const campaignId = parseInt(req.params['id'] as string)

    if (isNaN(campaignId)) {
      res.status(400).json({ error: 'Invalid campaign ID' })
      return
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: {
          select: { id: true, name: true }
        },
        comments: {
          include: {
            author: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        updates: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' })
      return
    }

    res.json({ campaign })

  } catch (error) {
    console.error('Get campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── UPDATE CAMPAIGN ───────────────────────────────────────────
export const updateCampaign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaignId = parseInt(req.params['id'] as string)
    const { title, description, goalAmount, deadline, imageUrl } =
      req.body as UpdateCampaignBody

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' })
      return
    }

    if (campaign.creatorId !== req.user!.userId) {
      res.status(403).json({ error: 'You are not the creator of this campaign' })
      return
    }

    // Fix 3: use a plain string array instead of CampaignStatus enum array
    // so TypeScript can compare correctly
    const editableStatuses: string[] = [CampaignStatus.PENDING, CampaignStatus.ACTIVE]
    if (!editableStatuses.includes(campaign.status)) {
      res.status(400).json({ error: 'Only pending or active campaigns can be updated' })
      return
    }

    const updateData: Partial<{
      title: string
      description: string
      goalAmount: number
      deadline: Date
      imageUrl: string
    }> = {}

    if (title) updateData.title = title
    if (description) updateData.description = description
    if (goalAmount && goalAmount > 0) updateData.goalAmount = goalAmount
    if (deadline) {
      const deadlineDate = new Date(deadline)
      if (deadlineDate <= new Date()) {
        res.status(400).json({ error: 'Deadline must be in the future' })
        return
      }
      updateData.deadline = deadlineDate
    }
    if (imageUrl) updateData.imageUrl = imageUrl

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData
    })

    res.json({ campaign: updated })

  } catch (error) {
    console.error('Update campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── DELETE CAMPAIGN ───────────────────────────────────────────
export const deleteCampaign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaignId = parseInt(req.params['id'] as string)

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' })
      return
    }

    if (campaign.creatorId !== req.user!.userId) {
      res.status(403).json({ error: 'You are not the creator of this campaign' })
      return
    }

    if (campaign.status !== CampaignStatus.PENDING) {
      res.status(400).json({ error: 'Only pending campaigns can be deleted' })
      return
    }

    await prisma.campaign.delete({ where: { id: campaignId } })

    res.json({ message: 'Campaign deleted successfully' })

  } catch (error) {
    console.error('Delete campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── GET MY CAMPAIGNS ──────────────────────────────────────────
// GET /campaigns/my
// Returns all campaigns created by the logged in user
export const getMyCampaigns = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { creatorId: req.user!.userId },
      include: {
        _count: { select: { donations: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ campaigns })

  } catch (error) {
    console.error('Get my campaigns error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}