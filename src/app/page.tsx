import { redirect } from "next/navigation";
import { auth, defaultModuleForRole } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  const mod = defaultModuleForRole(session.user.role);
  redirect(mod === "clinic" ? "/clinic" : "/logistics");
}
