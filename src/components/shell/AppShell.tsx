import Link from "next/link";
import { signOut } from "@/auth";
import { roleLabel } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  moduleName: string;
  moduleHref: string;
  nav: NavItem[];
  user: {
    displayName: string;
    username: string;
    role: UserRole;
    hospitalName: string;
  };
  children: React.ReactNode;
};

export function AppShell({
  moduleName,
  moduleHref,
  nav,
  user,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand-block">
          <Link href={moduleHref} className="app-brand">
            DockLog
          </Link>
          <span className="app-module">{moduleName}</span>
        </div>
        <div className="app-user">
          <div className="app-user-meta">
            <span className="app-user-name">{user.displayName}</span>
            <span className="app-user-sub">
              {roleLabel(user.role)} · {user.hospitalName}
            </span>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button type="submit" className="app-signout">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="app-body">
        <aside className="app-nav" aria-label={`${moduleName} navigation`}>
          <nav>
            <ul>
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
