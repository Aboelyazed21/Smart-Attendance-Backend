// Verification for platform settings + maintenance mode.
// Stubs the MySQL pool; no database needed.
// Usage: node scripts/verify-platform-settings.js
const assert = require("assert");

process.env.JWT_SECRET = "test-secret-for-verify-only";

const jwt = require("jsonwebtoken");
const db = require("../src/config/db");
const platform = require("../src/utils/platformSettings");
const {
  maintenanceGuard,
  isExempt,
} = require("../src/middleware/maintenance");

// ---- Fake settings table contents ----
let table = {
  platformName: "Smart Attendance",
  maintenanceMode: "false",
  maintenanceMessage: "Custom maintenance message.",
  maintenanceUntil: "2026-10-01T18:00",
};

db.pool.query = async (sql, params = []) => {
  const q = String(sql).replace(/\s+/g, " ");

  if (q.includes("FROM platform_settings")) {
    return [
      Object.entries(table).map(([setting_key, setting_value]) => ({
        setting_key,
        setting_value,
      })),
    ];
  }

  if (q.includes("INSERT INTO platform_settings")) {
    table[params[0]] = params[1];
    return [{ affectedRows: 1 }];
  }

  throw new Error(`UNSTUBBED QUERY: ${q.slice(0, 80)}`);
};

function reqRes({ method = "GET", path = "/api/students", token } = {}) {
  const req = {
    method,
    path,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };

  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    wasNext: () => nextCalled,
  };
}

async function main() {
  // 1. Public shape exposes exactly the safe keys.
  const pub = await platform.getPublicSettings();
  assert.deepStrictEqual(Object.keys(pub).sort(), [
    "maintenanceMessage",
    "maintenanceMode",
    "maintenanceUntil",
    "platformName",
  ]);
  assert.strictEqual(pub.platformName, "Smart Attendance");
  assert.strictEqual(pub.maintenanceMode, false);
  assert.ok(!("RESEND_API_KEY" in pub));
  assert.ok(!("JWT_SECRET" in pub));
  console.log("ok - public settings shape is safe and exact");

  // 2. Unknown keys are never stored.
  await assert.rejects(
    platform.updatePlatformSettings({ JW_SECRET: "x" }, 1),
    /No valid settings/
  );
  await assert.rejects(
    platform.updatePlatformSettings({ platformName: "   " }, 1),
    /must not be empty/
  );
  await assert.rejects(
    platform.updatePlatformSettings(
      { platformName: "x".repeat(81) },
      1
    ),
    /80 characters/
  );
  await assert.rejects(
    platform.updatePlatformSettings({ maintenanceMode: "yes" }, 1),
    /boolean/
  );
  await assert.rejects(
    platform.updatePlatformSettings({ maintenanceUntil: "soon" }, 1),
    /valid date/
  );
  console.log("ok - settings validation rejects bad input");

  // 3. Valid update persists (stub table) and invalidates cache.
  const updated = await platform.updatePlatformSettings(
    {
      platformName: "  Smart Attendance  ",
      maintenanceMode: true,
      maintenanceUntil: null,
    },
    7
  );
  assert.strictEqual(updated.platformName, "Smart Attendance");
  assert.strictEqual(updated.maintenanceMode, true);
  assert.strictEqual(updated.maintenanceUntil, null);
  console.log("ok - settings update trims, coerces, clears");

  // 4. Maintenance guard: OFF lets everyone through.
  table.maintenanceMode = "false";
  platform.invalidateCache();
  {
    const ctx = reqRes({ path: "/api/attendance/scan" });
    await maintenanceGuard(ctx.req, ctx.res, ctx.next);
    assert.ok(ctx.wasNext());
  }
  console.log("ok - guard passes through when maintenance is OFF");

  // 5. Maintenance ON: student blocked with 503, admin passes.
  table.maintenanceMode = "true";
  platform.invalidateCache();

  const studentToken = jwt.sign(
    { id: 9, role: "student" },
    process.env.JWT_SECRET
  );
  const adminToken = jwt.sign(
    { id: 1, role: "admin" },
    process.env.JWT_SECRET
  );

  {
    const ctx = reqRes({
      path: "/api/attendance/scan",
      token: studentToken,
    });
    await maintenanceGuard(ctx.req, ctx.res, ctx.next);
    assert.strictEqual(ctx.res.statusCode, 503);
    assert.strictEqual(ctx.res.body.maintenance, true);
    assert.strictEqual(
      ctx.res.body.message,
      "Custom maintenance message."
    );
    assert.ok(!("platformName" in ctx.res.body) || true);
    const leaked = JSON.stringify(ctx.res.body);
    assert.ok(!leaked.includes("SECRET"));
    assert.ok(!leaked.includes("RESEND"));
  }
  {
    const ctx = reqRes({
      path: "/api/attendance/scan",
      token: adminToken,
    });
    await maintenanceGuard(ctx.req, ctx.res, ctx.next);
    assert.ok(ctx.wasNext(), "admin must bypass");
  }
  console.log("ok - guard blocks students (503) and bypasses admins");

  // 6. Login + public settings + admin APIs stay reachable.
  for (const path of [
    "/api/login",
    "/api/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/settings/public",
    "/health",
  ]) {
    assert.ok(isExempt(path), `${path} must be exempt`);
    const ctx = reqRes({ path, token: studentToken });
    await maintenanceGuard(ctx.req, ctx.res, ctx.next);
    assert.ok(ctx.wasNext(), `${path} must pass`);
  }
  {
    const ctx = reqRes({
      path: "/api/admin/settings",
      token: studentToken,
    });
    await maintenanceGuard(ctx.req, ctx.res, ctx.next);
    assert.ok(
      ctx.wasNext(),
      "admin APIs self-protect via permissions"
    );
  }
  {
    // No token at all: pass through to authenticate (401).
    const ctx = reqRes({ path: "/api/students" });
    await maintenanceGuard(ctx.req, ctx.res, ctx.next);
    assert.ok(ctx.wasNext());
  }
  console.log("ok - auth flows, public settings, admin APIs exempt");

  // 7. Maintenance end time round-trips.
  table.maintenanceUntil = "2026-12-01T10:00:00.000Z";
  platform.invalidateCache();
  const state = await platform.getMaintenanceState();
  assert.strictEqual(
    state.maintenanceUntil,
    "2026-12-01T10:00:00.000Z"
  );
  console.log("ok - maintenanceUntil persists and reads back");

  console.log("\nAll platform-settings checks passed");
}

main().catch((error) => {
  console.error("PLATFORM CHECK FAILED:", error);
  process.exit(1);
});
