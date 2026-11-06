import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/AppShell";
import { canAccessLogistics } from "@/lib/roles";

const nav = [
  { href: "/logistics", label: "Home" },
  { href: "/logistics/receive", label: "Receive" },
  { href: "/logistics/on-hand", label: "On-hand" },
  { href: "/logistics/issue", label: "Issue / fulfill" },
];

export default async function LogisticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  if (!canAccessLogistics(session.user.role)) {
    redirect("/clinic");
  }

  return (
    <AppShell
      moduleName="Logistics"
      moduleHref="/logistics"
      nav={nav}
      user={session.user}
    >
      {children}
    </AppShell>
  );
}
