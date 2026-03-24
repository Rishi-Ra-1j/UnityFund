import { Response } from 'express'
import { PrismaClient, CampaignStatus, TransactionType, DonationStatus } from '@prisma/client'
import { AuthRequest, CreateDonationBody } from '../types'

const prisma = new PrismaClient()

// ── CREATE DONATION ───────────────────────────────────────────
// POST /donations
// Auth required — logged in users only
export const createDonation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { campaignId, amount, idempotencyKey } =
      req.body as CreateDonationBody

    // 1. Validate input
    if (!campaignId || !amount || !idempotencyKey) {
      res.status(400).json({ error: 'campaignId, amount and idempotencyKey are required' })
      return
    }

    if (amount <= 0) {
      res.status(400).json({ error: 'Amount must be greater than 0' })
      return
    }

    // 2. Check idempotency — if this key was already used, return
    // the original donation silently. Duplicate request, not an error.
    const existingDonation = await prisma.donation.findUnique({
      where: { idempotencyKey }
    })

    if (existingDonation) {
      res.status(200).json({
        message: 'Donation already processed',
        donation: existingDonation
      })
      return
    }

    // 3. Find the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' })
      return
    }

    // 4. Campaign must be ACTIVE to accept donations
    if (campaign.status !== CampaignStatus.ACTIVE) {
      res.status(400).json({ error: 'Campaign is not accepting donations' })
      return
    }

    // 5. Campaign must not be past deadline
    if (campaign.deadline < new Date()) {
      res.status(400).json({ error: 'Campaign deadline has passed' })
      return
    }

    // 6. Find donor's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.userId }
    })

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' })
      return
    }

    // 7. Check donor has enough balance
    if (Number(wallet.balance) < amount) {
      res.status(400).json({ error: 'Insufficient balance' })
      return
    }

    // 8. Handle overfunding — only accept what the campaign still needs
    // Example: goal=5000, currentAmount=4800, someone donates 500
    // We only take 200, not 500
    const remaining = Number(campaign.goalAmount) - Number(campaign.currentAmount)

    if (remaining <= 0) {
      res.status(400).json({ error: 'Campaign is already fully funded' })
      return
    }

    // The actual amount we will accept
    const acceptedAmount = Math.min(amount, remaining)
    // The excess we immediately return (0 if no overfunding)
    const refundedAmount = amount - acceptedAmount

    // 9. Everything checks out — run the full donation atomically
    const donation = await prisma.$transaction(async (tx) => {

      // a. Create the donation record
      const newDonation = await tx.donation.create({
        data: {
          donorId: req.user!.userId,
          campaignId,
          amount: acceptedAmount,
          idempotencyKey,
          status: DonationStatus.HELD
        }
      })

      // b. Deduct from donor's balance, add to lockedBalance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: acceptedAmount },
          lockedBalance: { increment: acceptedAmount }
        }
      })

      // c. Log the donation in wallet transactions
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.DONATION,
          amount: acceptedAmount,
          description: `Donation to campaign: ${campaign.title}`,
          referenceId: newDonation.id
        }
      })

      // d. Increase campaign's currentAmount
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          currentAmount: { increment: acceptedAmount }
        }
      })

      return newDonation
    })

    // 10. Build the response message
    // Tell the donor if their amount was adjusted due to overfunding
    const message = refundedAmount > 0
      ? `Donation accepted. ${acceptedAmount} donated, ${refundedAmount} was not needed and not charged.`
      : 'Donation successful'

    res.status(201).json({ message, donation })

  } catch (error) {
    console.error('Donation error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── GET MY DONATIONS ──────────────────────────────────────────
// GET /donations
// Returns the logged in user's donation history
export const getMyDonations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const donations = await prisma.donation.findMany({
      where: { donorId: req.user!.userId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
            goalAmount: true,
            currentAmount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ donations })

  } catch (error) {
    console.error('Get donations error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}