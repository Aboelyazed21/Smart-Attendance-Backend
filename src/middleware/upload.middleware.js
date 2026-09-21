const multer = require("multer");
const path = require("path");
const fs = require("fs");

/*
|--------------------------------------------------------------------------
| Upload Directory
|--------------------------------------------------------------------------
*/

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "csv"
);

/*
|--------------------------------------------------------------------------
| Create Directory If It Does Not Exist
|--------------------------------------------------------------------------
*/

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

/*
|--------------------------------------------------------------------------
| Storage
|--------------------------------------------------------------------------
*/

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const filename =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(null, filename);
  },
});

/*
|--------------------------------------------------------------------------
| File Filter
|--------------------------------------------------------------------------
*/

function fileFilter(req, file, cb) {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const allowedExtensions = [
    ".csv",
  ];

  if (!allowedExtensions.includes(extension)) {
    return cb(
      new Error("Only CSV files are allowed")
    );
  }

  cb(null, true);
}

/*
|--------------------------------------------------------------------------
| Multer Configuration
|--------------------------------------------------------------------------
*/

const uploadCSV = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

module.exports = {
  uploadCSV,
};