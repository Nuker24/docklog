import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ClinicHomePage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const clinic = clinicId
    ? await prisma.clinic.findUnique({
        where: { id: clinicId },
        include: {
          _count: { select: { locations: true } },
        },
      })
    : null;

  const [openRequests, awaitingConfirm, onHand] = clinicId
    ? await Promise.all([
        prisma.supplyRequest.count({
          where: {
            hospitalId: session!.user.hospitalId,
            requestingClinicId: clinicId,
            status: "OPEN",
          },
        }),
        prisma.transfer.count({
          where: {
            hospitalId: session!.user.hospitalId,
            toClinicId: clinicId,
            status: "ISSUED",
          },
        }),
        prisma.inventoryBalance.aggregate({
          where: {
            hospitalId: session!.user.hospitalId,
            location: { clinicId },
          },
          _sum: { quantity: true },
        }),
      ])
    : [0, 0, { _sum: { quantity: null } }];

  return (
    <div className="ops-page">
      <h1>Clinic home</h1>
      <p className="lede">
        {clinic
          ? `${clinic.name} supply workspace at ${session!.user.hospitalName}.`
          : `Clinic module for ${session!.user.hospitalName}.`}{" "}
        Request supply, confirm receipts, and view clinic on-hand.
      </p>

      {clinic && (
        <dl className="stub-stats">
          <div>
            <dt>Clinic code</dt>
            <dd>{clinic.code}</dd>
          </div>
          <div>
            <dt>Open requests</dt>
            <dd>{openRequests}</dd>
          </div>
          <div>
            <dt>Awaiting confirm</dt>
            <dd>{awaitingConfirm}</dd>
          </div>
          <div>
            <dt>Units on hand</dt>
            <dd>{Number(onHand._sum.quantity ?? 0)}</dd>
          </div>
          <div>
            <dt>Logistics push</dt>
            <dd>{clinic.logisticsPushEnabled ? "Enabled" : "Request only"}</dd>
          </div>
          <div>
            <dt>Pharmacy SOS</dt>
            <dd>{clinic.isPharmacySos ? "Yes" : "No"}</dd>
          </div>
        </dl>
      )}

      <section className="quick-links">
        <h2>Workflow</h2>
        <ol>
          <li>
            <Link href="/clinic/requests">Create a supply request</Link> —
            expendable → logistics; drugs → Pharmacy SOS.
          </li>
          <li>
            When logistics/Pharmacy issues,{" "}
            <Link href="/clinic/confirm">confirm receipt</Link> into a clinic
            location.
          </li>
          <li>
            Check <Link href="/clinic/on-hand">clinic on-hand</Link>.
          </li>
        </ol>
      </section>
    </div>
  );
}
