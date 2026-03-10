import { AppError } from "@/lib/errors/app-error";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

export function assertAdminAccess(
  user: { role: string } | null | undefined,
): asserts user is { role: string } {
  if (!user) {
    throw new AppError("AUTH_REQUIRED");
  }

  if (!isAdminRole(user.role)) {
    throw new AppError("ADMIN_REQUIRED");
  }
}
