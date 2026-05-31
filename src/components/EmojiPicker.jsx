import React, { useEffect, useRef } from 'react';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

export default function EmojiPicker({ onSelect, position, onClose }) {
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="fixed z-[100] animate-emoji-in"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
      }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-lg shadow-black/50">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="w-9 h-9 flex items-center justify-center text-lg rounded-lg
                       hover:bg-white/10 active:scale-90
                       transition-all duration-150 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* inline keyframes – scoped to this component */}
      <style>{`
        @keyframes emoji-scale-in {
          0%   { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-emoji-in {
          animation: emoji-scale-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: bottom center;
        }
      `}</style>
    </div>
  );
}
