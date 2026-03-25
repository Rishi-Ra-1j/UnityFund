import { Response } from 'express'
import { PrismaClient, CampaignStatus, DonationStatus, TransactionType } from '@prisma/client'
import { AuthRequest } from '../types'

const prisma = new PrismaClient()

// ── RESOLVE CAMPAIGN ──────────────────────────────────────────
// POST /admin/campaigns/:id/resolve
// Checks deadline and goal — pays out or refunds
export const resolveCampaign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaignId = parseInt(req.params['id'] as string)

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        donations: {
          where: { status: DonationStatus.HELD }
        }
      }
    })

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' })
      return
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      res.status(400).json({ error: 'Only active campaigns can be resolved' })
      return
    }

    if (campaign.deadline > new Date()) {
      res.status(400).json({ error: 'Campaign deadline has not passed yet' })
      return
    }

    const goalMet = Number(campaign.currentAmount) >= Number(campaign.goalAmount)

    if (goalMet) {
      // ── SUCCESS PATH ────────────────────────────────────────
      await prisma.$transaction(async (tx) => {
        // 1. Mark campaign successful
        await tx.campaign.update({
          where: { id: campaignId },
          data: { status: CampaignStatus.SUCCESSFUL }
        })

        // 2. Mark all held donations as released
        await tx.donation.updateMany({
          where: { campaignId, status: DonationStatus.HELD },
          data: { status: DonationStatus.RELEASED }
        })

        // 3. Release locked funds from every donor's wallet
        for (const donation of campaign.donations) {
          await tx.wallet.update({
            where: { userId: donation.donorId },
            data: {
              lockedBalance: { decrement: Number(donation.amount) }
            }
          })
        }

        // 4. Find creator's wallet and add the full amount
        const creatorWallet = await tx.wallet.findUnique({
          where: { userId: campaign.creatorId }
        })

        if (!creatorWallet) throw new Error('Creator wallet not found')

        await tx.wallet.update({
          where: { id: creatorWallet.id },
          data: {
            balance: { increment: Number(campaign.currentAmount) }
          }
        })

        // 5. Log the payout in creator's wallet transactions
        await tx.walletTransaction.create({
          data: {
            walletId: creatorWallet.id,
            type: TransactionType.RELEASE,
            amount: Number(campaign.currentAmount),
            description: `Payout for campaign: ${campaign.title}`
          }
        })
      })

      res.json({ message: 'Campaign resolved as SUCCESSFUL. Creator has been paid out.' })

    } else {
      // ── FAILURE PATH ────────────────────────────────────────
      await prisma.$transaction(async (tx) => {
        // 1. Mark campaign failed
        await tx.campaign.update({
          where: { id: campaignId },
          data: { status: CampaignStatus.FAILED }
        })

        // 2. Mark all held donations as refunded
        await tx.donation.updateMany({
          where: { campaignId, status: DonationStatus.HELD },
          data: { status: DonationStatus.REFUNDED }
        })

        // 3. Refund every donor
        for (const donation of campaign.donations) {
          // Move money back from locked to available
          await tx.wallet.update({
            where: { userId: donation.donorId },
            data: {
              balance: { increment: Number(donation.amount) },
              lockedBalance: { decrement: Number(donation.amount) }
            }
          })

          // Log the refund
          const donorWallet = await tx.wallet.findUnique({
            where: { userId: donation.donorId }
          })

          if (donorWallet) {
            await tx.walletTransaction.create({
              data: {
                walletId: donorWallet.id,
                type: TransactionType.REFUND,
                amount: Number(donation.amount),
                description: `Refund from failed campaign: ${campaign.title}`,
                referenceId: donation.id
              }
            })
          }
        }
      })

      res.json({ message: 'Campaign resolved as FAILED. All donors have been refunded.' })
    }

  } catch (error) {
    console.error('Resolve campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── APPROVE CAMPAIGN ──────────────────────────────────────────
// POST /admin/campaigns/:id/approve
export const approveCampaign = async (
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

    if (campaign.status !== CampaignStatus.PENDING) {
      res.status(400).json({ error: 'Only pending campaigns can be approved' })
      return
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.ACTIVE }
    })

    res.json({ message: 'Campaign approved', campaign: updated })

  } catch (error) {
    console.error('Approve campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── REJECT CAMPAIGN ───────────────────────────────────────────
// POST /admin/campaigns/:id/reject
export const rejectCampaign = async (
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

    if (campaign.status !== CampaignStatus.PENDING) {
      res.status(400).json({ error: 'Only pending campaigns can be rejected' })
      return
    }

    // Rejected campaigns are just cancelled with no donors to refund
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.CANCELLED }
    })

    res.json({ message: 'Campaign rejected', campaign: updated })

  } catch (error) {
    console.error('Reject campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── PAUSE CAMPAIGN ────────────────────────────────────────────
// POST /admin/campaigns/:id/pause
export const pauseCampaign = async (
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

    if (campaign.status !== CampaignStatus.ACTIVE) {
      res.status(400).json({ error: 'Only active campaigns can be paused' })
      return
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.PAUSED }
    })

    res.json({ message: 'Campaign paused', campaign: updated })

  } catch (error) {
    console.error('Pause campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── UNPAUSE CAMPAIGN ──────────────────────────────────────────
// POST /admin/campaigns/:id/unpause
export const unpauseCampaign = async (
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

    if (campaign.status !== CampaignStatus.PAUSED) {
      res.status(400).json({ error: 'Only paused campaigns can be unpaused' })
      return
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.ACTIVE }
    })

    res.json({ message: 'Campaign unpaused', campaign: updated })

  } catch (error) {
    console.error('Unpause campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── CANCEL CAMPAIGN ───────────────────────────────────────────
// POST /admin/campaigns/:id/cancel
// Refunds all donors and notifies the creator
export const cancelCampaign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaignId = parseInt(req.params['id'] as string)
    const { reason } = req.body

    if (!reason) {
      res.status(400).json({ error: 'Cancel reason is required' })
      return
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        donations: {
          where: { status: DonationStatus.HELD }
        }
      }
    })

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' })
      return
    }

    const cancellableStatuses : string[] = [CampaignStatus.ACTIVE, CampaignStatus.PAUSED]
    if (!cancellableStatuses.includes(campaign.status as CampaignStatus)) {
      res.status(400).json({ error: 'Only active or paused campaigns can be cancelled' })
      return
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark campaign cancelled with reason
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.CANCELLED,
          cancelReason: reason
        }
      })

      // 2. Refund all donors
      for (const donation of campaign.donations) {
        await tx.donation.update({
          where: { id: donation.id },
          data: { status: DonationStatus.REFUNDED }
        })

        await tx.wallet.update({
          where: { userId: donation.donorId },
          data: {
            balance: { increment: Number(donation.amount) },
            lockedBalance: { decrement: Number(donation.amount) }
          }
        })

        const donorWallet = await tx.wallet.findUnique({
          where: { userId: donation.donorId }
        })

        if (donorWallet) {
          await tx.walletTransaction.create({
            data: {
              walletId: donorWallet.id,
              type: TransactionType.REFUND,
              amount: Number(donation.amount),
              description: `Refund from cancelled campaign: ${campaign.title}`,
              referenceId: donation.id
            }
          })
        }
      }

      // 3. Notify the creator
      await tx.notification.create({
        data: {
          userId: campaign.creatorId,
          message: `Your campaign "${campaign.title}" was cancelled. Reason: ${reason}`
        }
      })
    })

    res.json({ message: 'Campaign cancelled and all donors refunded' })

  } catch (error) {
    console.error('Cancel campaign error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── GET ALL CAMPAIGNS (ADMIN) ─────────────────────────────────
// GET /admin/campaigns
// Returns ALL campaigns regardless of status
export const getAllCampaignsAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { donations: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ campaigns })

  } catch (error) {
    console.error('Admin get campaigns error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── GET ALL USERS (ADMIN) ─────────────────────────────────────
// GET /admin/users
export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { campaigns: true, donations: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ users })

  } catch (error) {
    console.error('Admin get users error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}