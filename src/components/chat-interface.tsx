import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, ArrowLeft, RotateCcw, User, Shield, X } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { generateAIResponse } from '../services/aiService';

interface ChatInterfaceProps {
  session: any;
  chatHistory: any[];
  onUpdateChatHistory: (history: any[]) => void;
  onBack?: () => void;
}

const STARTERS = [
  "Hi there! What brings you to Sanjog? ✨",
  "Tell me about your ideal weekend 🌿",
  "What makes you genuinely happy? 😊",
  "What's your biggest passion in life? 🔥",
];

export function ChatInterface({ session, chatHistory, onUpdateChatHistory, onBack }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [chatHistory, isLoading]);

  useEffect(() => {
    if (chatHistory.length === 0) return;
    const t = setTimeout(async () => {
      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/save-chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ chatHistory })
        });
      } catch (_) { }
    }, 2000);
    return () => clearTimeout(t);
  }, [chatHistory, session.access_token]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || isLoading) return;
    setMessage('');
    setIsLoading(true);

    const tempHistory = [...chatHistory, { role: 'user', content: text, timestamp: Date.now() }];
    onUpdateChatHistory(tempHistory);

    try {
      await new Promise(r => setTimeout(r, 800));
      const userProfile = { name: session?.user?.email?.split('@')[0] || 'User', age: 25, bio: '', location: '', gender: '', preference: 'all' };
      const aiResp = await generateAIResponse(userProfile, chatHistory);
      onUpdateChatHistory([...tempHistory, { role: 'assistant', content: aiResp, timestamp: Date.now() }]);
    } catch (_) {
      onUpdateChatHistory([...tempHistory, { role: 'assistant', content: "I'm having trouble connecting, but let's keep chatting! Tell me about your ideal date 💫", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = async () => {
    if (!confirm('Reset conversation? This will clear all chat history.')) return;
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/reset-chat`, { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` } });
    } catch (_) { }
    onUpdateChatHistory([]);
  };

  const userCount = chatHistory.filter(m => m.role === 'user').length;
  const progress = Math.min((userCount / 8) * 100, 100);



  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'linear-gradient(160deg, #080810 0%, #12112a 50%, #080810 100%)' }}>

      {/* Header */}
      <div className="glass-dark flex items-center gap-3 px-4 py-3 pt-safe flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {onBack && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="btn-glass w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        )}

        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 pulse-glow"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef)' }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>Sanjog</h3>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {isLoading ? 'Typing…' : "Let's discover your perfect match!"}
          </p>
        </div>

        {/* Progress bar */}
        {userCount > 0 && userCount < 8 && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center relative flex-shrink-0"
            style={{ border: '2px solid rgba(255,255,255,0.1)' }}>
            <svg className="w-full h-full transform -rotate-90 absolute inset-0">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
              </defs>
              <circle cx="14" cy="14" r="14" fill="none" stroke="url(#gradient)" strokeWidth="2"
                strokeDasharray="88" strokeDashoffset={88 - (88 * progress) / 100} strokeLinecap="round" />
            </svg>
            <span className="text-[10px] font-bold">{userCount}/8</span>
          </div>
        )}

        {/* Reset button */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={resetChat} className="btn-glass w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
          <RotateCcw className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 relative">



        {chatHistory.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10 space-y-5">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto float"
              style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(217,70,239,0.15))', border: '1px solid rgba(244,63,94,0.25)' }}>
              <Sparkles className="w-10 h-10" style={{ color: '#d946ef' }} />
            </div>
            <div>
              <h4 className="font-bold text-lg gradient-text mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Meet Sanjog AI!</h4>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '280px', margin: '0 auto' }}>
                I'll help you discover your personality and find your perfect match. Start chatting!
              </p>
            </div>
            <div className="glass rounded-2xl p-3 mx-auto text-center" style={{ maxWidth: '280px' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                💡 Chat 8 messages to unlock personalized matches
              </p>
            </div>
            {/* Starter chips */}
            <div className="flex flex-col gap-2 items-center">
              {STARTERS.map((s, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                  whileTap={{ scale: 0.95 }} onClick={() => setMessage(s)}
                  className="px-4 py-2.5 rounded-xl text-sm text-left w-full"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', maxWidth: '320px' }}>
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            <AnimatePresence>
              {chatHistory.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                  {/* AI avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef)' }}>
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className="max-w-[78%]">
                    <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                      style={msg.role === 'user' ? {
                        background: 'linear-gradient(135deg, #f43f5e, #d946ef)',
                        color: '#fff',
                        borderBottomRightRadius: '6px',
                        boxShadow: '0 4px 20px rgba(244,63,94,0.3)',
                      } : {
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: 'rgba(255,255,255,0.9)',
                        borderBottomLeftRadius: '6px',
                        backdropFilter: 'blur(12px)',
                      }}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className="text-xs mt-1 px-1" style={{ color: 'rgba(255,255,255,0.25)', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <User className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5 justify-start">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef)' }}>
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)' }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
        <form onSubmit={sendMessage} className="flex items-center gap-2.5 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 flex items-center px-4 py-2.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', transition: 'border-color 0.2s' }}>
            <input
              ref={inputRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Share your thoughts…"
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#fff', caretColor: '#d946ef' }}
            />
          </div>
          <motion.button
            type="submit"
            disabled={isLoading || !message.trim()}
            whileTap={{ scale: 0.88 }}
            className="px-6 py-2.5 h-12 rounded-2xl flex items-center justify-center gap-2 flex-shrink-0 btn-glow disabled:opacity-40"
          >
            <span className="text-white font-semibold text-sm">Send</span>
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}