import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/useUserStore';
import { useChatStore } from '../stores/useChatStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getSocket } from '../services/socket';
import SimplePeer from 'simple-peer';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, SkipForward,
  MessageSquare, Monitor, Sun, Moon, UserPlus, Star,
  Send, Smile, Sparkles, Wifi, WifiOff, Settings,
  ChevronLeft, X, Heart
} from 'lucide-react';

// ─── Matching Overlay ───
function MatchingOverlay() {
  return (
    <motion.div
      className="matching-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="matching-spinner" />
      <motion.h2
        style={{ fontSize: '1.5rem', fontWeight: 700 }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Finding someone amazing...
      </motion.h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Connecting you with the perfect match
      </p>
    </motion.div>
  );
}

// ─── Rating Modal ───
function RatingModal({ onSubmit, onClose }) {
  const [rating, setRating] = useState(0);
  return (
    <motion.div
      className="rating-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="rating-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>Rate this conversation</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
          How was your chat experience?
        </p>
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              className={s <= rating ? 'filled' : ''}
              onClick={() => setRating(s)}
            >
              <Star size={28} fill={s <= rating ? '#f59e0b' : 'none'} />
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Skip</button>
          <button className="btn-primary" onClick={() => onSubmit(rating)} style={{ flex: 1 }}>Submit</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Floating Reaction ───
function FloatingReaction({ emoji, id }) {
  const left = Math.random() * 80 + 10;
  return (
    <motion.div
      className="floating-reaction"
      style={{ left: `${left}%`, bottom: '20%' }}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -150, scale: 1.5 }}
      transition={{ duration: 2 }}
    >
      {emoji}
    </motion.div>
  );
}

// ─── Connection Quality ───
function ConnectionQuality({ quality }) {
  const bars = quality === 'good' ? 4 : quality === 'medium' ? 2 : 1;
  return (
    <div className="connection-quality" title={`Connection: ${quality}`}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`quality-bar ${i <= bars ? 'active' : ''}`}
          style={{ height: 4 + i * 3 }}
        />
      ))}
    </div>
  );
}

