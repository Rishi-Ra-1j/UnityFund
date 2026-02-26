import prisma from "../utils/prisma";

export const processCampaignExpiry = async () => {
  const now = new Date();

  const expiredCampaigns = await prisma.campaign.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lt: now },
    },
  });

  for (const campaign of expiredCampaigns) {
    if (campaign.fundedAmount >= campaign.goalAmount) {
      // SUCCESS
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "SUCCESSFUL" },
      });
    } else {
      // FAILED → refund
      await refundCampaign(campaign.id);
    }
  }
};
const refundCampaign = async (campaignId: string) => {
  await prisma.$transaction(async (tx) => {

    const pledges = await tx.pledge.findMany({
      where: { campaignId },
    });

    for (const pledge of pledges) {

      // 1️⃣ Credit user wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId: pledge.donorId },
      });

      if (!wallet) continue;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: pledge.amount },
        },
      });

      // 2️⃣ Update escrow
      await tx.escrowAccount.update({
        where: { campaignId },
        data: {
          balance: { decrement: pledge.amount },
        },
      });

      // 3️⃣ Mark pledge refunded
      await tx.pledge.update({
        where: { id: pledge.id },
        data: { status: "REFUNDED" },
      });

      // 4️⃣ Ledger entry
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "CREDIT",
          amount: pledge.amount,
          status: "COMPLETED",
          referenceType: "REFUND",
          referenceId: campaignId,
        },
      });
    }

    // 5️⃣ Mark campaign failed
    await tx.campaign.update({
      where: { id: campaignId },
      data: { status: "FAILED" },
    });

  });
};