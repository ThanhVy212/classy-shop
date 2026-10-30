import api from "./api";

export interface UploadedImage {
  url: string;
  publicId?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

export const uploadService = {
  async uploadSingleImage(file: File, folder?: string): Promise<UploadedImage> {
    const formData = new FormData();
    formData.append("image", file);
    if (folder) formData.append("folder", folder);

    const response = await api.post<{ message: string; image: UploadedImage }>(
      "/upload/single",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.image;
  },

  async uploadMultipleImages(
    files: File[],
    folder?: string
  ): Promise<UploadedImage[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });
    if (folder) formData.append("folder", folder);

    const response = await api.post<{ message: string; images: UploadedImage[] }>(
      "/upload/multiple",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.images;
  },

  async deleteImage(publicId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>("/upload", {
      data: { publicId },
    });
    return response.data;
  },
};
