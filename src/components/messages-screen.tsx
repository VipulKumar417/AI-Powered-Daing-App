import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Search, Heart, Shield } from 'lucide-react';
import { Conversation } from './conversation';
import { projectId } from '../utils/supabase/info';
import E2EEncryption from '../utils/encryption';

interface MessagesScreenProps {
  session: any;
  onNavigateToDiscover?: () => void;
}

export function MessagesScreen({ session, onNavigateToDiscover }: MessagesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<any>(null);

  useEffect(() => { loadConversations(); }, []);

  const loadConversations = async () => {
    try {
      const matchesRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/user-matches`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      let all: any[] = [];
      if (matchesRes.ok) {
        const md = await matchesRes.json();
        all = md.matches.map((m: any) => ({ id: m.matchId, otherParticipant: m.profile, lastMessage: null, lastMessageTime: m.matchedAt, unreadCount: 0, isMatch: true, matchedAt: m.matchedAt }));
      }
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/conversations`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (res.ok) {
        const data = await res.json();
        const convs = await Promise.all((data.conversations || []).map(async (c: any) => {
          if (c.lastMessage) {
            try {
              const pk = localStorage.getItem(`privateKey_${session.user.id}`);
              if (pk) c.lastMessage.content = await E2EEncryption.decryptMessage(c.lastMessage.encryptedData, c.lastMessage.iv, pk);
            } catch (_) { c.lastMessage.content = '[Encrypted]'; }
          }
          return c;
        }));
        const map = new Map<string, any>();
        all.forEach(c => map.set(c.id, c));
        convs.forEach(c => map.set(c.id, { ...(map.get(c.id) || {}), ...c, isMatch: true }));
        const sorted = Array.from(map.values()).sort((a, b) => {
          if (a.lastMessage && b.lastMessage) return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
          if (a.lastMessage) return -1; if (b.lastMessage) return 1;
          return new Date(b.matchedAt || 0).getTime() - new Date(a.matchedAt || 0).getTime();
        });
        setConversations(sorted);
      } else { setConversations(all); }
    } catch (_) { setConversations([]); }
    finally { setLoading(false); }
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return 'now'; if (m < 60) return `${m}m`; if (h < 24) return `${h}h`; return `${d}d`;
  };

  const filtered = conversations.filter(c => c.otherParticipant?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Mock Post-Date Debrief Trigger (shows up if there's a user we "went on a date with")
  const recentDate = conversations.find(c => c.otherParticipant && new Date(c.lastMessageTime || c.matchedAt).getTime() < Date.now() - 86400000); // Mock: date was >24h ago

  const handleDebriefClick = () => {
    // In a real app, this would open the AI Coach ChatInterface with a specific initial message about the date
    alert(`This would open a chat with Sanjog asking: "Hey! How did your date with ${recentDate?.otherParticipant.name} go? Any feedback?"`);
  };

  if (activeConversation) return <Conversation session={session} conversationId={activeConversation} onBack={() => setActiveConversation(null)} />;

  return (
    <div className="pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2 pb-2">
        <MessageCircle className="w-5 h-5" style={{ color: '#d946ef' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Messages</h2>
        {!loading && <span className="px-2 py-0.5 rounded-full text-xs glass" style={{ color: 'rgba(255,255,255,0.6)' }}>{conversations.length}</span>}
      </div>

      {/* Post-Date Debrief Prompt */}
      {recentDate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl cursor-pointer shadow-lg relative overflow-hidden group"
          onClick={handleDebriefClick}
          style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(217,70,239,0.15))', border: '1px solid rgba(244,63,94,0.3)', backdropFilter: 'blur(10px)' }}>
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-50 transition-opacity group-hover:opacity-100" style={{ background: '#f43f5e' }} />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#f87171' }}>Sanjog Check-in</span>
              </div>
              <p className="text-sm text-white font-medium">How did your date with {recentDate.otherParticipant.name} go?</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input
          placeholder="Search conversations…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}
        />
      </div>

      {/* E2E badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)' }}>
        <Shield className="w-3.5 h-3.5" style={{ color: '#4ade80' }} />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>End-to-end encrypted</span>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-24 rounded shimmer" />
                <div className="h-3 w-40 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.25)' }}>
            <MessageCircle className="w-8 h-8" style={{ color: '#d946ef' }} />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{searchQuery ? 'No results' : 'No messages yet!'}</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{searchQuery ? 'Try a different name.' : 'Like profiles to start conversations!'}</p>
          </div>
          {!searchQuery && (
            <motion.button whileTap={{ scale: 0.94 }} onClick={onNavigateToDiscover} className="btn-glow px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 mx-auto">
              <Heart className="w-4 h-4" /> Discover People
            </motion.button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((conv, idx) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
              className="glass-card p-4 cursor-pointer card-hover"
              onClick={() => setActiveConversation(conv.id)}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-lg font-bold"
                    style={{ background: 'linear-gradient(135deg, #1a1535, #2d1b4e)', color: 'rgba(255,255,255,0.5)', border: '1.5px solid rgba(244,63,94,0.30)' }}>
                    {conv.otherParticipant?.name?.charAt(0) || '?'}
                  </div>
                  {/* Online dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2" style={{ background: '#4ade80', borderColor: '#0d0d1a' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{conv.otherParticipant?.name || 'Unknown'}</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {conv.lastMessage ? timeAgo(conv.lastMessage.timestamp) : ''}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {conv.lastMessage?.content || (conv.isMatch ? '🎉 New match! Say hello!' : 'Start a conversation…')}
                  </p>
                  {conv.isMatch && !conv.lastMessage && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.35)', color: '#f87171' }}>
                      New Match ✨
                    </span>
                  )}
                </div>

                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef)' }}>
                    {conv.unreadCount}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}