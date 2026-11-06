import { PrismaClient, CommodityClass, TempZone, LocationKind, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("docklog123", 10);

  await prisma.auditEvent.deleteMany();
  await prisma.recallReturnTask.deleteMany();
  await prisma.recallCampaign.deleteMany();
  await prisma.transferLine.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.supplyRequestLine.deleteMany();
  await prisma.supplyRequest.deleteMany();
  await prisma.inboundShipmentLine.deleteMany();
  await prisma.inboundShipment.deleteMany();
  await prisma.clinicParLevel.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.item.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.hospital.deleteMany();

  const hospital = await prisma.hospital.create({
    data: {
      code: "MHMC",
      name: "Meridian Hospital Medical Center",
    },
  });

  const warehouse = await prisma.warehouse.create({
    data: {
      hospitalId: hospital.id,
      code: "MAIN",
      name: "Central Supply Warehouse",
    },
  });

  const pharmacy = await prisma.clinic.create({
    data: {
      hospitalId: hospital.id,
      code: "PHARM",
      name: "Hospital Pharmacy",
      logisticsPushEnabled: true,
      isPharmacySos: true,
    },
  });

  const orthoClinic = await prisma.clinic.create({
    data: {
      hospitalId: hospital.id,
      code: "ORTHO",
      name: "Orthopedics Clinic",
      logisticsPushEnabled: true,
      isPharmacySos: false,
    },
  });

  const medSurgClinic = await prisma.clinic.create({
    data: {
      hospitalId: hospital.id,
      code: "MS3",
      name: "Med-Surg Unit 3",
      logisticsPushEnabled: false,
      isPharmacySos: false,
    },
  });

  const warehouseLocations = await Promise.all([
    prisma.location.create({
      data: {
        hospitalId: hospital.id,
        warehouseId: warehouse.id,
        code: "DOCK-01",
        name: "Receiving Dock",
        kind: LocationKind.WAREHOUSE,
        tempZone: TempZone.AMBIENT,
      },
    }),
    prisma.location.create({
      data: {
        hospitalId: hospital.id,
        warehouseId: warehouse.id,
        code: "A-12-04",
        name: "Ambient Aisle A / Bay 12 / Bin 04",
        kind: LocationKind.WAREHOUSE,
        tempZone: TempZone.AMBIENT,
      },
    }),
    prisma.location.create({
      data: {
        hospitalId: hospital.id,
        warehouseId: warehouse.id,
        code: "COLD-01",
        name: "Cold Room 2–8°C",
        kind: LocationKind.WAREHOUSE,
        tempZone: TempZone.REFRIGERATED,
      },
    }),
    prisma.location.create({
      data: {
        hospitalId: hospital.id,
        warehouseId: warehouse.id,
        code: "FRZ-01",
        name: "Frozen Storage −20°C",
        kind: LocationKind.WAREHOUSE,
        tempZone: TempZone.FROZEN,
      },
    }),
    prisma.location.create({
      data: {
        hospitalId: hospital.id,
        warehouseId: warehouse.id,
        code: "STAGE-01",
        name: "Clinic Issue Staging",
        kind: LocationKind.WAREHOUSE,
        tempZone: TempZone.CONTROLLED_ROOM,
      },
    }),
  ]);

  await prisma.location.create({
    data: {
      hospitalId: hospital.id,
      clinicId: pharmacy.id,
      code: "PHARM-CAB-01",
      name: "Pharmacy Main Cabinet",
      kind: LocationKind.CLINIC,
      tempZone: TempZone.CONTROLLED_ROOM,
    },
  });

  await prisma.location.create({
    data: {
      hospitalId: hospital.id,
      clinicId: pharmacy.id,
      code: "PHARM-REF-01",
      name: "Pharmacy Refrigerator",
      kind: LocationKind.CLINIC,
      tempZone: TempZone.REFRIGERATED,
    },
  });

  await prisma.location.create({
    data: {
      hospitalId: hospital.id,
      clinicId: orthoClinic.id,
      code: "ORTHO-CART-01",
      name: "Ortho Supply Cart",
      kind: LocationKind.CLINIC,
      tempZone: TempZone.AMBIENT,
    },
  });

  await prisma.location.create({
    data: {
      hospitalId: hospital.id,
      clinicId: medSurgClinic.id,
      code: "MS3-CAB-01",
      name: "Med-Surg 3 Supply Cabinet",
      kind: LocationKind.CLINIC,
      tempZone: TempZone.AMBIENT,
    },
  });

  const gloveItem = await prisma.item.create({
    data: {
      hospitalId: hospital.id,
      sku: "GLV-NIT-M",
      name: "Nitrile Exam Gloves, Medium",
      description: "Box of 100, powder-free",
      uom: "BX",
      upc: "00012345678901",
      commodityClass: CommodityClass.EXPENDABLE_MEDICAL_SUPPLY,
      requiresCold: false,
    },
  });

  const gauzeItem = await prisma.item.create({
    data: {
      hospitalId: hospital.id,
      sku: "GZ-4X4-ST",
      name: "Gauze Sponges 4x4 Sterile",
      description: "Pack of 25",
      uom: "PK",
      commodityClass: CommodityClass.EXPENDABLE_MEDICAL_SUPPLY,
      requiresCold: false,
    },
  });

  const syringeItem = await prisma.item.create({
    data: {
      hospitalId: hospital.id,
      sku: "SYR-10ML",
      name: "Syringe Luer Lock 10 mL",
      uom: "EA",
      commodityClass: CommodityClass.EXPENDABLE_MEDICAL_SUPPLY,
      requiresCold: false,
    },
  });

  const insulinItem = await prisma.item.create({
    data: {
      hospitalId: hospital.id,
      sku: "RX-INS-R",
      name: "Insulin Regular Human 100 U/mL",
      description: "Demo pharmacy item — NDC placeholder",
      uom: "VL",
      ndc: "0002-8215-01",
      commodityClass: CommodityClass.PHARMACY,
      requiresCold: true,
    },
  });

  const amoxItem = await prisma.item.create({
    data: {
      hospitalId: hospital.id,
      sku: "RX-AMOX-500",
      name: "Amoxicillin 500 mg Capsule",
      description: "Demo pharmacy item — NDC placeholder",
      uom: "BOT",
      ndc: "0093-3107-01",
      commodityClass: CommodityClass.PHARMACY,
      requiresCold: false,
    },
  });

  const gloveLot = await prisma.lot.create({
    data: {
      hospitalId: hospital.id,
      itemId: gloveItem.id,
      lotNumber: "GLV-2026-031",
      expiresOn: new Date("2028-03-01"),
    },
  });

  // Near-expiry lot for FEFO / near-expiry warning demos (~45 days out)
  const nearExpiry = new Date();
  nearExpiry.setUTCDate(nearExpiry.getUTCDate() + 45);
  const gloveLotNear = await prisma.lot.create({
    data: {
      hospitalId: hospital.id,
      itemId: gloveItem.id,
      lotNumber: "GLV-NEAR-EXP",
      expiresOn: nearExpiry,
    },
  });

  const gauzeLot = await prisma.lot.create({
    data: {
      hospitalId: hospital.id,
      itemId: gauzeItem.id,
      lotNumber: "GZ-2025-118",
      expiresOn: new Date("2027-11-15"),
    },
  });

  const insulinLot = await prisma.lot.create({
    data: {
      hospitalId: hospital.id,
      itemId: insulinItem.id,
      lotNumber: "INS-LOT-8841",
      expiresOn: new Date("2026-12-31"),
    },
  });

  const ambientBin = warehouseLocations.find((l) => l.code === "A-12-04")!;
  const coldRoom = warehouseLocations.find((l) => l.code === "COLD-01")!;

  const pharmCab = await prisma.location.findFirstOrThrow({
    where: { hospitalId: hospital.id, code: "PHARM-CAB-01" },
  });
  const pharmRef = await prisma.location.findFirstOrThrow({
    where: { hospitalId: hospital.id, code: "PHARM-REF-01" },
  });

  const amoxLot = await prisma.lot.create({
    data: {
      hospitalId: hospital.id,
      itemId: amoxItem.id,
      lotNumber: "AMOX-2026-014",
      expiresOn: new Date("2027-06-30"),
    },
  });

  const syringeLot = await prisma.lot.create({
    data: {
      hospitalId: hospital.id,
      itemId: syringeItem.id,
      lotNumber: "SYR-2026-220",
      expiresOn: new Date("2029-01-01"),
    },
  });

  const orthoCart = await prisma.location.findFirstOrThrow({
    where: { hospitalId: hospital.id, code: "ORTHO-CART-01" },
  });

  await prisma.inventoryBalance.createMany({
    data: [
      {
        hospitalId: hospital.id,
        locationId: ambientBin.id,
        itemId: gloveItem.id,
        lotId: gloveLot.id,
        quantity: 48,
      },
      {
        hospitalId: hospital.id,
        locationId: ambientBin.id,
        itemId: gloveItem.id,
        lotId: gloveLotNear.id,
        quantity: 10,
      },
      {
        hospitalId: hospital.id,
        locationId: ambientBin.id,
        itemId: gauzeItem.id,
        lotId: gauzeLot.id,
        quantity: 120,
      },
      {
        hospitalId: hospital.id,
        locationId: ambientBin.id,
        itemId: syringeItem.id,
        lotId: syringeLot.id,
        quantity: 200,
      },
      {
        hospitalId: hospital.id,
        locationId: coldRoom.id,
        itemId: insulinItem.id,
        lotId: insulinLot.id,
        quantity: 24,
      },
      // Pharmacy SOS stock for C2C drug fulfill demos
      {
        hospitalId: hospital.id,
        locationId: pharmRef.id,
        itemId: insulinItem.id,
        lotId: insulinLot.id,
        quantity: 12,
      },
      {
        hospitalId: hospital.id,
        locationId: pharmCab.id,
        itemId: amoxItem.id,
        lotId: amoxLot.id,
        quantity: 40,
      },
      // Ortho has a little gauze — still below par (seeded below)
      {
        hospitalId: hospital.id,
        locationId: orthoCart.id,
        itemId: gauzeItem.id,
        lotId: gauzeLot.id,
        quantity: 4,
      },
    ],
  });

  await prisma.clinicParLevel.createMany({
    data: [
      {
        hospitalId: hospital.id,
        clinicId: orthoClinic.id,
        itemId: gloveItem.id,
        parQty: 20,
      },
      {
        hospitalId: hospital.id,
        clinicId: orthoClinic.id,
        itemId: gauzeItem.id,
        parQty: 30,
      },
      {
        hospitalId: hospital.id,
        clinicId: medSurgClinic.id,
        itemId: gloveItem.id,
        parQty: 15,
      },
      {
        hospitalId: hospital.id,
        clinicId: pharmacy.id,
        itemId: syringeItem.id,
        parQty: 50,
      },
    ],
  });

  await prisma.inboundShipment.create({
    data: {
      hospitalId: hospital.id,
      referenceNumber: "PO-2026-DEMO",
      vendorName: "Medline Industries",
      status: "OPEN",
      notes: "Demo PO for assisted receiving",
      lines: {
        create: [
          {
            itemId: gloveItem.id,
            quantityExpected: 24,
          },
          {
            itemId: syringeItem.id,
            quantityExpected: 50,
          },
        ],
      },
    },
  });

  const logisticsUser = await prisma.user.create({
    data: {
      hospitalId: hospital.id,
      username: "logistics.ops",
      passwordHash,
      displayName: "Alex Rivera",
      role: UserRole.LOGISTICS_OPERATOR,
    },
  });

  const logisticsAdmin = await prisma.user.create({
    data: {
      hospitalId: hospital.id,
      username: "logistics.admin",
      passwordHash,
      displayName: "Jordan Lee",
      role: UserRole.LOGISTICS_ADMIN,
    },
  });

  const clinicUser = await prisma.user.create({
    data: {
      hospitalId: hospital.id,
      username: "clinic.ortho",
      passwordHash,
      displayName: "Sam Patel",
      role: UserRole.CLINIC_SUPPLY_USER,
      clinicId: orthoClinic.id,
    },
  });

  const pharmacyUser = await prisma.user.create({
    data: {
      hospitalId: hospital.id,
      username: "clinic.pharmacy",
      passwordHash,
      displayName: "Casey Nguyen",
      role: UserRole.CLINIC_SUPPLY_USER,
      clinicId: pharmacy.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      hospitalId: hospital.id,
      actorId: logisticsAdmin.id,
      action: "SEED",
      entityType: "Hospital",
      entityId: hospital.id,
      summary: "Phase 3 demo seed (pars, near-expiry, sample PO — ready for recall demo on GZ lot)",
      metadata: {
        users: [
          logisticsUser.username,
          logisticsAdmin.username,
          clinicUser.username,
          pharmacyUser.username,
        ],
      },
    },
  });

  console.log("Seed complete.");
  console.log("Hospital:", hospital.code, hospital.name);
  console.log("Demo password for all users: docklog123");
  console.log("  logistics.ops      — Logistics operator");
  console.log("  logistics.admin    — Logistics admin");
  console.log("  clinic.ortho      — Orthopedics clinic user");
  console.log("  clinic.pharmacy   — Pharmacy clinic user (SOS)");
  console.log("MVP demo: receive → request/push → issue → clinic confirm.");
  console.log("Phase 3: recalls + audit export (gauze lot at Ortho for return demo).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
