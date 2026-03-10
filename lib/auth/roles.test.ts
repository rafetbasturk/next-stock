import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "@/lib/errors/app-error";
import { assertAdminAccess, isAdminRole } from "@/lib/auth/roles";

test("isAdminRole returns true only for admin", () => {
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("user"), false);
  assert.equal(isAdminRole(undefined), false);
});

test("assertAdminAccess throws AUTH_REQUIRED for missing user", () => {
  assert.throws(() => assertAdminAccess(null), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "AUTH_REQUIRED");
    return true;
  });
});

test("assertAdminAccess throws ADMIN_REQUIRED for non-admin user", () => {
  assert.throws(() => assertAdminAccess({ role: "user" }), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "ADMIN_REQUIRED");
    return true;
  });
});

test("assertAdminAccess allows admin user", () => {
  assert.doesNotThrow(() => assertAdminAccess({ role: "admin" }));
});
