import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, ArrowLeft, RotateCcw, User, Brain, Unlock, Lock, Bot } from 'lucide-react';
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

  const sendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    const text = textOverride || message.trim();
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
    <div className="fixed inset-0 z-40 flex justify-center bg-white sm:bg-gray-50">
      <div className="w-full max-w-2xl h-full flex flex-col relative bg-white sm:border-x sm:border-gray-100 shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex flex-col px-4 pt-safe flex-shrink-0 bg-white shadow-sm z-10" style={{ paddingBottom: '16px', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
          <div className="flex items-center gap-3 py-3">
            {onBack && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ color: 'var(--sanjog-text-primary)' }}>
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}

            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #d946ef, #8b5cf6)' }}>
              <Bot className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[15px]" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--sanjog-text-primary)' }}>Sanjog AI Coach</h3>
              <p className="text-[12px] leading-tight" style={{ color: 'var(--sanjog-text-secondary)' }}>
                {isLoading ? 'Typing…' : "Let's discover your\nperfect match preferences!"}
              </p>
            </div>

            {/* Header Icons */}
            <div className="flex items-center gap-3">
              <Brain className="w-4 h-4" style={{ color: '#f43f5e' }} />
              {progress >= 100 ? <Unlock className="w-4 h-4" style={{ color: '#eab308' }} /> : <Lock className="w-4 h-4" style={{ color: '#eab308' }} />}
              <motion.button whileTap={{ scale: 0.9 }} onClick={resetChat}>
                <RotateCcw className="w-4 h-4" style={{ color: 'var(--sanjog-text-secondary)' }} />
              </motion.button>
              <Sparkles className="w-5 h-5" style={{ color: '#d946ef' }} />
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col gap-1.5 mt-2 px-10">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #d946ef, #f43f5e)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-[11px] font-medium" style={{ color: 'var(--sanjog-text-secondary)' }}>
                {userCount}/8 to unlock Discover
              </span>
            </div>
          </div>
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
                <h4 className="font-bold text-lg gradient-text mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Welcome to Sanjog!</h4>
                <p className="text-sm" style={{ color: 'var(--sanjog-text-secondary)', maxWidth: '280px', margin: '0 auto' }}>
                  I'm Cupid and I'm SO excited to get to know you! Let's start with something fun.
                </p>
              </div>
              <div className="rounded-2xl p-3 mx-auto text-center bg-gray-50" style={{ maxWidth: '280px' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--sanjog-text-secondary)' }}>
                  💡 Chat 8 messages to unlock personalized matches
                </p>
              </div>
              {/* Starter chips */}
              <div className="flex flex-col gap-2 items-center">
                {STARTERS.map((s, i) => (
                  <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                    whileTap={{ scale: 0.95 }} onClick={() => { setMessage(s); sendMessage(undefined, s); }}
                    className="px-4 py-2.5 rounded-xl text-sm text-left w-full font-medium"
                    style={{ background: 'var(--sanjog-bg-primary)', border: '1px solid var(--sanjog-glass-border-bright)', color: 'var(--sanjog-text-primary)', maxWidth: '320px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
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
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                        style={{ background: 'linear-gradient(135deg, #d946ef, #8b5cf6)' }}>
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className="max-w-[75%]">
                      <div className="px-4 py-3 text-[14px] leading-relaxed relative"
                        style={msg.role === 'user' ? {
                          background: 'linear-gradient(135deg, #d946ef, #f43f5e)',
                          color: '#fff',
                          borderTopLeftRadius: '20px',
                          borderTopRightRadius: '20px',
                          borderBottomLeftRadius: '20px',
                          borderBottomRightRadius: '4px',
                          boxShadow: '0 4px 14px rgba(244,63,94,0.15)',
                        } : {
                          background: '#F3F4F6',
                          color: '#111827',
                          borderTopLeftRadius: '20px',
                          borderTopRightRadius: '20px',
                          borderBottomRightRadius: '20px',
                          borderBottomLeftRadius: '4px',
                        }}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className="block mt-1.5 text-[10px] font-medium opacity-60" style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* User avatar */}
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5 justify-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d946ef, #8b5cf6)' }}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="px-4 py-3.5 flex items-center gap-1.5" style={{ background: '#F3F4F6', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', borderBottomRightRadius: '20px', borderBottomLeftRadius: '4px' }}>
                      <span className="typing-dot" style={{ background: '#9CA3AF' }} />
                      <span className="typing-dot" style={{ background: '#9CA3AF' }} />
                      <span className="typing-dot" style={{ background: '#9CA3AF' }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={bottomRef} className="h-4" />
            </>
          )}
        </div>

        {/* Input bar */}
        <div className="p-4 pb-safe bg-white border-t border-gray-100 flex-shrink-0 z-20 shadow-sm relative">
          <form onSubmit={sendMessage} className="flex items-center gap-2 p-1.5 bg-white rounded-full transition-all" style={{ border: '1px solid #E5E7EB', boxShadow: message.trim() ? '0 0 0 4px #fdf2f8' : '0 8px 30px rgba(0,0,0,0.04)' }}>
            <input
              ref={inputRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none pl-4 pr-2 text-[15px] font-medium"
              style={{ color: '#111827', caretColor: '#d946ef' }}
            />
            <motion.button
              type="submit"
              disabled={isLoading || !message.trim()}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #d946ef, #f43f5e)' }}
            >
              <Send className="w-4 h-4 text-white -ml-0.5" />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}