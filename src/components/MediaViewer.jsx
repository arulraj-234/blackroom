import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download } from 'lucide-react';

export default function MediaViewer({ mediaUrl, mediaType, onClose }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Click outside media to close
  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  // Scroll to zoom (images only)
  const handleWheel = useCallback(
    (e) => {
      if (mediaType !== 'image') return;
      e.preventDefault();
      setScale((prev) => Math.min(Math.max(prev - e.deltaY * 0.002, 0.5), 5));
    },
    [mediaType]
  );

  // Drag to pan (images only)
  const handleMouseDown = useCallback(
    (e) => {
      if (mediaType !== 'image') return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      translateStart.current = { ...translate };
    },
    [mediaType, translate]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      setTranslate({
        x: translateStart.current.x + (e.clientX - dragStart.current.x),
        y: translateStart.current.y + (e.clientY - dragStart.current.y),
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const resp = await fetch(mediaUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mediaUrl.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(mediaUrl, '_blank');
    }
  }, [mediaUrl]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="fixed inset-0 z-[200] flex items-center justify-center
                 bg-black/90 backdrop-blur-md animate-viewer-in"
    >
      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={handleDownload}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20
                     text-white transition-colors cursor-pointer"
          title="Download"
        >
          <Download size={18} />
        </button>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20
                     text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Media */}
      {mediaType === 'image' && (
        <img
          src={mediaUrl}
          alt=""
          draggable={false}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg select-none"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'transform 0.15s ease',
          }}
        />
      )}

      {mediaType === 'video' && (
        <video
          src={mediaUrl}
          controls
          autoPlay
          className="max-w-[90vw] max-h-[90vh] rounded-lg"
        />
      )}

      {/* Fallback for other types */}
      {mediaType !== 'image' && mediaType !== 'video' && (
        <div className="text-white text-center">
          <p className="text-lg mb-4">Preview not available</p>
          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            Download File
          </button>
        </div>
      )}

      <style>{`
        @keyframes viewer-fade-in {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-viewer-in {
          animation: viewer-fade-in 0.2s ease forwards;
        }
      `}</style>
    </div>
  );
}