// ─── Main Chat Page ───
export default function ChatPage() {
  const navigate = useNavigate();
  const { nickname, avatar, interests, category } = useUserStore();
  const {
    status, setStatus, mode, setMode, roomId, setRoomId,
    peer, setPeer, messages, addMessage, setMessages,
    isTyping, setIsTyping, icebreaker, setIcebreaker,
    localStream, setLocalStream, remoteStream, setRemoteStream,
    isMuted, toggleMute, isCameraOff, toggleCamera,
    connectionQuality, resetChat,
  } = useChatStore();
  const { theme, toggleTheme } = useSettingsStore();

  const [messageInput, setMessageInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [friendRequested, setFriendRequested] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect if no nickname
  useEffect(() => {
    if (!nickname) navigate('/');
  }, [nickname, navigate]);

  // Set up socket listeners and get media
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Get local media for video/voice modes
    async function getMedia() {
      if (mode === 'text') return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: mode === 'video',
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Media error:', err);
        // Fallback to text mode
        setMode('text');
      }
    }
    getMedia();

    // Socket events
    socket.on('matched', handleMatched);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('chat-message', handleChatMessage);
    socket.on('typing', handleTyping);
    socket.on('peer-skipped', handlePeerSkipped);
    socket.on('peer-disconnected', handlePeerDisconnected);
    socket.on('reaction', handleReaction);
    socket.on('friend-request', handleFriendRequest);
    socket.on('friend-accepted', handleFriendAccepted);

    return () => {
      socket.off('matched', handleMatched);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('chat-message', handleChatMessage);
      socket.off('typing', handleTyping);
      socket.off('peer-skipped', handlePeerSkipped);
      socket.off('peer-disconnected', handlePeerDisconnected);
      socket.off('reaction', handleReaction);
      socket.off('friend-request', handleFriendRequest);
      socket.off('friend-accepted', handleFriendAccepted);
    };
  }, [mode]);

  // Attach local stream to video element when it changes or when status changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, status]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, status]);

  // ─── Handlers ───
  function handleMatched(data) {
    setStatus('matched');
    setRoomId(data.roomId);
    setPeer(data.peer);
    setIcebreaker(data.icebreaker);
    setMessages([]);
    setFriendRequested(false);

    if (mode !== 'text' && data.isInitiator) {
      createPeer(data.roomId, true);
    }
  }

  function handleOffer({ offer, roomId: rId }) {
    createPeer(rId, false, offer);
  }

  function handleAnswer({ answer }) {
    if (peerRef.current) {
      peerRef.current.signal(answer);
    }
  }

  function handleIceCandidate({ candidate }) {
    // handled by simple-peer internally
  }

  function handleChatMessage(msg) {
    if (msg.senderId !== socketRef.current?.id) {
      addMessage({ ...msg, isMine: false });
    }
  }

  function handleTyping({ isTyping: typing }) {
    setIsTyping(typing);
  }

  function handlePeerSkipped() {
    destroyPeer();
    setShowRating(true);
  }

  function handlePeerDisconnected() {
    destroyPeer();
    setShowRating(true);
  }

  function handleReaction({ emoji, from }) {
    const id = Date.now() + Math.random();
    setReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  }

  function handleFriendRequest({ from }) {
    addMessage({
      id: Date.now(),
      sender: 'System',
      content: `${from.nickname} sent you a friend request! 💫`,
      type: 'system',
      timestamp: Date.now(),
      isMine: false,
    });
  }

  function handleFriendAccepted({ user }) {
    addMessage({
      id: Date.now(),
      sender: 'System',
      content: `${user.nickname} accepted your friend request! 🎉`,
      type: 'system',
      timestamp: Date.now(),
      isMine: false,
    });
  }

  // ─── WebRTC ───
  function createPeer(rId, initiator, incomingOffer) {
    destroyPeer();
    try {
      const p = new SimplePeer({
        initiator,
        trickle: true,
        stream: localStream || undefined,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
          ],
        },
      });

      p.on('signal', (data) => {
        const socket = socketRef.current;
        if (data.type === 'offer') {
          socket.emit('offer', { roomId: rId, offer: data });
        } else if (data.type === 'answer') {
          socket.emit('answer', { roomId: rId, answer: data });
        } else if (data.candidate) {
          socket.emit('ice-candidate', { roomId: rId, candidate: data });
        }
      });

      p.on('stream', (stream) => {
        setRemoteStream(stream);
      });

      p.on('error', (err) => {
        console.error('Peer error:', err);
      });

      p.on('close', () => {
        console.log('Peer connection closed');
      });

      if (incomingOffer) {
        p.signal(incomingOffer);
      }

      peerRef.current = p;
    } catch (err) {
      console.error('Error creating peer:', err);
    }
  }

  function destroyPeer() {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setRemoteStream(null);
  }

  // ─── Actions ───
  function findMatch() {
    setStatus('searching');
    resetChat();
    setStatus('searching');
    const socket = socketRef.current;
    socket.emit('find-match', { category, interests, mode });
  }

  function skipUser() {
    const socket = socketRef.current;
    if (roomId) {
      socket.emit('skip', { roomId });
    }
    destroyPeer();
    setShowRating(true);
  }

  function sendMessage() {
    if (!messageInput.trim() || !roomId) return;
    const socket = socketRef.current;
    socket.emit('chat-message', { roomId, content: messageInput, type: 'text' });
    addMessage({
      id: Date.now(),
      sender: nickname,
      senderId: socket.id,
      content: messageInput,
      type: 'text',
      timestamp: Date.now(),
      isMine: true,
    });
    setMessageInput('');
    socket.emit('typing', { roomId, isTyping: false });
  }

  function handleInputChange(val) {
    setMessageInput(val);
    const socket = socketRef.current;
    if (roomId) socket.emit('typing', { roomId, isTyping: val.length > 0 });
  }

  function sendReaction(emoji) {
    const socket = socketRef.current;
    if (roomId) socket.emit('reaction', { roomId, emoji });
    const id = Date.now() + Math.random();
    setReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2500);
  }

  function sendFriendRequest() {
    const socket = socketRef.current;
    if (roomId) {
      socket.emit('friend-request', { roomId });
      setFriendRequested(true);
    }
  }

  function handleRating(rating) {
    const socket = socketRef.current;
    if (roomId) socket.emit('rate-conversation', { roomId, rating });
    setShowRating(false);
    resetChat();
  }

  function handleToggleMute() {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    }
    toggleMute();
  }

  function handleToggleCamera() {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
    }
    toggleCamera();
  }

  function endChat() {
    destroyPeer();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    resetChat();
    navigate('/');
  }

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-layout">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <button className="btn-icon" onClick={endChat} title="Leave">
            <ChevronLeft size={18} />
          </button>
          <div className="logo-icon">⚡</div>
          <span className="glow-text">QuantumChat</span>
        </div>

        <div className="navbar-actions">
          {status === 'matched' && peer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                {peer.nickname?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{peer.nickname}</span>
              <ConnectionQuality quality={connectionQuality} />
            </div>
          )}

          {/* Mode Selector */}
          <div className="mode-selector">
            {[
              { id: 'video', Icon: Video },
              { id: 'voice', Icon: Mic },
              { id: 'text', Icon: MessageSquare },
            ].map(({ id, Icon }) => (
              <button
                key={id}
                className={`mode-btn ${mode === id ? 'active' : ''}`}
                onClick={() => setMode(id)}
                style={{ padding: '6px 14px' }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <button className="btn-icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {/* Main Area */}
        <div className="chat-area">
          {/* Idle State */}
          {status === 'idle' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>⚡</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
                  Ready to connect?
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 400 }}>
                  Click the button below to find someone to chat with in the <strong>{category}</strong> category
                </p>
                <motion.button
                  className="btn-primary"
                  onClick={findMatch}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ fontSize: '1.1rem', padding: '16px 40px' }}
                >
                  <Sparkles size={20} /> Find a Match
                </motion.button>
              </motion.div>
            </div>
          )}

          {/* Video/Voice Area */}
          {status === 'matched' && mode !== 'text' && (
            <div className="video-grid">
              <motion.div
                className="video-container"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="video-label">
                  {nickname} (You)
                  {isMuted && <MicOff size={12} style={{ marginLeft: 6 }} />}
                </div>
                {isCameraOff && mode === 'video' && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-secondary)', flexDirection: 'column', gap: 8
                  }}>
                    <div className="avatar" style={{ width: 60, height: 60, fontSize: '1.5rem' }}>
                      {nickname?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Camera off</span>
                  </div>
                )}
              </motion.div>

              <motion.div
                className="video-container"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {remoteStream ? (
                  <video ref={remoteVideoRef} autoPlay playsInline />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 8
                  }}>
                    <div className="avatar" style={{ width: 60, height: 60, fontSize: '1.5rem' }}>
                      {peer?.nickname?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Connecting...</span>
                  </div>
                )}
                <div className="video-label">
                  {peer?.nickname || 'Stranger'}
                </div>
              </motion.div>
            </div>
          )}

          {/* Text-Only Mode */}
          {status === 'matched' && mode === 'text' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Icebreaker */}
              {icebreaker && (
                <motion.div
                  className="icebreaker-card"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Sparkles size={16} /> {icebreaker}
                </motion.div>
              )}

              {/* Messages */}
              <div className="chat-messages" style={{ flex: 1 }}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Connected with <strong style={{ color: 'var(--text-primary)' }}>{peer?.nickname}</strong>
                  </p>
                  {peer?.interests?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                      {peer.interests.map((i) => (
                        <span key={i} className="badge" style={{ fontSize: '0.7rem' }}>{i}</span>
                      ))}
                    </div>
                  )}
                </div>

                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`message-bubble ${msg.isMine ? 'sent' : msg.type === 'system' ? '' : 'received'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={msg.type === 'system' ? {
                      alignSelf: 'center', background: 'transparent', color: 'var(--accent-primary)',
                      fontSize: '0.82rem', fontStyle: 'italic'
                    } : {}}
                  >
                    {msg.content}
                    {msg.type !== 'system' && (
                      <div className="msg-time">{formatTime(msg.timestamp)}</div>
                    )}
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    className="message-bubble received"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
                  >
                    typing...
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chat-input-area">
                <div style={{ display: 'flex', gap: 4, marginRight: 4 }}>
                  {['😊', '😂', '❤️', '🔥', '👏'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: 4 }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  style={{ flex: 1 }}
                />
                <button className="btn-icon active" onClick={sendMessage}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          {status === 'matched' && (
            <div className="video-controls">
              {mode !== 'text' && (
                <>
                  <motion.button
                    className={`btn-icon ${isMuted ? 'danger' : ''}`}
                    onClick={handleToggleMute}
                    whileTap={{ scale: 0.9 }}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </motion.button>

                  {mode === 'video' && (
                    <motion.button
                      className={`btn-icon ${isCameraOff ? 'danger' : ''}`}
                      onClick={handleToggleCamera}
                      whileTap={{ scale: 0.9 }}
                      title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
                    >
                      {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
                    </motion.button>
                  )}
                </>
              )}

              {mode !== 'text' && (
                <button
                  className="btn-icon"
                  onClick={() => setShowChat(!showChat)}
                  title="Toggle chat"
                >
                  <MessageSquare size={18} />
                </button>
              )}

              <motion.button
                className={`btn-ghost ${friendRequested ? '' : ''}`}
                onClick={sendFriendRequest}
                disabled={friendRequested}
                whileTap={{ scale: 0.95 }}
                style={{ opacity: friendRequested ? 0.5 : 1 }}
              >
                <UserPlus size={16} /> {friendRequested ? 'Sent' : 'Add Friend'}
              </motion.button>

              <motion.button
                className="btn-ghost"
                onClick={skipUser}
                whileTap={{ scale: 0.95 }}
              >
                <SkipForward size={16} /> Skip
              </motion.button>

              <motion.button
                className="btn-danger"
                onClick={endChat}
                whileTap={{ scale: 0.95 }}
              >
                <PhoneOff size={16} /> End
              </motion.button>
            </div>
          )}
        </div>

        {/* Side Chat Panel (for video/voice modes) */}
        {status === 'matched' && mode !== 'text' && (
          <div className={`chat-panel ${showChat ? 'open' : ''}`}>
            <div className="chat-header">
              <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Chat</h3>
              <button className="btn-icon" onClick={() => setShowChat(false)} style={{ display: 'none' }}>
                <X size={16} />
              </button>
            </div>

            {icebreaker && (
              <div className="icebreaker-card">
                <Sparkles size={14} /> {icebreaker}
              </div>
            )}

            <div className="chat-messages">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`message-bubble ${msg.isMine ? 'sent' : msg.type === 'system' ? '' : 'received'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={msg.type === 'system' ? {
                    alignSelf: 'center', background: 'transparent', color: 'var(--accent-primary)',
                    fontSize: '0.82rem', fontStyle: 'italic'
                  } : {}}
                >
                  {msg.content}
                  {msg.type !== 'system' && (
                    <div className="msg-time">{formatTime(msg.timestamp)}</div>
                  )}
                </motion.div>
              ))}
              {isTyping && (
                <div className="message-bubble received" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <input
                className="input"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                style={{ flex: 1 }}
              />
              <button className="btn-icon active" onClick={sendMessage}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {status === 'searching' && <MatchingOverlay />}
        {showRating && (
          <RatingModal
            onSubmit={handleRating}
            onClose={() => { setShowRating(false); resetChat(); }}
          />
        )}
      </AnimatePresence>

      {/* Floating Reactions */}
      <AnimatePresence>
        {reactions.map((r) => (
          <FloatingReaction key={r.id} emoji={r.emoji} id={r.id} />
        ))}
      </AnimatePresence>
    </div>
  );
}
