import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

const csvFilter = (_req, file, callback) => {
  const filename = String(file.originalname || "").toLowerCase();
  const hasCsvExtension = filename.endsWith(".csv");

  if (hasCsvExtension || ALLOWED_CSV_MIME_TYPES.has(file.mimetype)) {
    return callback(null, true);
  }

  return callback(
    new Error("Only CSV files are allowed for inventory import."),
    false,
  );
};

const upload = multer({
  storage,
  fileFilter: csvFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

/** Accepts one CSV file in the "file" field, with friendly error messages. */
export const uploadInventoryCsv = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "The CSV file exceeds the 2MB limit." });
      }

      return res.status(400).json({ message: error.message });
    }

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return next();
  });
};
