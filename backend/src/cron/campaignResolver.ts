import cron from 'node-cron'
import { PrismaClient, CampaignStatus, DonationStatus, TransactionType } from '@prisma/client'

const prisma = new PrismaClient()

export const resolveCampaigns = async (): Promise<void> => {
  console.log('Running campaign resolution cron...')

  try {
    // Find all ACTIVE campaigns past their deadline
    const expiredCampaigns = await prisma.campaign.findMany({
      where: {
        status: CampaignStatus.ACTIVE,
        deadline: { lte: new Date() }
      },
      include: {
        donations: {
          where: { status: DonationStatus.HELD }
        }
      }
    })

    console.log(`Found ${expiredCampaigns.length} campaigns to resolve`)

    for (const campaign of expiredCampaigns) {
      const goalMet = Number(campaign.currentAmount) >= Number(campaign.goalAmount)

      try {
        if (goalMet) {
          // ── SUCCESS PATH ──────────────────────────────────────
          await prisma.$transaction(async (tx) => {
            await tx.campaign.update({
              where: { id: campaign.id },
              data: { status: CampaignStatus.SUCCESSFUL }
            })

            await tx.donation.updateMany({
              where: { campaignId: campaign.id, status: DonationStatus.HELD },
              data: { status: DonationStatus.RELEASED }
            })

            for (const donation of campaign.donations) {
              await tx.wallet.update({
                where: { userId: donation.donorId },
                data: {
                  lockedBalance: { decrement: Number(donation.amount) }
                }
              })
            }

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

            await tx.walletTransaction.create({
              data: {
                walletId: creatorWallet.id,
                type: TransactionType.RELEASE,
                amount: Number(campaign.currentAmount),
                description: `Payout for campaign: ${campaign.title}`
              }
            })

            await tx.notification.create({
              data: {
                userId: campaign.creatorId,
                message: `Congratulations! Your campaign "${campaign.title}" was successful. ₹${campaign.currentAmount} has been added to your wallet.`
              }
            })
          })

          console.log(`Campaign ${campaign.id} resolved as SUCCESSFUL`)

        } else {
          // ── FAILURE PATH ──────────────────────────────────────
          await prisma.$transaction(async (tx) => {
            await tx.campaign.update({
              where: { id: campaign.id },
              data: { status: CampaignStatus.FAILED }
            })

            await tx.donation.updateMany({
              where: { campaignId: campaign.id, status: DonationStatus.HELD },
              data: { status: DonationStatus.REFUNDED }
            })

            for (const donation of campaign.donations) {
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
                    description: `Refund from failed campaign: ${campaign.title}`,
                    referenceId: donation.id
                  }
                })
              }
            }

            await tx.notification.create({
              data: {
                userId: campaign.creatorId,
                message: `Your campaign "${campaign.title}" did not reach its goal. All donors have been refunded.`
              }
            })
          })

          console.log(`Campaign ${campaign.id} resolved as FAILED`)
        }

      } catch (err) {
        // Log but don't stop — resolve other campaigns even if one fails
        console.error(`Failed to resolve campaign ${campaign.id}:`, err)
      }
    }

  } catch (error) {
    console.error('Campaign resolution cron error:', error)
  }
}

// Run every 5 minutes
// Cron syntax: '*/5 * * * *'
// means: every 5 minutes, every hour, every day
export const startCronJobs = (): void => {
  cron.schedule('*/5 * * * *', resolveCampaigns)
  console.log('Cron jobs started — campaign resolution runs every 5 minutes')
}