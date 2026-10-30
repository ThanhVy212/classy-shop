import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";

interface ProductImageZoomProps {
  src: string;
  alt: string;
  images?: Array<{ url: string; altText?: string; _id?: string }>;
  currentIndex?: number;
  onSelectImage?: (index: number) => void;
}

const ProductImageZoom = ({
  src,
  alt,
  images = [],
  currentIndex = 0,
  onSelectImage,
}: ProductImageZoomProps) => {
  // --- Inline Hover Zoom State ---
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // --- Modal Lightbox State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalZoom, setModalZoom] = useState(1);
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Handle mouse move for inline magnifier
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  // Handle touch move for inline magnifier on touch devices
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  // Open / Close modal
  const openModal = () => {
    setIsModalOpen(true);
    setModalZoom(1.5);
    setModalPan({ x: 0, y: 0 });
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalZoom(1);
    setModalPan({ x: 0, y: 0 });
  }, []);

  // Modal zoom handlers
  const handleZoomIn = () => {
    setModalZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setModalZoom((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setModalPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setModalZoom(1);
    setModalPan({ x: 0, y: 0 });
  };

  // Modal dragging handlers for panning zoomed image
  const handleMouseDown = (e: React.MouseEvent) => {
    if (modalZoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: modalPan.x,
      panY: modalPan.y,
    };
  };

  const handleModalMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || modalZoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setModalPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Modal wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setModalZoom((prev) => Math.min(prev + 0.25, 4));
    } else {
      setModalZoom((prev) => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setModalPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Double click toggles zoom
  const handleDoubleClick = () => {
    if (modalZoom > 1) {
      handleResetZoom();
    } else {
      setModalZoom(2.5);
    }
  };

  // Previous / Next image in modal
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1 && onSelectImage) {
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      onSelectImage(prevIndex);
      handleResetZoom();
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1 && onSelectImage) {
      const nextIndex = (currentIndex + 1) % images.length;
      onSelectImage(nextIndex);
      handleResetZoom();
    }
  };

  // Keyboard navigation inside modal & scroll lock
  useEffect(() => {
    if (!isModalOpen) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "ArrowLeft" && images.length > 1 && onSelectImage) {
        onSelectImage((currentIndex - 1 + images.length) % images.length);
        setModalZoom(1);
        setModalPan({ x: 0, y: 0 });
      } else if (e.key === "ArrowRight" && images.length > 1 && onSelectImage) {
        onSelectImage((currentIndex + 1) % images.length);
        setModalZoom(1);
        setModalPan({ x: 0, y: 0 });
      } else if (e.key === "+" || e.key === "=") {
        setModalZoom((prev) => Math.min(prev + 0.5, 4));
      } else if (e.key === "-") {
        setModalZoom((prev) => Math.max(prev - 0.5, 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, currentIndex, images.length, onSelectImage, closeModal]);

  return (
    <>
      {/* =========================================================================
          1. INLINE PRODUCT IMAGE WITH HOVER MAGNIFIER
          ========================================================================= */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setZoomPos({ x: 50, y: 50 });
        }}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => {
          setIsHovered(false);
          setZoomPos({ x: 50, y: 50 });
        }}
        onTouchMove={handleTouchMove}
        onClick={openModal}
        className="relative mb-4 overflow-hidden rounded-xl bg-gray-50/70 border border-gray-100 cursor-zoom-in group select-none flex items-center justify-center max-h-[550px] w-full"
        title="Click to expand high-res zoom"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal();
          }
        }}
        aria-label="Zoom in product image"
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-auto max-h-[550px] object-cover rounded-xl pointer-events-none transition-transform"
          style={{
            transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
            transform: isHovered ? "scale(2.4)" : "scale(1)",
            transition: isHovered
              ? "transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)"
              : "transform 0.3s ease-out",
            willChange: "transform",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          loading="eager"
        />

        {/* Floating Action Pill: Fullscreen Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openModal();
          }}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          className="absolute bottom-3.5 right-3.5 z-20 bg-black/80 hover:bg-black text-white text-xs font-medium px-3.5 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm shadow-md transition-all duration-200 cursor-pointer pointer-events-auto opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 select-none"
          aria-label="View product image fullscreen"
        >
          <Maximize2 className="h-3.5 w-3.5 cursor-pointer" />
          <span className="hidden sm:inline tracking-wider uppercase text-[11px] cursor-pointer">
            Fullscreen
          </span>
        </button>

        {/* Subtle Top-Left Magnifier Indicator */}
        <div
          className={`absolute top-3.5 left-3.5 bg-white/80 text-gray-700 text-[11px] font-medium px-2.5 py-1 rounded-md backdrop-blur-xs shadow-xs transition-opacity duration-200 pointer-events-none ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          2.4x Zoom
        </div>
      </div>

      {/* =========================================================================
          2. FULLSCREEN LIGHTBOX MODAL WITH ULTRA HIGH-RES PAN & ZOOM
          ========================================================================= */}
      {isModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
            onClick={closeModal}
          >
            {/* Modal Top Control Bar */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-20 bg-black/40 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left: Product Name & Image Counter */}
              <div className="flex items-center gap-3 text-white">
                <span className="text-sm font-semibold tracking-wide truncate max-w-[200px] sm:max-w-md">
                  {alt}
                </span>
                {images.length > 1 && (
                  <span className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
                    {currentIndex + 1} / {images.length}
                  </span>
                )}
              </div>

              {/* Center: Zoom Controls */}
              <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1 border border-white/10">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={modalZoom <= 1}
                  className="p-1.5 rounded-lg text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition"
                  aria-label="Zoom out"
                  title="Zoom out (-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 rounded-md cursor-pointer transition tracking-wider min-w-[50px] text-center"
                  title="Click to reset zoom"
                >
                  {Math.round(modalZoom * 100)}%
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={modalZoom >= 4}
                  className="p-1.5 rounded-lg text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition"
                  aria-label="Zoom in"
                  title="Zoom in (+)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/20 cursor-pointer transition"
                  aria-label="Reset zoom"
                  title="Reset (1x)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Right: Close Button */}
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition"
                aria-label="Close fullscreen modal"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Main Image Area */}
            <div
              className={`relative flex-1 overflow-hidden flex items-center justify-center p-4 ${
                modalZoom > 1
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-zoom-in"
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleModalMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onClick={(e) => {
                e.stopPropagation();
                if (modalZoom === 1) {
                  setModalZoom(2.5);
                }
              }}
            >
              {/* Previous Image Button */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/20 cursor-pointer transition shadow-lg"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* Next Image Button */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/20 cursor-pointer transition shadow-lg"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* High-Resolution Zoomed Image */}
              <div
                className="max-w-full max-h-full flex items-center justify-center transition-transform duration-75 select-none"
                style={{
                  transform: `translate(${modalPan.x}px, ${modalPan.y}px) scale(${modalZoom})`,
                  transformOrigin: "center center",
                  willChange: "transform",
                }}
              >
                <img
                  src={src}
                  alt={alt}
                  draggable={false}
                  className="max-w-[90vw] max-h-[75vh] object-contain rounded-md shadow-2xl pointer-events-none"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                />
              </div>

              {/* Helper Drag Instruction when Zoomed */}
              {modalZoom > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full border border-white/10 pointer-events-none tracking-wider font-light">
                  Drag to pan • Double click or Esc to reset
                </div>
              )}
            </div>

            {/* Modal Bottom Thumbnail Strip */}
            {images.length > 1 && (
              <div
                className="px-6 py-4 bg-black/60 border-t border-white/10 flex items-center justify-center gap-3 overflow-x-auto better-scrollbar z-20"
                onClick={(e) => e.stopPropagation()}
              >
                {images.map((img, idx) => (
                  <button
                    key={img._id || idx}
                    type="button"
                    onClick={() => {
                      onSelectImage?.(idx);
                      handleResetZoom();
                    }}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      currentIndex === idx
                        ? "border-white scale-105 ring-2 ring-white/50"
                        : "border-transparent opacity-60 hover:opacity-100 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.altText || `Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default ProductImageZoom;
