const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const sqlPath = path.join(__dirname, "smart_attendance_db.sql");

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`SQL file not found: ${sqlPath}`);
  }

  let sql = fs.readFileSync(sqlPath, "utf8");

  sql = sql.replace(
    /DEFINER=`root`@`localhost`/gi,
    ""
  );

  const connection = await mysql.createConnection({
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || "railway",
    multipleStatements: true,
    connectTimeout: 30000,
  });

  console.log("Connected to Railway MySQL");

  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    console.log("Importing database...");

    await connection.query(sql);

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("Database import completed successfully.");
  } catch (error) {
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch {}

    console.error("Database import failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Fatal error:");
  console.error(error);
  process.exit(1);
});