// Shared OpenAPI snippets for path modules.
const SEC = [{ bearerAuth: [] }];

const R401 = {
  description: "Missing or invalid token.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const R403 = {
  description: "Authenticated but not authorized (role/permission).",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const R503 = {
  description:
    "Maintenance mode is ON and the caller is not an admin.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/MaintenanceBlock" },
    },
  },
};

function jsonRef(name, description) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${name}` },
      },
    },
  };
}

function bodyRef(name, required) {
  return {
    required: required !== false,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${name}` },
      },
    },
  };
}

function idParam(name, description) {
  return {
    name,
    in: "path",
    required: true,
    schema: { type: "integer" },
    description: description || "Record id.",
  };
}

module.exports = { SEC, R401, R403, R503, jsonRef, bodyRef, idParam };
