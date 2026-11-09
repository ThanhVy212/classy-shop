const CLOUDINARY_IMAGE_MARKER = "/image/upload/";

export type CloudinaryCrop = "fill" | "fit" | "limit" | "scale" | "thumb";

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: CloudinaryCrop;
  gravity?: "auto" | "face" | "center";
  quality?: string | number;
  format?: string;
  dpr?: number;
}

export const isCloudinaryUrl = (url?: string | null): url is string =>
  Boolean(url && url.includes("res.cloudinary.com") && url.includes(CLOUDINARY_IMAGE_MARKER));

/**
 * Signed delivery URLs (`.../image/upload/s--signature--/...`) are signed over
 * the exact transformation path, so injecting new parameters would invalidate
 * the signature. Those are served untouched.
 */
export const isSignedCloudinaryUrl = (url?: string | null): boolean =>
  Boolean(url && /\/image\/upload\/s--[^/]+--\//.test(url));

/**
 * Inserts Cloudinary delivery transformations (f_auto + q_auto by default)
 * into an image URL. Non-Cloudinary URLs are returned untouched so local
 * assets and third-party images keep working.
 */
export const optimizeCloudinaryUrl = (
  url?: string | null,
  options: CloudinaryTransformOptions = {},
): string => {
  if (!url || !isCloudinaryUrl(url) || isSignedCloudinaryUrl(url)) {
    return url || "";
  }

  const markerIndex = url.indexOf(CLOUDINARY_IMAGE_MARKER);
  const prefix = url.slice(0, markerIndex + CLOUDINARY_IMAGE_MARKER.length);
  const suffix = url.slice(markerIndex + CLOUDINARY_IMAGE_MARKER.length);

  const parts = [
    "f_auto",
    options.quality
      ? typeof options.quality === "number"
        ? `q_${options.quality}`
        : `q_auto:${options.quality}`
      : "q_auto",
    options.width ? `w_${Math.round(options.width)}` : "",
    options.height ? `h_${Math.round(options.height)}` : "",
    options.crop ? `c_${options.crop}` : "",
    options.gravity ? `g_${options.gravity}` : "",
    options.dpr && options.dpr > 1 ? `dpr_${options.dpr}` : "",
  ].filter(Boolean);

  return `${prefix}${parts.join(",")}/${suffix}`;
};

/**
 * Builds a responsive `srcSet` for Cloudinary images. Each width becomes its
 * own f_auto/q_auto URL so browsers can pick the smallest suitable asset.
 */
export const buildCloudinarySrcSet = (
  url?: string | null,
  widths: number[] = [],
  options: CloudinaryTransformOptions = {},
): string | undefined => {
  if (
    !isCloudinaryUrl(url) ||
    isSignedCloudinaryUrl(url) ||
    widths.length === 0
  ) {
    return undefined;
  }

  return widths
    .map(
      (width) =>
        `${optimizeCloudinaryUrl(url, { ...options, width })} ${Math.round(width)}w`,
    )
    .join(", ");
};

export default optimizeCloudinaryUrl;
