import multer from "multer";

// Use memory storage so files are kept in buffer (no disk clutter)
const storage = multer.memoryStorage();

// File filter: accept only common image formats
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, JPG, PNG, WEBP, and GIF images are allowed."
      ),
      false
    );
  }
};

// Limit file size to 5MB
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

/**
 * Middleware for single image upload with error handling
 * @param {string} fieldName - Form field name (default: "image")
 */
export const uploadSingle = (fieldName = "image") => {
  const multerUpload = upload.single(fieldName);
  return (req, res, next) => {
    multerUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "File size exceeds the 5MB limit.",
          });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

/**
 * Middleware for multiple images upload with error handling
 * @param {string} fieldName - Form field name (default: "images")
 * @param {number} maxCount - Maximum allowed files (default: 10)
 */
export const uploadMultiple = (fieldName = "images", maxCount = 10) => {
  const multerUpload = upload.array(fieldName, maxCount);
  return (req, res, next) => {
    multerUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "One or more files exceed the 5MB limit.",
          });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            message: `Too many files uploaded. Maximum is ${maxCount}.`,
          });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

export default upload;
