import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  username: string;
  role: UserRole;
  hospitalId: string;
  hospitalName: string;
  clinicId: string | null;
  displayName: string;
};

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  return session.user as SessionUser;
}
