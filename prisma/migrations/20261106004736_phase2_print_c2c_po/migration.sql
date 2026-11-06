-- CreateEnum
CREATE TYPE "InboundStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "TransferKind" ADD VALUE 'CLINIC_TRANSFER';

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "fromClinicId" TEXT;

-- CreateTable
CREATE TABLE "InboundShipment" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "vendorName" TEXT,
    "status" "InboundStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundShipmentLine" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityExpected" DECIMAL(14,3) NOT NULL,
    "quantityReceived" DECIMAL(14,3) NOT NULL DEFAULT 0,

    CONSTRAINT "InboundShipmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboundShipment_hospitalId_status_idx" ON "InboundShipment"("hospitalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InboundShipment_hospitalId_referenceNumber_key" ON "InboundShipment"("hospitalId", "referenceNumber");

-- CreateIndex
CREATE INDEX "InboundShipmentLine_shipmentId_idx" ON "InboundShipmentLine"("shipmentId");

-- CreateIndex
CREATE INDEX "InboundShipmentLine_itemId_idx" ON "InboundShipmentLine"("itemId");

-- CreateIndex
CREATE INDEX "Transfer_fromClinicId_status_idx" ON "Transfer"("fromClinicId", "status");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromClinicId_fkey" FOREIGN KEY ("fromClinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundShipment" ADD CONSTRAINT "InboundShipment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundShipment" ADD CONSTRAINT "InboundShipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundShipmentLine" ADD CONSTRAINT "InboundShipmentLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "InboundShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundShipmentLine" ADD CONSTRAINT "InboundShipmentLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
