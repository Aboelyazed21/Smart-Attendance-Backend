require("dotenv").config();

const app = require("./app");
const { testConnection } = require("./config/db");
const { execFile } = require("child_process");
const path = require("path");

const PORT = Number(process.env.PORT || 5000);

function importDatabaseIfEnabled() {
  return new Promise((resolve, reject) => {
    if (process.env.DB_IMPORT_ON_START !== "true") {
      return resolve();
    }

    const importScript = path.join(
      __dirname,
      "scripts",
      "import-db.js"
    );

    console.log("========================================");
    console.log("Database import mode is ENABLED");
    console.log("Running database import...");
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

async function start() {
  try {
    await testConnection();

    await importDatabaseIfEnabled();

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