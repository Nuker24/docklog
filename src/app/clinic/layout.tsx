import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/AppShell";
import { canAccessClinic } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const nav = [
  { href: "/clinic", label: "Home" },
  { href: "/clinic/requests", label: "Requests" },
  { href: "/clinic/transfer", label: "Transfer out" },
  { href: "/clinic/confirm", label: "Confirm receipt" },
  { href: "/clinic/on-hand", label: "On-hand" },
];

export default async function ClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  if (!canAccessClinic(session.user.role)) {
    redirect("/logistics");
  }

  let clinicName: string | null = null;
  if (session.user.clinicId) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, isPharmacySos: true },
    });
    clinicName = clinic
      ? clinic.isPharmacySos
        ? `${clinic.name} (Pharmacy SOS)`
        : clinic.name
      : null;
  }

  return (
    <AppShell
      moduleName={clinicName ? `Clinic · ${clinicName}` : "Clinic"}
      moduleHref="/clinic"
      nav={nav}
      user={session.user}
    >
      {children}
    </AppShell>
  );
}
