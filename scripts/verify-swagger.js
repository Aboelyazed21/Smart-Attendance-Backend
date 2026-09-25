// Swagger verification (no database needed):
// 1. Every live Express route must exist in the OpenAPI spec.
// 2. /api-docs.json serves valid JSON over HTTP.
// 3. /api-docs/ serves the Swagger UI HTML.
// 4. The spec text contains no secret values.
// Usage: node scripts/verify-swagger.js
const assert = require("assert");
const http = require("http");

const app = require("../src/app");
const spec = require("../src/docs/openapi");

function expressPath(layerPath) {
  return String(layerPath).replace(/:([^/]+)/g, "{$1}");
}

function collect(stack, base, out) {
  for (const layer of stack) {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods).filter(
        (m) => layer.route.methods[m] && m !== "_all"
      );
      const paths = Array.isArray(layer.route.path)
        ? layer.route.path
        : [layer.route.path];
      for (const p of paths) {
        for (const m of methods) {
          out.push({
            method: m.toLowerCase(),
            path: expressPath(base + (p === "/" ? "" : p)),
          });
        }
      }
    } else if (
      layer.name === "router" &&
      layer.handle &&
      layer.handle.stack
    ) {
      // Strip Express 4 mount prefixes down to plain paths:
      // ^\/api\/?(?=\/|$) -> /api, ^\/?(?=\/|$) -> "".
      const prefix = layer.regexp
        ? layer.regexp.source
            .replace(/^\^/, "")
            .replace(/^\\\/?\(\?=[^)]*\)/, "")
            .replace("\\/?(?=\\/|$)", "")
            .replace(/\\\//g, "/")
            .replace(/\$$/, "")
        : "";
      collect(layer.handle.stack, base + prefix, out);
    }
  }
}

function get(path, port) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path }, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () =>
          resolve({ status: res.statusCode, body })
        );
      })
      .on("error", reject);
  });
}

async function main() {
  // 1. Coverage: every live route documented.
  const routes = [];
  collect(app._router.stack, "", routes);

  const apiRoutes = routes.filter(
    (r) =>
      r.path.startsWith("/api/") &&
      !r.path.startsWith("/api-docs") &&
      r.path !== "/api-docs.json"
  );

  const missing = [];

  for (const route of apiRoutes) {
    const doc = spec.paths[route.path];
    if (!doc || !doc[route.method]) {
      missing.push(`${route.method.toUpperCase()} ${route.path}`);
    }
  }

  assert.strictEqual(
    missing.length,
    0,
    `Undocumented routes:\n${missing.join("\n")}`
  );
  console.log(
    `ok - all ${apiRoutes.length} live routes documented`
  );

  // 2. No secret leakage in the spec text.
  const text = JSON.stringify(spec);
  for (const banned of [
    "RESEND_API_KEY",
    "JWT_SECRET",
    "DB_PASSWORD",
    "TWILIO_AUTH_TOKEN",
    "MAIL_PASS",
  ]) {
    assert.ok(
      !text.includes(banned),
      `spec leaks ${banned}`
    );
  }
  console.log("ok - spec contains no secret names");

  // 3-4. HTTP serving (ephemeral port, no DB touched).
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.on("listening", resolve));
  const port = server.address().port;

  try {
    const doc = await get("/api-docs.json", port);
    assert.strictEqual(doc.status, 200);
    const parsed = JSON.parse(doc.body);
    assert.strictEqual(parsed.openapi, "3.0.3");
    assert.strictEqual(
      Object.keys(parsed.paths).length,
      Object.keys(spec.paths).length,
      "served spec must match the built spec"
    );
    console.log(
      `ok - /api-docs.json serves the spec (${Object.keys(parsed.paths).length} paths)`
    );

    const ui = await get("/api-docs/", port);
    assert.strictEqual(ui.status, 200);
    assert.ok(
      ui.body.includes("swagger-ui"),
      "Swagger UI HTML expected"
    );
    console.log("ok - /api-docs/ serves Swagger UI");
  } finally {
    server.close();
  }

  console.log("\nAll swagger checks passed");
}

main().catch((error) => {
  console.error("SWAGGER CHECK FAILED:", error);
  process.exit(1);
});
