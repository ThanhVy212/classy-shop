import cloudinary, { uploadToCloudinary } from "../config/cloudinary.js";

/**
 * @desc    Upload single image
 * @route   POST /api/upload/single
 * @access  Private / Admin
 */
export const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const folder = req.body.folder || "classyshop/products";
    const result = await uploadToCloudinary(req.file.buffer, { folder });

    return res.status(200).json({
      message: "Image uploaded successfully",
      image: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return res.status(500).json({
      message: "Failed to upload image",
      error: error.message,
    });
  }
};

/**
 * @desc    Upload multiple images
 * @route   POST /api/upload/multiple
 * @access  Private / Admin
 */
export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No image files provided" });
    }

    const folder = req.body.folder || "classyshop/products";

    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, { folder })
    );

    const results = await Promise.all(uploadPromises);

    const uploadedImages = results.map((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    }));

    return res.status(200).json({
      message: "Images uploaded successfully",
      images: uploadedImages,
    });
  } catch (error) {
    console.error("Cloudinary multiple upload error:", error);
    return res.status(500).json({
      message: "Failed to upload images",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete an image from Cloudinary
 * @route   DELETE /api/upload
 * @access  Private / Admin
 */
export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: "publicId is required in request body" });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      return res.status(400).json({
        message: "Failed to delete image or image not found",
        cloudinaryResult: result,
      });
    }

    return res.status(200).json({
      message: "Image deleted successfully",
      publicId,
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return res.status(500).json({
      message: "Failed to delete image",
      error: error.message,
    });
  }
};
