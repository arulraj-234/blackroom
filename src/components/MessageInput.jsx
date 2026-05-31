import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Smile, SendHorizonal, X, Image, Film, Music } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import EmojiPicker from './EmojiPicker';

export default function MessageInput({ conversationId, replyingTo, onCancelReply }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 5 * 24; // ~5 lines
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [content, resizeTextarea]);

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo) textareaRef.current?.focus();
  }, [replyingTo]);

  // Detect file type helper
  const getMediaType = useCallback((fileObj) => {
    if (!fileObj) return null;
    const t = fileObj.type;
    if (t.startsWith('image/')) return 'image';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('audio/')) return 'audio';
    return 'file';
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    (fileObj) => {
      if (!fileObj) return;
      setFile(fileObj);
      const mediaType = getMediaType(fileObj);

      if (mediaType === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview({ url: e.target.result, type: mediaType, name: fileObj.name });
        reader.readAsDataURL(fileObj);
      } else {
        setFilePreview({ url: null, type: mediaType, name: fileObj.name });
      }
    },
    [getMediaType]
  );

  const handleFileInputChange = useCallback(
    (e) => {
      if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    setFilePreview(null);
    setUploadProgress(0);
  }, []);

  // Drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
    },
    [handleFileSelect]
  );

  // Upload file to Supabase storage
  const uploadFile = useCallback(
    async (fileObj) => {
      if (!fileObj || !conversationId) return null;

      const ext = fileObj.name.split('.').pop();
      const uuid = crypto.randomUUID();
      const path = `${conversationId}/${uuid}.${ext}`;

      setUploading(true);
      setUploadProgress(0);

      // Simulate progress since supabase-js doesn't expose upload progress natively
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 150);

      const { error } = await supabase.storage
        .from('media')
        .upload(path, fileObj, { cacheControl: '3600', upsert: false });

      clearInterval(progressInterval);

      if (error) {
        console.error('Upload error:', error);
        setUploading(false);
        setUploadProgress(0);
        return null;
      }

      const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(path);

      setUploadProgress(100);
      setUploading(false);

      return {
        url: publicUrlData.publicUrl,
        type: getMediaType(fileObj),
      };
    },
    [conversationId, getMediaType]
  );

  // Send message
  const handleSend = useCallback(async () => {
    const text = content.trim();
    if (!text && !file) return;
    if (!conversationId || !user) return;

    const messagePayload = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: text || null,
    };

    if (replyingTo) {
      messagePayload.reply_to = replyingTo.id;
    }

    // Upload media if present
    if (file) {
      const result = await uploadFile(file);
      if (result) {
        messagePayload.media_url = result.url;
        messagePayload.media_type = result.type;
      }
    }

    // Clear inputs optimistically
    setContent('');
    clearFile();
    onCancelReply?.();

    await supabase.from('messages').insert(messagePayload);
  }, [content, file, conversationId, user, replyingTo, uploadFile, clearFile, onCancelReply]);

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Emoji picker position & selection
  const getEmojiPosition = useCallback(() => {
    if (!emojiButtonRef.current) return { top: 0, left: 0 };
    const rect = emojiButtonRef.current.getBoundingClientRect();
    return { top: rect.top - 52, left: rect.left - 100 };
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji) => {
      setContent((prev) => prev + emoji);
      setShowEmoji(false);
      textareaRef.current?.focus();
    },
    []
  );

  const fileTypeIcon = {
    image: <Image size={16} className="text-indigo-400" />,
    video: <Film size={16} className="text-pink-400" />,
    audio: <Music size={16} className="text-green-400" />,
    file: <Paperclip size={16} className="text-gray-400" />,
  };

  return (
    <div
      className={`border-t border-[#1e1e1e] bg-[#0a0a0a] transition-colors
                  ${isDragOver ? 'bg-indigo-500/5 border-indigo-500/30' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Reply preview bar */}
      {replyingTo && (
        <div className="flex items-center gap-3 px-4 pt-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#111] rounded-lg border-l-2 border-indigo-500">
            <span className="text-xs text-indigo-400 font-medium truncate">
              Replying to {replyingTo.sender_username || 'message'}
            </span>
            <span className="text-xs text-gray-500 truncate max-w-[200px]">
              {replyingTo.content}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* File preview */}
      {filePreview && (
        <div className="px-4 pt-3">
          <div className="inline-flex items-center gap-3 px-3 py-2 bg-[#111] rounded-lg border border-[#2a2a2a]">
            {filePreview.type === 'image' && filePreview.url ? (
              <img
                src={filePreview.url}
                alt="Preview"
                className="w-12 h-12 rounded object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-[#1a1a1a] flex items-center justify-center">
                {fileTypeIcon[filePreview.type] || fileTypeIcon.file}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs text-gray-300 truncate max-w-[180px]">{filePreview.name}</span>
              <span className="text-[10px] text-gray-600 uppercase">{filePreview.type}</span>
            </div>
            <button
              onClick={clearFile}
              className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="px-4 pt-2">
          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-3 sm:p-4">
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5
                     transition-colors shrink-0 cursor-pointer"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          className="flex-1 resize-none bg-[#111] border border-[#2a2a2a] rounded-2xl
                     px-4 py-3 text-sm text-white placeholder-gray-600
                     focus:outline-none focus:border-[#3a3a3a] focus:ring-1 focus:ring-white/5
                     transition-all leading-relaxed"
          style={{ minHeight: '44px' }}
        />

        {/* Emoji button */}
        <button
          ref={emojiButtonRef}
          onClick={() => setShowEmoji((v) => !v)}
          className="p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5
                     transition-colors shrink-0 cursor-pointer"
          title="Emoji"
        >
          <Smile size={20} />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!content.trim() && !file) || uploading}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500
                     text-white transition-all shrink-0
                     disabled:opacity-30 disabled:hover:bg-indigo-600 cursor-pointer"
          title="Send"
        >
          <SendHorizonal size={20} />
        </button>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <EmojiPicker
          position={getEmojiPosition()}
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {/* Drag overlay hint */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none rounded-lg">
          <div className="text-center">
            <Image size={40} className="mx-auto mb-2 text-indigo-400" />
            <p className="text-sm text-gray-300">Drop file to attach</p>
          </div>
        </div>
      )}
    </div>
  );
}
