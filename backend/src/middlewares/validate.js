import mongoose from "mongoose";

/**
 * Validate MongoDB ObjectId parameter
 * @param {string} paramName - default "id"
 */
export const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: `ID is invalid: ${id}` });
    }
    next();
  };
};
