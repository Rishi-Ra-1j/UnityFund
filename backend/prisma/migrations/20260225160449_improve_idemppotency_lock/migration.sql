-- AlterTable
ALTER TABLE "IdempotencyKey" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PROCESSING';
