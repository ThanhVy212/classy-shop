import type { ImgHTMLAttributes } from "react";
import {
  buildCloudinarySrcSet,
  isCloudinaryUrl,
  optimizeCloudinaryUrl,
  type CloudinaryCrop,
} from "../../utils/cloudinary";

interface OptimizedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes"> {
  src?: string | null;
  widths?: number[];
  sizes?: string;
  crop?: CloudinaryCrop;
  fallbackWidth?: number;
}

const DEFAULT_WIDTHS = [320, 480, 640, 960, 1280];

/**
 * Cloudinary-aware image element. It serves f_auto/q_auto URLs with a
 * responsive srcset and silently falls back to the original URL for local or
 * non-Cloudinary assets.
 */
const OptimizedImage = ({
  src,
  widths = DEFAULT_WIDTHS,
  sizes = "100vw",
  crop,
  fallbackWidth,
  loading = "lazy",
  decoding = "async",
  ...rest
}: OptimizedImageProps) => {
  const width = fallbackWidth ?? widths[0];
  const optimizedSrc = isCloudinaryUrl(src)
    ? optimizeCloudinaryUrl(src, { width, crop })
    : src || "";
  const srcSet = buildCloudinarySrcSet(src, widths, { crop });

  return (
    <img
      {...rest}
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      loading={loading}
      decoding={decoding}
    />
  );
};

export default OptimizedImage;
