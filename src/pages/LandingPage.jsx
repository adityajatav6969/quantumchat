import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/useUserStore';
import { useChatStore } from '../stores/useChatStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { connectSocket } from '../services/socket';
import {
  Zap, Video, Mic, MessageSquare, Users, Globe,
  Code, Gamepad2, Music, BookOpen, Rocket, Bot,
  Sparkles, ArrowRight, Sun, Moon, Tv
} from 'lucide-react';

const CATEGORIES = [
  { id: 'random', name: 'Random Global', icon: Globe, color: '#6366f1' },
  { id: 'developers', name: 'Developers', icon: Code, color: '#8b5cf6' },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, color: '#ec4899' },
  { id: 'music', name: 'Music', icon: Music, color: '#f59e0b' },
  { id: 'anime', name: 'Anime', icon: Tv, color: '#ef4444' },
  { id: 'study', name: 'Study Partners', icon: BookOpen, color: '#10b981' },
  { id: 'startup', name: 'Startup Founders', icon: Rocket, color: '#3b82f6' },
  { id: 'ai', name: 'AI Enthusiasts', icon: Bot, color: '#a855f7' },
];

const INTEREST_TAGS = [
  'JavaScript', 'Python', 'React', 'AI/ML', 'Web3', 'Design',
  'StartUps', 'Gaming', 'Music', 'Anime', 'Movies', 'Travel',
  'Fitness', 'Photography', 'Cooking', 'Books', 'Science', 'Art',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { nickname, setNickname, interests, toggleInterest, category, setCategory, setAvatar, setSessionActive } = useUserStore();
  const { setMode, mode } = useChatStore();
  const { theme, toggleTheme } = useSettingsStore();
  const [step, setStep] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    // Fetch online count
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    fetch(`${backendUrl}/api/online-users`)
      .then((r) => r.json())
      .then((d) => setOnlineCount(d.count))
      .catch(() => { });
  }, []);

  const handleJoin = () => {
    if (!nickname.trim()) return;
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nickname)}`;
    setAvatar(avatar);

    const socket = connectSocket();
    socket.emit('join', { nickname, avatar, interests, category });
    socket.on('joined', (data) => {
      setSessionActive(true);
      navigate('/chat');
    });
  };

  return (
    <div className="landing">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="orb" />
        <div className="orb" />
        <div className="orb" />
      </div>

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="logo-icon">⚡</div>
          <span className="glow-text">QuantumChat</span>
        </div>
        <div className="navbar-actions">
          <div className="badge online">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            {onlineCount} online
          </div>
          <button className="btn-icon" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <motion.div
        className="landing-hero"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
          <span className="badge">Next-Gen Random Chat</span>
        </motion.div>

        <motion.h1 variants={itemVariants} className="hero-title">
          Connect with <span className="glow-text">Strangers</span>
          <br />
          Instantly
        </motion.h1>

        <motion.p variants={itemVariants} className="hero-subtitle">
          Video, voice, and text chat powered by WebRTC. Meet incredible people
          from around the world with quantum speed. No signup required.
        </motion.p>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              className="join-form glass"
              style={{ padding: 32 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="form-group">
                <label>Your Nickname</label>
                <input
                  className="input"
                  placeholder="Enter your name..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && setStep(1)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Chat Mode</label>
                <div className="mode-selector">
                  {[
                    { id: 'video', label: 'Video', Icon: Video },
                    { id: 'voice', label: 'Voice', Icon: Mic },
                    { id: 'text', label: 'Text', Icon: MessageSquare },
                  ].map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      className={`mode-btn ${mode === id ? 'active' : ''}`}
                      onClick={() => setMode(id)}
                    >
                      <Icon size={16} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => nickname.trim() && setStep(1)}
                disabled={!nickname.trim()}
                style={{ width: '100%', opacity: nickname.trim() ? 1 : 0.5 }}
              >
                Continue <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              className="join-form glass"
              style={{ padding: 32 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="form-group">
                <label>Choose a Category</label>
                <div className="category-grid">
                  {CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <motion.div
                        key={cat.id}
                        className={`category-card ${category === cat.id ? 'selected' : ''}`}
                        onClick={() => setCategory(cat.id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <CatIcon size={28} style={{ color: cat.color }} />
                        <span className="cat-name">{cat.name}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label>Your Interests <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <div className="interest-tags">
                  {INTEREST_TAGS.map((tag) => (
                    <motion.span
                      key={tag}
                      className={`interest-tag ${interests.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleInterest(tag)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-ghost" onClick={() => setStep(0)} style={{ flex: 1 }}>
                  Back
                </button>
                <button className="btn-primary" onClick={handleJoin} style={{ flex: 2 }}>
                  <Zap size={18} /> Start Chatting
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature cards */}
        <motion.div
          variants={itemVariants}
          style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {[
            { icon: Video, label: 'HD Video', desc: 'Crystal clear' },
            { icon: Mic, label: 'Voice Chat', desc: 'Noise cancelling' },
            { icon: MessageSquare, label: 'Text Chat', desc: 'Real-time' },
            { icon: Users, label: 'Smart Match', desc: 'Interest based' },
          ].map(({ icon: Icon, label, desc }) => (
            <motion.div
              key={label}
              className="glass glass-hover"
              style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'default' }}
              whileHover={{ y: -4 }}
            >
              <Icon size={22} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
