import { Response } from 'express'
import { PrismaClient, TransactionType } from '@prisma/client'
import { AuthRequest, DepositBody } from '../types'

const prisma = new PrismaClient()

// ── GET WALLET ────────────────────────────────────────────────
// GET /wallet
// Returns the logged in user's wallet balance
export const getWallet = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.userId },
      include: {
        // Include last 10 transactions so user can see recent activity
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' })
      return
    }

    res.json({ wallet })

  } catch (error) {
    console.error('Get wallet error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ── DEPOSIT ───────────────────────────────────────────────────
// POST /wallet/deposit
// Adds funds to the logged in user's wallet
export const deposit = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { amount } = req.body as DepositBody

    // 1. Validate amount
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Amount must be greater than 0' })
      return
    }

    // 2. Find the wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.userId }
    })

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' })
      return
    }

    // 3. Update balance AND create transaction log atomically
    const updatedWallet = await prisma.$transaction(async (tx) => {
      // Add to balance
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount }
        }
      })

      // Write to audit log
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.DEPOSIT,
          amount,
          description: `Deposit of ${amount}`
        }
      })

      return updated
    })

    res.json({
      message: 'Deposit successful',
      wallet: {
        balance: updatedWallet.balance,
        lockedBalance: updatedWallet.lockedBalance
      }
    })

  } catch (error) {
    console.error('Deposit error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}