require("dotenv").config();

const app = require("./app");
const { testConnection } = require("./config/db");

const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    await testConnection();

    app.listen(PORT, () => {
      console.log(`Smart Attendance API running on http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exit(1);
  }
}

start();
