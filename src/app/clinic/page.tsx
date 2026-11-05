import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ClinicHomePage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const clinic = clinicId
    ? await prisma.clinic.findUnique({
        where: { id: clinicId },
        include: {
          locations: true,
          _count: { select: { locations: true } },
        },
      })
    : null;

  return (
    <div className="stub-page">
      <h1>Clinic home</h1>
      <p className="lede">
        {clinic
          ? `${clinic.name} supply workspace at ${session!.user.hospitalName}.`
          : `Clinic module for ${session!.user.hospitalName}.`}{" "}
        Request and confirm flows arrive in Phase 1.
      </p>

      {clinic && (
        <dl className="stub-stats">
          <div>
            <dt>Clinic code</dt>
            <dd>{clinic.code}</dd>
          </div>
          <div>
            <dt>Storage locations</dt>
            <dd>{clinic._count.locations}</dd>
          </div>
          <div>
            <dt>Logistics push</dt>
            <dd>{clinic.logisticsPushEnabled ? "Enabled" : "Request only"}</dd>
          </div>
          <div>
            <dt>Pharmacy SOS</dt>
            <dd>{clinic.isPharmacySos ? "Yes — drug source of supply" : "No"}</dd>
          </div>
        </dl>
      )}

      <section className="stub-note">
        <h2>Phase 0 scope</h2>
        <ul>
          <li>Clinic users are scoped to their assigned clinic</li>
          <li>
            Expendable medical supply comes from logistics; drugs come from
            Pharmacy SOS (C2C)
          </li>
          <li>
            Per-clinic <code>logisticsPushEnabled</code> toggle controls push vs
            request-only
          </li>
        </ul>
      </section>
    </div>
  );
}
