import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Shield, Loader2, Sparkles, User, RefreshCw, X } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import E2EEncryption from '../utils/encryption';
import { generateIcebreakers, generateDatePlan, generateConversationRescuer } from '../services/aiService';

interface ConversationProps {
  session: any;
  conversationId: string;
  onBack: () => void;
}

export function Conversation({ session, conversationId, onBack }: ConversationProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherParticipant, setOtherParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userKeys, setUserKeys] = useState({ publicKey: '', privateKey: '' });

  // AI Wingman State
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [generatingIcebreakers, setGeneratingIcebreakers] = useState(false);

  // Date Planner State
  const [generatingDatePlan, setGeneratingDatePlan] = useState(false);
  const [pendingDatePlan, setPendingDatePlan] = useState<any>(null);

  // Conversation Rescuer State
  const [staleSuggestion, setStaleSuggestion] = useState<string | null>(null);
  const [generatingRescuer, setGeneratingRescuer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeEncryption();
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, icebreakers, pendingDatePlan, staleSuggestion]);

  const initializeEncryption = async () => {
    try {
      const storedPrivateKey = localStorage.getItem(`privateKey_${session.user.id}`);
      const storedPublicKey = localStorage.getItem(`publicKey_${session.user.id}`);

      if (storedPrivateKey && storedPublicKey) {
        setUserKeys({ privateKey: storedPrivateKey, publicKey: storedPublicKey });
      } else {
        const keys = await E2EEncryption.initializeKeys();
        setUserKeys(keys);
        localStorage.setItem(`privateKey_${session.user.id}`, keys.privateKey);
        localStorage.setItem(`publicKey_${session.user.id}`, keys.publicKey);

        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/set-public-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ publicKey: keys.publicKey })
        });
      }
    } catch (e) { console.error('Encryption init error:', e); }
  };

  const loadConversation = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/conversation/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOtherParticipant(data.otherParticipant);

        if (data.otherParticipant?.id?.startsWith('sample')) {
          const plainMessages = data.messages.map((msg: any) => ({
            ...msg, content: msg.content || msg.encryptedData || '[Demo message]'
          }));
          setMessages(plainMessages);
        } else {
          const decryptedMessages = await Promise.all(
            data.messages.map(async (msg: any) => {
              try {
                const content = await E2EEncryption.decryptMessage(msg.encryptedData, msg.iv, userKeys.privateKey);
                return { ...msg, content };
              } catch (_) {
                return { ...msg, content: '[Message could not be decrypted]' };
              }
            })
          );
          setMessages(decryptedMessages);
        }
      } else {
        setMessages([]);
      }
    } catch (e) { console.error('Error loading conversation:', e); }
    finally { setLoading(false); }
  };

  const handleGenerateIcebreakers = async () => {
    if (!otherParticipant) return;
    setGeneratingIcebreakers(true);
    setIcebreakers([]);
    try {
      const suggestions = await generateIcebreakers(otherParticipant);
      setIcebreakers(suggestions);
    } catch (e) {
      setIcebreakers(["Hi there! How's your day going?"]);
    } finally {
      setGeneratingIcebreakers(false);
    }
  };

  const handleGenerateDatePlan = async () => {
    if (!otherParticipant || !session.user) return;
    setGeneratingDatePlan(true);
    setPendingDatePlan(null);
    try {
      // Mocking user profile for now since we don't have full profile data in the session object easily accessible here
      const currentUser = { name: session.user.email?.split('@')[0] || 'User', bio: 'Looking for a fun time', interests: ['Coffee', 'Music'] };
      const plan = await generateDatePlan(currentUser, otherParticipant, otherParticipant.location || 'the city');
      setPendingDatePlan(plan);
    } catch (e) { console.error('Error generating date plan:', e); }
    finally { setGeneratingDatePlan(false); }
  };

  const handleGenerateRescuer = async () => {
    if (!otherParticipant || messages.length === 0) return;
    setGeneratingRescuer(true);
    setStaleSuggestion(null);
    try {
      const suggestion = await generateConversationRescuer(messages, otherParticipant);
      setStaleSuggestion(suggestion);
    } catch (e) { console.error(e); }
    finally { setGeneratingRescuer(false); }
  };

  const sendDatePlan = async () => {
    if (!pendingDatePlan) return;

    setSending(true);
    try {
      const planString = JSON.stringify(pendingDatePlan);

      let finalContent = planString;
      let finalIv = null;

      if (!otherParticipant.id?.startsWith('sample')) {
        const encrypted = await E2EEncryption.encryptMessage(planString, userKeys.publicKey);
        finalContent = encrypted.encryptedData;
        finalIv = encrypted.iv;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          conversationId,
          receiverId: otherParticipant.id,
          content: finalContent,
          iv: finalIv,
          isEncrypted: !otherParticipant.id?.startsWith('sample')
        })
      });

      if (response.ok) {
        const msg = await response.json();
        setMessages(prev => [...prev, { ...msg, content: planString }]);
        setNewMessage('');
        setPendingDatePlan(null);
      }
    } catch (e) {
      console.error('Send message error:', e);
      alert('Failed to send date plan.');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      const isSampleProfile = otherParticipant?.id?.startsWith('sample');

      if (isSampleProfile) {
        const userMessage = { id: `msg_${Date.now()}`, senderId: session.user.id, content: textToSend, timestamp: Date.now() };
        setMessages(prev => [...prev, userMessage]);

        setTimeout(() => {
          const replies = ["Hey! Thanks for messaging me! 😊", "This is just a demo conversation with a sample profile! 🤖"];
          const botReply = { id: `reply_${Date.now()}`, senderId: otherParticipant.id, content: replies[Math.floor(Math.random() * replies.length)], timestamp: Date.now() };
          setMessages(prev => [...prev, botReply]);
        }, 1500);

        setSending(false);
        return;
      }

      if (!otherParticipant?.publicKey) {
        alert('Unable to send message - recipient encryption keys not available');
        setSending(false);
        return;
      }

      const { encryptedData, iv } = await E2EEncryption.encryptMessage(textToSend, otherParticipant.publicKey);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ recipientId: otherParticipant.id, encryptedData, iv })
      });

      if (response.ok) {
        setMessages(prev => [...prev, { id: `temp_${Date.now()}`, senderId: session.user.id, content: textToSend, timestamp: Date.now() }]);
        setTimeout(loadConversation, 500);
      } else { throw new Error('Failed to send'); }
    } catch (e) {
      console.error('Send message error:', e);
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex gap-2"><span className="typing-dot bg-purple-500" /><span className="typing-dot bg-purple-500" /><span className="typing-dot bg-purple-500" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed" style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl flex items-center gap-3 px-4 py-3 pt-safe flex-shrink-0" style={{ borderBottom: '1px solid #f3f4f6' }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-600 hover:bg-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-500 border border-gray-200">
            {otherParticipant?.name?.charAt(0) || '?'}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-green-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{otherParticipant?.name || 'Unknown'}</h3>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-green-500" />
            <span className="text-xs truncate text-gray-500 font-medium">
              {otherParticipant?.id?.startsWith('sample') ? 'Demo chat' : 'Encrypted'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 max-w-xs mx-auto text-center mt-10">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-2 bg-pink-50 border border-pink-100">
              <User className="w-8 h-8 text-pink-500" />
            </div>
            <h4 className="font-bold text-lg text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>You matched with {otherParticipant?.name}!</h4>
            <p className="text-sm text-gray-500 font-medium">Don't keep them waiting. Say hello!</p>

            {/* AI Wingman Section */}
            <div className="w-full mt-6 space-y-3">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">AI Wingman</span>
              </div>

              {!icebreakers.length && !generatingIcebreakers && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateIcebreakers}
                  className="w-full btn-glow py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white">
                  <Sparkles className="w-4 h-4" /> Generate Icebreakers
                </motion.button>
              )}

              {generatingIcebreakers && (
                <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-3 border border-gray-100 shadow-sm">
                  <div className="flex gap-2"><span className="typing-dot bg-purple-500" /><span className="typing-dot bg-purple-500" /><span className="typing-dot bg-purple-500" /></div>
                  <span className="text-xs font-semibold text-gray-500">Reading their profile...</span>
                </div>
              )}

              {icebreakers.length > 0 && (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    {icebreakers.map((ib, i) => (
                      <motion.button key={i} whileTap={{ scale: 0.98 }} onClick={() => setNewMessage(ib)}
                        className="w-full text-left p-3 rounded-xl text-sm font-medium transition-all bg-purple-50 text-purple-900 border border-purple-100 hover:bg-purple-100">
                        {ib}
                      </motion.button>
                    ))}
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateIcebreakers}
                      className="w-full py-2 flex items-center justify-center gap-1.5 text-xs mt-2 font-semibold text-gray-500 hover:text-gray-700">
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </motion.button>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === session.user.id;
            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  {msg.content?.startsWith('{"title"') ? (
                    // Render Date Plan Card
                    <div className="rounded-2xl p-4 overflow-hidden relative shadow-sm" style={{ background: '#fdf4ff', border: '1px solid #fbcfe8' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-fuchsia-600" />
                        <span className="text-xs font-bold tracking-wide uppercase text-fuchsia-600">AI Date Plan</span>
                      </div>
                      {(() => {
                        try {
                          const plan = JSON.parse(msg.content);
                          return (
                            <div className="space-y-3">
                              <h4 className="font-bold text-base text-gray-900">{plan.title}</h4>
                              <p className="text-[13px] font-medium text-gray-600">{plan.description}</p>
                              <div className="space-y-2 mt-3">
                                {plan.itinerary?.map((item: any, i: number) => (
                                  <div key={i} className="flex gap-3 items-start p-2.5 rounded-xl bg-white border border-fuchsia-100">
                                    <div className="text-xs font-bold shrink-0 mt-0.5 text-fuchsia-500">{item.time}</div>
                                    <div>
                                      <div className="text-sm font-semibold text-gray-800">{item.activity}</div>
                                      <div className="text-xs font-medium text-gray-500 mt-0.5">📍 {item.location}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return <p>{msg.content}</p>;
                        }
                      })()}
                    </div>
                  ) : (
                    // Regular Message
                    <div className={`px-4 py-2.5 rounded-2xl text-[15px] shadow-sm ${isOwn
                      ? 'rounded-br-sm text-white bg-gradient-to-r from-pink-500 to-purple-500'
                      : 'rounded-bl-sm bg-white text-gray-800 border border-gray-100'
                      }`}
                      style={{
                        color: isOwn ? '#fff' : '#1f2937'
                      }}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  )}
                  <p className={`text-[10px] mt-1.5 font-medium ${isOwn ? 'text-right mr-1 text-gray-400' : 'ml-1 text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Date Planner & Rescuer Action Bar */}
      <AnimatePresence>
        {messages.length > 0 && !generatingDatePlan && !pendingDatePlan && !generatingRescuer && !staleSuggestion && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="px-3 pb-2 flex justify-center gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateDatePlan} className="px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-md bg-white border border-gray-100 text-gray-800">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Plan a Date
            </motion.button>
            {/* Only show rescuer if the last message isn't ours and is "older" (simulate for now by just showing it if there are messages) */}
            {messages[messages.length - 1]?.senderId !== session.user.id && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateRescuer} className="px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-md bg-white border border-gray-100 text-gray-800">
                <Shield className="w-3.5 h-3.5 text-blue-500" /> Vibe Check
              </motion.button>
            )}
          </motion.div>
        )}

        {generatingDatePlan && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-3 flex justify-center">
            <div className="px-4 py-2.5 rounded-full flex items-center gap-3 bg-white border border-purple-100 shadow-sm">
              <div className="flex gap-1.5"><span className="typing-dot bg-purple-500" /><span className="typing-dot bg-purple-500" /><span className="typing-dot bg-purple-500" /></div>
              <span className="text-xs font-medium text-gray-600">Crafting the perfect date...</span>
            </div>
          </motion.div>
        )}

        {generatingRescuer && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-3 flex justify-center">
            <div className="px-4 py-2.5 rounded-full flex items-center gap-3 bg-white border border-blue-100 shadow-sm">
              <div className="flex gap-1.5"><span className="typing-dot bg-blue-500" /><span className="typing-dot bg-blue-500" /><span className="typing-dot bg-blue-500" /></div>
              <span className="text-xs font-medium text-gray-600">Thinking of something to say...</span>
            </div>
          </motion.div>
        )}

        {pendingDatePlan && !generatingDatePlan && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="px-3 pb-3">
            <div className="p-3 rounded-2xl space-y-3 bg-white border border-purple-100 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Date Plan Ready</span>
                <button onClick={() => setPendingDatePlan(null)} className="p-1 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="text-sm font-semibold text-gray-900">{pendingDatePlan.title}</div>
              <div className="flex gap-2 pt-1">
                <motion.button whileTap={{ scale: 0.95 }} onClick={sendDatePlan} className="flex-1 btn-glow py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 text-white">
                  <Send className="w-3 h-3" /> Suggest This
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateDatePlan} className="bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-xl text-xs flex justify-center items-center">
                  <RefreshCw className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {staleSuggestion && !generatingRescuer && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="px-3 pb-3">
            <div className="p-3 rounded-2xl space-y-2 bg-white border border-blue-100 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-500">AI Follow-up</span>
                </div>
                <button onClick={() => setStaleSuggestion(null)} className="p-1 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="text-[13px] font-medium text-gray-800 italic">"{staleSuggestion}"</div>
              <div className="flex gap-2 pt-1">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setNewMessage(staleSuggestion); setStaleSuggestion(null); }} className="flex-1 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 bg-blue-500 text-white shadow-sm hover:bg-blue-600">
                  <Send className="w-3 h-3" /> Use This
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateRescuer} className="bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-xl text-xs flex justify-center items-center">
                  <RefreshCw className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-3 pb-safe bg-white border-t border-gray-100 flex-shrink-0 shadow-sm z-10 relative">
        <form onSubmit={sendMessage} className="flex gap-2 relative">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={otherParticipant?.id?.startsWith('sample') ? "Message this demo profile..." : "Type a message..."}
            disabled={sending}
            className="flex-1 pl-4 pr-12 py-3 rounded-2xl text-[15px] font-medium outline-none transition-all bg-gray-50 text-gray-900 border focus:bg-white placeholder:text-gray-400"
            style={{
              borderColor: newMessage.trim() ? '#fbcfe8' : '#e5e7eb',
              boxShadow: newMessage.trim() ? '0 0 0 4px #fdf2f8' : 'none'
            }}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={sending || !newMessage.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 w-10 rounded-xl flex items-center justify-center transition-all bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-50 disabled:grayscale"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white ml-0.5" />}
          </motion.button>
        </form>
      </div>
    </div>
  );
}