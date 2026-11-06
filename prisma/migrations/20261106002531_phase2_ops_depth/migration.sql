-- CreateTable
CREATE TABLE "ClinicParLevel" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "parQty" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicParLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicParLevel_hospitalId_idx" ON "ClinicParLevel"("hospitalId");

-- CreateIndex
CREATE INDEX "ClinicParLevel_clinicId_idx" ON "ClinicParLevel"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicParLevel_clinicId_itemId_key" ON "ClinicParLevel"("clinicId", "itemId");

-- AddForeignKey
ALTER TABLE "ClinicParLevel" ADD CONSTRAINT "ClinicParLevel_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicParLevel" ADD CONSTRAINT "ClinicParLevel_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicParLevel" ADD CONSTRAINT "ClinicParLevel_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
