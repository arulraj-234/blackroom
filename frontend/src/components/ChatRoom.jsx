import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { Mic, Square, Play, Pause, X, Users, LogOut, XCircle, MoreVertical, Copy, Paperclip, FileText, Send } from 'lucide-react';
import '../styles/chat.css';

const ChatRoom = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Touch Recording State
  const [isTouchRecording, setIsTouchRecording] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [isSlideToCancel, setIsSlideToCancel] = useState(false);
  const touchThreshold = 50; // Pixels to slide to cancel
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioRefs = useRef({});

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [playingProgress, setPlayingProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  // Image Lightbox State
  const [selectedImage, setSelectedImage] = useState(null);

  // Upload Progress State
  const [uploadProgress, setUploadProgress] = useState(null); // { fileName, progress }

  // Helper to generate deterministic random bars for waveform
  const generateWaveformBars = useCallback((id) => {
    // Simple hash to make it deterministic per message ID
    let hash = 0;
    const str = id || 'default';
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }

    const bars = [];
    for (let i = 0; i < 30; i++) {
      // Use hash to seed random-ish values
      const val = Math.abs(Math.sin(hash + i) * 100);
      bars.push(Math.max(20, val)); // Min height 20%
    }
    return bars;
  }, []);

  // File Upload State
  const fileInputRef = useRef(null);

  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const hasJoinedRef = useRef(false);

  // SessionStorage helpers
  const saveRoomState = useCallback(() => {
    sessionStorage.setItem('activeRoom', JSON.stringify({
      roomId,
      username,
      timestamp: Date.now()
    }));
  }, [roomId, username]);

  const clearRoomState = useCallback(() => {
    sessionStorage.removeItem('activeRoom');
  }, []);

  const getRoomState = useCallback(() => {
    const state = sessionStorage.getItem('activeRoom');
    return state ? JSON.parse(state) : null;
  }, []);

  // Redirect if no username
  useEffect(() => {
    if (!username) {
      const savedState = getRoomState();
      if (!savedState || savedState.roomId !== roomId) {
        navigate('/');
      }
    }
  }, [username, navigate, roomId, getRoomState]);

  // Fetch room info
  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        const response = await fetch(`/api/chat/room/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setRoomInfo(data);
        } else {
          clearRoomState();
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching room info:', error);
      }
    };

    if (roomId) {
      fetchRoomInfo();
    }
  }, [roomId, navigate, clearRoomState]);

  // WebSocket message handler
  const handleIncomingMessage = useCallback((message) => {
    switch (message.type) {
      case 'CHAT':
      case 'JOIN':
      case 'LEAVE':
      case 'AUDIO':
      case 'IMAGE':
      case 'VIDEO':
      case 'FILE':
        setMessages((prev) => [...prev, message]);
        break;
      case 'USER_LIST':
        setUsers(message.content.split(', ').filter(u => u.trim()));
        break;
      case 'ROOM_CLOSED':
        setMessages((prev) => [...prev, message]);
        clearRoomState();
        setTimeout(() => {
          alert('Room has been closed by the host');
          navigate('/');
        }, 2000);
        break;
      default:
        break;
    }
  }, [navigate, clearRoomState]);

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  // WebSocket connection with auto-reconnect
  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    if (!username || !roomId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/chat`;

    console.log('Connecting to WebSocket...');
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempts(0);
      setIsReconnecting(false);
      saveRoomState();

      // Generate or retrieve userId
      let userId = sessionStorage.getItem('userId');
      if (!userId) {
        userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('userId', userId);
      }

      // Send JOIN message
      sendMessage({
        type: 'JOIN',
        content: '',
        sender: username,
        roomId: roomId,
        userId: userId
      });
      hasJoinedRef.current = true;
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleIncomingMessage(message);
    };

    ws.current.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      setIsConnected(false);

      if (event.code === 1009) {
        alert('Connection closed: Message too big. Please try sending a smaller file.');
      } else if (event.code !== 1000 && event.code !== 1001) {
        // console.log('Connection lost unexpectedly');
      }

      // Only attempt reconnect if we have saved state and haven't deliberately left
      const savedState = getRoomState();
      if (savedState && savedState.roomId === roomId) {
        attemptReconnect();
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      // alert('WebSocket connection error occurred.');
    };
  }, [username, roomId, handleIncomingMessage, saveRoomState, getRoomState, sendMessage]);

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= 10) {
      console.log('Max reconnection attempts reached');
      setIsReconnecting(false);
      return;
    }

    const savedState = getRoomState();
    if (!savedState || savedState.roomId !== roomId) {
      console.log('No saved state, not reconnecting');
      return;
    }

    setIsReconnecting(true);
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/10)`);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      connectWebSocket();
    }, delay);
  }, [reconnectAttempts, connectWebSocket, getRoomState, roomId]);

  // Initial WebSocket connection
  useEffect(() => {
    if (!username || !roomId) return;

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Don't close WebSocket on unmount - let visibility change handle it
    };
  }, [username, roomId, connectWebSocket]);

  // Page Visibility API - reconnect when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible');
        const savedState = getRoomState();

        if (savedState && savedState.roomId === roomId) {
          // User returned to the tab, reconnect if not connected
          if (!isConnected && ws.current?.readyState !== WebSocket.OPEN) {
            console.log('Reconnecting after visibility change');
            setReconnectAttempts(0); // Reset attempts when user returns
            connectWebSocket();
          }
        }
      } else {
        console.log('Page became hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId, isConnected, connectWebSocket, getRoomState]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Audio Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        // Only process if we want to send (not cancelled)
        if (mediaRecorderRef.current.shouldSend !== false) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result;
            sendMessage({
              type: 'AUDIO',
              content: base64Audio,
              sender: username,
              roomId: roomId
            });
          };
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) { // 5 minutes max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (mediaRecorderRef.current && isRecording) {
      // Pass the flag to the onstop handler
      mediaRecorderRef.current.shouldSend = shouldSend;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTouchRecording(false);
      setIsSlideToCancel(false);
      setTouchStartX(null);
      clearInterval(recordingTimerRef.current);
    }
  };

  // Touch Handlers for Mobile Voice Recording
  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevent scrolling/clicking
    setIsTouchRecording(true);
    setTouchStartX(e.touches[0].clientX);
    setIsSlideToCancel(false);
    startRecording();
  };

  const handleTouchMove = (e) => {
    if (!isTouchRecording || !touchStartX) return;

    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartX;

    // If slid left by threshold, show cancel state
    if (diffX < -touchThreshold) {
      setIsSlideToCancel(true);
    } else {
      setIsSlideToCancel(false);
    }
  };

  const handleTouchEnd = (e) => {
    if (!isTouchRecording) return;

    if (isSlideToCancel) {
      // Cancelled
      stopRecording(false);
    } else {
      // Sent
      stopRecording(true);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAudio = (index, content) => {
    const audio = audioRefs.current[index];
    if (!audio) return;

    // If clicking a different audio, stop the current one
    if (playingAudioId !== null && playingAudioId !== index) {
      const currentAudio = audioRefs.current[playingAudioId];
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      setPlayingAudioId(null);
      setPlayingProgress(0);
    }

    if (playingAudioId === index) {
      // Toggle pause/play
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
        setPlayingAudioId(null); // Show as paused
      }
    } else {
      // Start new audio
      setPlayingAudioId(index);
      setPlayingProgress(0);

      // Set up listeners
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlayingProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
      };

      // Handle end
      audio.onended = () => {
        setPlayingAudioId(null);
        setPlayingProgress(0);
        audio.currentTime = 0;
      };

      audio.play().catch(e => console.error("Audio play error:", e));
    }
  };

  const handleSeek = (e, index) => {
    e.stopPropagation();
    const audio = audioRefs.current[index];
    if (!audio || !audio.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.min(Math.max(0, x / width), 1);

    audio.currentTime = percentage * audio.duration;
    setPlayingProgress(percentage * 100);

    if (playingAudioId !== index) {
      toggleAudio(index);
    }
  };

  // File Upload Functions
  const processFile = async (file) => {
    if (!file) return;

    // 200MB limit (matching backend)
    if (file.size > 200 * 1024 * 1024) {
      alert('File size exceeds 200MB limit. Please choose a smaller file.');
      return;
    }

    console.log(`Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Generate unique upload ID
    const uploadId = Math.random().toString(36).substring(2, 15);
    const CHUNK_SIZE = 524286; // 512KB - 2 bytes (Must be divisible by 3 for Base64)
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Determine message type
    let type = 'FILE';
    if (file.type.startsWith('image/')) type = 'IMAGE';
    else if (file.type.startsWith('video/')) type = 'VIDEO';

    // 1. Send UPLOAD_START
    sendMessage({
      type: 'UPLOAD_START',
      content: '',
      sender: username,
      roomId: roomId,
      fileName: file.name,
      fileType: type, // Send the intended final message type (IMAGE/VIDEO/FILE)
      uploadId: uploadId,
      totalChunks: totalChunks
    });

    setUploadProgress({ fileName: file.name, progress: 0 });

    // 2. Send Chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);

      // Read chunk as ArrayBuffer then convert to Base64
      const base64Chunk = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          const result = reader.result;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(chunk);
      });

      sendMessage({
        type: 'UPLOAD_CHUNK',
        content: base64Chunk,
        sender: username,
        roomId: roomId,
        uploadId: uploadId,
        chunkIndex: i
      });

      // Update progress
      setUploadProgress({
        fileName: file.name,
        progress: Math.round(((i + 1) / totalChunks) * 100)
      });

      // Small delay to prevent flooding the WebSocket buffer
      await new Promise(r => setTimeout(r, 10));
    }

    // 3. Send UPLOAD_END
    sendMessage({
      type: 'UPLOAD_END',
      content: '',
      sender: username,
      roomId: roomId,
      uploadId: uploadId,
      fileName: file.name,
      fileType: file.type // Send actual MIME type here if needed, but backend uses the one from START
    });

    setUploadProgress(null);
    console.log('File upload complete');
  };

  const handleFileSelect = (e) => {
    processFile(e.target.files[0]);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        processFile(file);
        e.preventDefault(); // Prevent pasting the image binary data as text
        return;
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() && isConnected) {
      sendMessage({
        type: 'CHAT',
        content: inputValue.trim(),
        sender: username,
        roomId: roomId
      });
      setInputValue('');
    }
  };

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      clearRoomState(); // Clear state before leaving
      sendMessage({
        type: 'LEAVE',
        content: '',
        sender: username,
        roomId: roomId
      });
      if (ws.current) {
        ws.current.close();
      }
      navigate('/');
    }
  };

  const handleCloseRoom = () => {
    if (window.confirm('Are you sure you want to close this room? All users will be disconnected.')) {
      clearRoomState();
      sendMessage({
        type: 'ROOM_CLOSED',
        content: '',
        sender: username,
        roomId: roomId
      });
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard!');
    setIsActionsOpen(false);
  };

  const toggleUserList = () => {
    setIsUserListOpen(!isUserListOpen);
  };

  const toggleActions = () => {
    setIsActionsOpen(!isActionsOpen);
  };

  const getUserInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  if (!roomInfo) {
    return <div className="loading">Loading room info...</div>;
  }

  const isHost = roomInfo.hostUsername === username;

  return (
    <div className="container" style={{ height: '100vh', padding: 0, maxWidth: '100%' }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '1rem',
        background: 'rgba(5, 5, 5, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 40,
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Upload Progress Overlay */}
        {uploadProgress && (
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.8)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            color: 'white',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            zIndex: 50,
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            Uploading {uploadProgress.fileName}: {uploadProgress.progress}%
          </div>
        )}

        {/* Left: Connection Indicator + Room Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? 'var(--success)' : 'var(--error)',
            boxShadow: isConnected ? '0 0 10px var(--success)' : 'none'
          }} title={isConnected ? 'Connected' : 'Disconnected'} />
          <h2 style={{ fontSize: '1rem', margin: 0, lineHeight: 1.2 }}>
            {roomInfo.roomName || roomId}
          </h2>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={toggleUserList}
            className="btn btn-ghost btn-round"
            style={{ padding: '0.5rem', color: 'var(--text-primary)' }}
            title="Online Users"
          >
            <Users size={20} />
          </button>

          <ThemeToggle />

          <button
            onClick={toggleActions}
            className="btn btn-ghost btn-round"
            style={{ padding: '0.5rem', color: 'var(--text-primary)' }}
            title="More Options"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '5rem 1rem 6rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        scrollBehavior: 'smooth'
      }}>
        {messages.map((msg, index) => {
          const isSelf = msg.sender === username;
          const isAudio = msg.type === 'AUDIO';
          const isImage = msg.type === 'IMAGE';
          const isVideo = msg.type === 'VIDEO';
          const isFile = msg.type === 'FILE';

          // Check if this message is part of a group (consecutive messages from same sender)
          const prevMsg = messages[index - 1];
          const nextMsg = messages[index + 1];
          const isGroupStart = !prevMsg || prevMsg.sender !== msg.sender;
          const isGroupEnd = !nextMsg || nextMsg.sender !== msg.sender;
          const isGroupMiddle = !isGroupStart && !isGroupEnd;

          // Determine border radius based on position in group
          let borderRadius;
          if (isSelf) {
            if (isGroupStart && isGroupEnd) {
              borderRadius = '16px 16px 16px 16px'; // Single message
            } else if (isGroupStart) {
              borderRadius = '16px 16px 4px 16px'; // First in group
            } else if (isGroupEnd) {
              borderRadius = '16px 4px 16px 16px'; // Last in group
            } else {
              borderRadius = '16px 4px 4px 16px'; // Middle of group
            }
          } else {
            if (isGroupStart && isGroupEnd) {
              borderRadius = '16px 16px 16px 16px'; // Single message
            } else if (isGroupStart) {
              borderRadius = '16px 16px 16px 4px'; // First in group
            } else if (isGroupEnd) {
              borderRadius = '4px 16px 16px 16px'; // Last in group
            } else {
              borderRadius = '4px 16px 16px 4px'; // Middle of group
            }
          }

          return (
            <div
              key={index}
              className={`animate-in`}
              style={{
                alignSelf: isSelf ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                animationDelay: `${index * 50}ms`,
                marginBottom: isGroupEnd ? '1rem' : '0.125rem' // Smaller gap between grouped messages
              }}
            >
              {/* Show sender name only at the start of a group for other users */}
              {!isSelf && isGroupStart && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', marginLeft: '0.5rem' }}>
                  {msg.sender}
                </div>
              )}
              <div style={{
                padding: (isImage || isVideo) ? '0' : '0.75rem 1rem',
                borderRadius: borderRadius,
                background: (isImage || isVideo) ? 'transparent' : (isSelf ? 'var(--text-primary)' : 'var(--bg-tertiary)'),
                color: isSelf ? 'var(--bg-primary)' : 'var(--text-primary)',
                border: (isImage || isVideo) ? 'none' : (isSelf ? 'none' : '1px solid var(--border-color)'),
                boxShadow: (isImage || isVideo) ? 'none' : (isSelf ? '0 4px 12px rgba(255,255,255,0.1)' : 'none'),
                fontSize: '0.9375rem',
                lineHeight: '1.5',
                wordBreak: 'break-word',
                overflow: 'hidden' // Ensure rounded corners for images
              }}>
                {isAudio ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAudio(index, msg.content); }}
                      style={{
                        background: isSelf ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'inherit',
                        flexShrink: 0
                      }}
                    >
                      {playingAudioId === index ? <Pause size={16} /> : <Play size={16} />}
                    </button>

                    {/* Instagram-style Waveform Visualizer */}
                    <div
                      onClick={(e) => handleSeek(e, index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        height: '24px',
                        marginLeft: '0.75rem',
                        cursor: 'pointer',
                        flex: 1,
                        minWidth: '120px'
                      }}
                    >
                      {generateWaveformBars(msg.timestamp + index).map((height, i) => {
                        // Calculate if this bar is "played" based on progress
                        const isPlayed = playingAudioId === index && (i / 30) * 100 < playingProgress;
                        return (
                          <div key={i} style={{
                            width: '3px',
                            height: `${height}%`,
                            background: 'currentColor',
                            opacity: isPlayed ? 1 : 0.4,
                            borderRadius: '2px',
                            transition: 'opacity 0.1s ease'
                          }} />
                        );
                      })}
                    </div>

                    {/* Time Indicator */}
                    <div style={{
                      fontSize: '0.7rem',
                      marginLeft: '0.5rem',
                      opacity: 0.8,
                      minWidth: '35px',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {playingAudioId === index && audioRefs.current[index]?.duration
                        ? formatTime(audioRefs.current[index].currentTime)
                        : formatTime(audioRefs.current[index]?.duration || 0)}
                    </div>

                    <audio
                      ref={el => audioRefs.current[index] = el}
                      src={msg.content}
                      onLoadedMetadata={() => {
                        // Force update to show duration
                        if (audioRefs.current[index]) {
                          setAudioDuration(audioRefs.current[index].duration);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </div>
                ) : isImage ? (
                  <img
                    src={msg.content}
                    alt="Shared image"
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(msg.content); }}
                    style={{
                      maxWidth: '100%',
                      borderRadius: '8px',
                      display: 'block',
                      maxHeight: '300px',
                      objectFit: 'contain',
                      cursor: 'pointer'
                    }}
                  />
                ) : isVideo ? (
                  <video
                    src={msg.content}
                    controls
                    style={{
                      maxWidth: '100%',
                      borderRadius: '8px',
                      display: 'block',
                      maxHeight: '300px'
                    }}
                  />
                ) : isFile ? (
                  <a
                    href={msg.content}
                    download={msg.fileName || 'download'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem',
                      background: isSelf ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = isSelf ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isSelf ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.05)'}
                  >
                    <FileText size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                        {msg.fileName || 'Document'}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        Click to download
                      </div>
                    </div>
                  </a>
                ) : (
                  msg.content
                )}
              </div>

              {/* Timestamp below the bubble - Only at end of group */}
              {isGroupEnd && (
                <div style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.25rem',
                  textAlign: isSelf ? 'right' : 'left',
                  opacity: 0.7,
                  paddingLeft: isSelf ? '0' : '0.5rem',
                  paddingRight: isSelf ? '0.5rem' : '0',
                  marginBottom: '0.25rem'
                }}>
                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '0.75rem 1rem 1.5rem', // Extra bottom padding for mobile
        background: 'var(--bg-primary)', // Solid background for better contrast
        zIndex: 40,
        borderTop: '1px solid var(--border-color)'
      }}>
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}
        >
          {isRecording ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between', // Ensure items are spread out
              width: '100%', // Force full width for flex container
              gap: '0.5rem',
              padding: '0.5rem', // Reduced padding further
              background: isSlideToCancel ? 'rgba(255, 59, 48, 0.1)' : 'var(--bg-secondary)',
              borderRadius: '24px',
              border: `1px solid ${isSlideToCancel ? 'var(--error)' : 'var(--border-color)'}`,
              transition: 'all 0.2s ease'
            }}>
              {/* Show different UI based on slide state */}
              {isSlideToCancel ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', fontWeight: '600', paddingLeft: '0.5rem' }}>
                  <XCircle size={20} />
                  <span>Release to Cancel</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => stopRecording(false)}
                    className="btn btn-ghost"
                    style={{
                      color: 'var(--text-secondary)',
                      padding: '0.5rem',
                      borderRadius: '50%',
                      marginRight: 'auto' // Push to left
                    }}
                  >
                    <X size={20} />
                  </button>

                  {/* Wave Visualizer */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '24px', margin: '0 0.5rem' }}>
                    {[...Array(15)].map((_, i) => (
                      <div key={i} style={{
                        width: '3px',
                        background: 'var(--error)',
                        borderRadius: '2px',
                        animation: `wave 1s ease-in-out infinite`,
                        animationDelay: `${Math.random() * 0.5}s`, // Randomize delay for organic look
                        height: '100%'
                      }} />
                    ))}
                  </div>

                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--error)', fontSize: '0.875rem' }}>
                    {formatTime(recordingTime)}
                  </span>
                </>
              )}

              <button
                onClick={() => stopRecording(true)}
                className="btn btn-ghost"
                style={{
                  color: isSlideToCancel ? 'var(--error)' : 'var(--primary)',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isSlideToCancel ? 0.5 : 1
                }}
              >
                {isSlideToCancel ? <X size={20} /> : <Send size={20} fill="currentColor" style={{ transform: 'rotate(45deg)', marginLeft: '-2px', marginTop: '2px' }} />}
              </button>
            </div>
          ) : (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                style={{ display: 'none' }}
              />

              {/* Attach Button (Left) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost"
                style={{
                  color: 'var(--text-secondary)',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                disabled={!isConnected}
                title="Attach File"
              >
                <Paperclip size={22} />
              </button>

              {/* Input Field (Center) */}
              <form onSubmit={handleSendMessage} style={{ display: 'flex', flex: 1 }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Message..."
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'var(--bg-secondary)',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '24px', // Pill shape
                    color: 'var(--text-primary)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    border: '1px solid var(--border-color)'
                  }}
                  disabled={!isConnected}
                />
              </form>

              {/* Mic/Send Button (Right) */}
              {inputValue.trim() ? (
                <button
                  onClick={handleSendMessage}
                  className="btn btn-ghost"
                  style={{
                    minHeight: 'auto',
                    padding: '0',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--text-primary)'
                  }}
                  disabled={!isConnected}
                >
                  <Send size={22} fill="currentColor" style={{ transform: 'rotate(45deg)', marginLeft: '-2px', marginTop: '2px' }} />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="btn btn-ghost"
                  style={{
                    color: 'var(--text-secondary)',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                    userSelect: 'none', // Prevent text selection on touch
                    touchAction: 'none' // Prevent browser gestures
                  }}
                  disabled={!isConnected}
                  title="Record Voice Note"
                >
                  <Mic size={22} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actions Bottom Sheet */}
      <div className={`user-list-overlay ${isActionsOpen ? 'open' : ''}`} onClick={toggleActions} style={{ zIndex: 55 }} />
      <div className={`actions-sheet ${isActionsOpen ? 'open' : ''}`} style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        padding: '1.5rem',
        transform: isActionsOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          width: '40px',
          height: '4px',
          background: 'var(--border-color)',
          borderRadius: '2px',
          margin: '-0.5rem auto 1rem',
          opacity: 0.5
        }} />

        <button
          onClick={copyRoomId}
          className="btn btn-ghost"
          style={{
            justifyContent: 'flex-start',
            padding: '1rem',
            gap: '1rem',
            fontSize: '1rem'
          }}
        >
          <Copy size={20} />
          Copy Room ID
        </button>

        {isHost && (
          <button
            onClick={() => { handleCloseRoom(); setIsActionsOpen(false); }}
            className="btn btn-ghost"
            style={{
              justifyContent: 'flex-start',
              padding: '1rem',
              gap: '1rem',
              fontSize: '1rem',
              color: 'var(--error)'
            }}
          >
            <XCircle size={20} />
            Close Room
          </button>
        )}

        <button
          onClick={() => { handleLeave(); setIsActionsOpen(false); }}
          className="btn btn-ghost"
          style={{
            justifyContent: 'flex-start',
            padding: '1rem',
            gap: '1rem',
            fontSize: '1rem',
            color: 'var(--error)'
          }}
        >
          <LogOut size={20} />
          Leave Room
        </button>
      </div>

      {/* User List Drawer */}
      <div className={`user-list-overlay ${isUserListOpen ? 'open' : ''}`} onClick={toggleUserList} />
      <div className={`user-list-drawer ${isUserListOpen ? 'open' : ''}`}>
        <div className="user-list-header">
          <h3>Online Users ({users.length})</h3>
          <button className="close-drawer-btn" onClick={toggleUserList} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        <div className="user-list-content">
          {users.map((user, index) => (
            <div key={index} className={`user-item ${user === username ? 'current-user' : ''}`}>
              <div className="user-avatar">{getUserInitial(user)}</div>
              <div className="user-info">
                <div className="user-name">{user}</div>
                {user === username && <div className="you-label">You</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="connection-status disconnected">
          {isReconnecting ? `Reconnecting... (${reconnectAttempts + 1}/10)` : 'Disconnected'}
        </div>
      )}
      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <img
            src={selectedImage}
            alt="Full size"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '4px',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself? Actually instagram closes on drag or click outside. Let's keep click outside to close for now.
          />
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)'
            }}
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
