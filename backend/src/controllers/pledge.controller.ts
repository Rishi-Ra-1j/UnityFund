import { Request, Response } from "express";
import prisma from "../utils/prisma";

/**
 * Extend Request to include userId injected by auth middleware
 */
interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Define request body type
 */
interface PledgeBody {
  campaignId: string;
  amount: number;
}

export const createPledge = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { campaignId, amount } = req.body as PledgeBody;

    if (!campaignId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const idempotencyKey = req.get("Idempotency-Key");

    if (!idempotencyKey) {
      return res.status(400).json({ message: "Idempotency-Key required" });
    }

    let responsePayload: any = null;

    await prisma.$transaction(async (tx) => {

      /**
       * 🔐 STEP 1 — Try to create idempotency lock
       */
      try {
        await tx.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            userId,
            status: "PROCESSING",
          },
        });
      } catch {
        // If key already exists
        const existing = await tx.idempotencyKey.findUnique({
          where: { key: idempotencyKey },
        });

        if (existing?.response) {
          responsePayload = existing.response;
          return;
        }

        throw new Error("Duplicate request in progress");
      }

      /**
       * 💰 Wallet validation
       */
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) throw new Error("Wallet not found");
      if (wallet.balance < amount) throw new Error("Insufficient balance");

      /**
       * 🎯 Campaign validation
       */
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign || campaign.status !== "ACTIVE") {
        throw new Error("Campaign not active");
      }

      /**
       * 🔻 Deduct wallet
       */
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      /**
       * 🔺 Add to escrow
       */
      await tx.escrowAccount.update({
        where: { campaignId },
        data: { balance: { increment: amount } },
      });

      /**
       * 📊 Update campaign funding
       */
      const updatedCampaign = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          fundedAmount: { increment: amount },
        },
      });

      if (updatedCampaign.fundedAmount >= updatedCampaign.goalAmount) {
        await tx.campaign.update({
          where: { id: campaignId },
          data: { status: "SUCCESSFUL" },
        });
      }

      /**
       * 📝 Create pledge
       */
      await tx.pledge.create({
        data: {
          campaignId,
          donorId: userId,
          amount,
          status: "PENDING",
        },
      });

      /**
       * 📚 Ledger entry
       */
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEBIT",
          amount,
          status: "COMPLETED",
          referenceType: "PLEDGE",
          referenceId: campaignId,
        },
      });

      responsePayload = { message: "Pledge successful" };

      /**
       * ✅ Mark idempotency completed
       */
      await tx.idempotencyKey.update({
        where: { key: idempotencyKey },
        data: {
          response: responsePayload,
          status: "COMPLETED",
        },
      });

    });

    return res.json(responsePayload);

  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};