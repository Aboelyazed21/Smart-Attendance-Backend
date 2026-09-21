require("dotenv").config();

const app = require("./app");
const { pool, testConnection } = require("./config/db");
const { execFile } = require("child_process");
const path = require("path");
const bcrypt = require("bcryptjs");

const PORT = Number(process.env.PORT || 5000);

function importDatabaseIfEnabled() {
  return new Promise((resolve, reject) => {
    if (process.env.DB_IMPORT_ON_START !== "true") {
      return resolve();
    }

    const importScript = path.join(
      __dirname,
      "..",
      "scripts",
      "import-db.js"
    );

    console.log("========================================");
    console.log("Database import mode is ENABLED");
    console.log("Running database import...");
    console.log(`Import script: ${importScript}`);
    console.log("========================================");

    const child = execFile(
      process.execPath,
      [importScript],
      {
        env: process.env,
        cwd: path.join(__dirname, ".."),
      },
      (error, stdout, stderr) => {
        if (stdout) {
          console.log(stdout);
        }

        if (stderr) {
          console.error(stderr);
        }

        if (error) {
          return reject(error);
        }

        console.log("Database import finished successfully.");
        resolve();
      }
    );

    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
  });
}

async function resetAdminIfEnabled() {
  if (process.env.ADMIN_RESET !== "true") {
    return;
  }

  const adminEmail = "admin@smartattendance.com";
  const temporaryPassword =
    process.env.ADMIN_RESET_PASSWORD || "Admin@12345";

  console.log("========================================");
  console.log("ADMIN RESET MODE IS ENABLED");
  console.log(`Resetting password for: ${adminEmail}`);
  console.log("========================================");

  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const [result] = await pool.query(
    `
      UPDATE users
      SET password_hash = ?
      WHERE email = ?
    `,
    [passwordHash, adminEmail]
  );

  if (!result.affectedRows) {
    throw new Error(
      `Admin user not found: ${adminEmail}`
    );
  }

  console.log("Admin password reset successfully.");
  console.log("Temporary password: Admin@12345");
}

async function start() {
  try {
    await testConnection();

    await importDatabaseIfEnabled();

    await resetAdminIfEnabled();

    app.listen(PORT, () => {
      console.log(
        `Smart Attendance API running on http://localhost:${PORT}`
      );

      console.log(
        `Health: http://localhost:${PORT}/health`
      );
    });
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exit(1);
  }
}

start();