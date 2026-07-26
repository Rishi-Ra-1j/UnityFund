import { Response } from 'express'
import { PrismaClient, CampaignStatus, TransactionType, DonationStatus } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { AuthRequest, CreateDonationBody } from '../types'

const prisma = new PrismaClient()

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

    // 2. Idempotency check — outside transaction is fine here
    // because we're only reading, not writing
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

    // 3. Check campaign exists and is active — outside transaction
    // We'll re-verify inside with a lock
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' })
      return
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      res.status(400).json({ error: 'Campaign is not accepting donations' })
      return
    }

    if (campaign.deadline < new Date()) {
      res.status(400).json({ error: 'Campaign deadline has passed' })
      return
    }

    // 4. Everything from here runs inside a transaction with row locks
    // This prevents race conditions on both wallet and campaign
    const result = await prisma.$transaction(async (tx) => {

      // ── Lock the wallet row ──────────────────────────────────
      // SELECT FOR UPDATE locks this row until transaction commits
      // Any concurrent donation from same wallet must wait here
      const walletRows = await tx.$queryRaw<Array<{
        id: number
        balance: string
        lockedBalance: string
        userId: number
      }>>`
        SELECT id, balance, "lockedBalance", "userId"
        FROM "Wallet"
        WHERE "userId" = ${req.user!.userId}
        FOR UPDATE
      `

      if (walletRows.length === 0) {
        throw new Error('WALLET_NOT_FOUND')
      }

      const walletRow = walletRows[0]

      // ── Use Decimal for safe money comparison ────────────────
      // Decimal.js avoids floating point precision issues
      const walletBalance = new Decimal(walletRow.balance)
      const donationAmount = new Decimal(amount)

      if (walletBalance.lessThan(donationAmount)) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      // ── Lock the campaign row ────────────────────────────────
      // Prevents overfunding race condition
      const campaignRows = await tx.$queryRaw<Array<{
        id: number
        currentAmount: string
        goalAmount: string
        status: string
      }>>`
        SELECT id, "currentAmount", "goalAmount", status
        FROM "Campaign"
        WHERE id = ${campaignId}
        FOR UPDATE
      `

      if (campaignRows.length === 0) {
        throw new Error('CAMPAIGN_NOT_FOUND')
      }

      const campaignRow = campaignRows[0]

      // ── Re-verify campaign is still active after lock ────────
      if (campaignRow.status !== CampaignStatus.ACTIVE) {
        throw new Error('CAMPAIGN_NOT_ACTIVE')
      }

      // ── Calculate accepted amount using Decimal ──────────────
      const currentAmount = new Decimal(campaignRow.currentAmount)
      const goalAmount = new Decimal(campaignRow.goalAmount)
      const remaining = goalAmount.minus(currentAmount)

      if (remaining.lessThanOrEqualTo(0)) {
        throw new Error('CAMPAIGN_FULLY_FUNDED')
      }

      // Only accept what the campaign still needs
      const acceptedAmount = Decimal.min(donationAmount, remaining)
      const refundedAmount = donationAmount.minus(acceptedAmount)

      // ── Create donation record ───────────────────────────────
      const newDonation = await tx.donation.create({
        data: {
          donorId: req.user!.userId,
          campaignId,
          amount: acceptedAmount.toNumber(),
          idempotencyKey,
          status: DonationStatus.HELD
        }
      })

      // ── Update wallet: deduct from balance, add to locked ────
      await tx.wallet.update({
        where: { id: walletRow.id },
        data: {
          balance: { decrement: acceptedAmount.toNumber() },
          lockedBalance: { increment: acceptedAmount.toNumber() }
        }
      })

      // ── Log wallet transaction ───────────────────────────────
      await tx.walletTransaction.create({
        data: {
          walletId: walletRow.id,
          type: TransactionType.DONATION,
          amount: acceptedAmount.toNumber(),
          description: `Donation to campaign: ${campaign.title}`,
          referenceId: newDonation.id
        }
      })

      // ── Update campaign current amount ───────────────────────
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          currentAmount: { increment: acceptedAmount.toNumber() }
        }
      })

      return {
        donation: newDonation,
        acceptedAmount: acceptedAmount.toNumber(),
        refundedAmount: refundedAmount.toNumber()
      }
    })

    const message = result.refundedAmount > 0
      ? `Donation accepted. ₹${result.acceptedAmount} donated, ₹${result.refundedAmount} was not needed.`
      : 'Donation successful'

    res.status(201).json({ message, donation: result.donation })

  } catch (error) {
    // Handle specific errors thrown inside transaction
    if (error instanceof Error) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        res.status(400).json({ error: 'Insufficient balance' })
        return
      }
      if (error.message === 'CAMPAIGN_NOT_FOUND') {
        res.status(404).json({ error: 'Campaign not found' })
        return
      }
      if (error.message === 'CAMPAIGN_NOT_ACTIVE') {
        res.status(400).json({ error: 'Campaign is not accepting donations' })
        return
      }
      if (error.message === 'CAMPAIGN_FULLY_FUNDED') {
        res.status(400).json({ error: 'Campaign is already fully funded' })
        return
      }
      if (error.message === 'WALLET_NOT_FOUND') {
        res.status(404).json({ error: 'Wallet not found' })
        return
      }
    }

    console.error('Donation error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── GET MY DONATIONS ──────────────────────────────────────────
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