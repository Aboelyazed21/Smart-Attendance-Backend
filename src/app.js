const express = require("express");
const cors = require("cors");

const routes = require("./routes");

const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "smart-attendance-backend",
  });
});

app.use("/api", routes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;