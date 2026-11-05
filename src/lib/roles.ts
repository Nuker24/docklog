import type { UserRole } from "@prisma/client";

export type AppModule = "logistics" | "clinic";

const LOGISTICS_ROLES: UserRole[] = [
  "LOGISTICS_ADMIN",
  "LOGISTICS_OPERATOR",
  "AUDITOR",
];

const CLINIC_ROLES: UserRole[] = ["CLINIC_SUPPLY_USER", "AUDITOR"];

export function canAccessLogistics(role: UserRole): boolean {
  return LOGISTICS_ROLES.includes(role);
}

export function canAccessClinic(role: UserRole): boolean {
  return CLINIC_ROLES.includes(role);
}

export function defaultModuleForRole(role: UserRole): AppModule {
  if (canAccessLogistics(role) && role !== "AUDITOR") {
    return "logistics";
  }
  if (canAccessClinic(role)) {
    return "clinic";
  }
  return "logistics";
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "LOGISTICS_ADMIN":
      return "Logistics admin";
    case "LOGISTICS_OPERATOR":
      return "Logistics operator";
    case "CLINIC_SUPPLY_USER":
      return "Clinic supply";
    case "AUDITOR":
      return "Auditor";
    default:
      return role;
  }
}
