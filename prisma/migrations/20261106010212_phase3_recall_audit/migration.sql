-- CreateEnum
CREATE TYPE "RecallStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecallTaskStatus" AS ENUM ('OPEN', 'RETURNED', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Lot" ADD COLUMN     "onHold" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RecallCampaign" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "status" "RecallStatus" NOT NULL DEFAULT 'OPEN',
    "referenceNumber" TEXT,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "lotId" TEXT,
    "itemId" TEXT,
    "ndc" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecallCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallReturnTask" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(14,3) NOT NULL,
    "quantityReturned" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "status" "RecallTaskStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "returnedAt" TIMESTAMP(3),
    "returnedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecallReturnTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecallCampaign_hospitalId_status_idx" ON "RecallCampaign"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "RecallCampaign_lotId_idx" ON "RecallCampaign"("lotId");

-- CreateIndex
CREATE INDEX "RecallCampaign_itemId_idx" ON "RecallCampaign"("itemId");

-- CreateIndex
CREATE INDEX "RecallReturnTask_campaignId_status_idx" ON "RecallReturnTask"("campaignId", "status");

-- CreateIndex
CREATE INDEX "RecallReturnTask_clinicId_status_idx" ON "RecallReturnTask"("clinicId", "status");

-- CreateIndex
CREATE INDEX "RecallReturnTask_lotId_idx" ON "RecallReturnTask"("lotId");

-- CreateIndex
CREATE INDEX "Lot_hospitalId_onHold_idx" ON "Lot"("hospitalId", "onHold");

-- AddForeignKey
ALTER TABLE "RecallCampaign" ADD CONSTRAINT "RecallCampaign_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCampaign" ADD CONSTRAINT "RecallCampaign_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCampaign" ADD CONSTRAINT "RecallCampaign_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCampaign" ADD CONSTRAINT "RecallCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallReturnTask" ADD CONSTRAINT "RecallReturnTask_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RecallCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallReturnTask" ADD CONSTRAINT "RecallReturnTask_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallReturnTask" ADD CONSTRAINT "RecallReturnTask_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallReturnTask" ADD CONSTRAINT "RecallReturnTask_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallReturnTask" ADD CONSTRAINT "RecallReturnTask_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallReturnTask" ADD CONSTRAINT "RecallReturnTask_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallReturnTask" ADD CONSTRAINT "RecallReturnTask_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
