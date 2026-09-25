const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");
const {
  maintenanceGuard,
} = require("./middleware/maintenance");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./docs/openapi");

const app = express();

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://smart-attendance.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without an Origin header
    // such as Postman or server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    // Allow known origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    // Allow origin from Railway environment variable
    const configuredOrigins = (process.env.CORS_ORIGIN || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

/*
|--------------------------------------------------------------------------
| Body Parser
|--------------------------------------------------------------------------
*/

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| Global Maintenance Mode Enforcement
| (admin bypass + exempt auth/public routes inside)
|--------------------------------------------------------------------------
*/

app.use(maintenanceGuard);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "smart-attendance-backend",
  });
});

/*
|--------------------------------------------------------------------------
| API Documentation (Swagger UI + raw OpenAPI JSON)
| Public by design: the spec contains no secrets, only
| endpoint shapes. Reachable during maintenance mode.
|--------------------------------------------------------------------------
*/

app.get("/api-docs.json", (req, res) => {
  res.json(openapiSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: "Smart Attendance API Docs",
  })
);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api", routes);

/*
|--------------------------------------------------------------------------
| Error Handling
|--------------------------------------------------------------------------
*/

app.use(notFound);
app.use(errorHandler);

module.exports = app;