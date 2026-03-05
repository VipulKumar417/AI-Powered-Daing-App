import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, RefreshCw, Sparkles, Shield } from 'lucide-react';
import { Conversation } from './conversation';
import { generateCompatibilityScore, UserProfileData } from '../services/aiService';
import { projectId } from '../utils/supabase/info';

interface MatchesScreenProps {
  session: any;
}

const MOCK_PROFILES = [
  { id: '1', name: 'Alex', age: 26, gender: 'non-binary', bio: 'Adventure seeker and coffee enthusiast', interests: ['Hiking', 'Photography', 'Coffee', 'Music'], photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=600&q=80'] },
  { id: '2', name: 'Jordan', age: 28, gender: 'female', bio: 'Artist by day, stargazer by night', interests: ['Art', 'Astronomy', 'Yoga', 'Cooking'], photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80'] },
];

export function MatchesScreen({ session }: MatchesScreenProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<any>(null);

  useEffect(() => { loadMatches(); }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      const cu: UserProfileData = { name: session?.user?.email?.split('@')[0] || 'User', age: 25, bio: '', location: '', gender: '', preference: 'all' };
      const scored = await Promise.all(MOCK_PROFILES.map(async (p) => {
        const c = await generateCompatibilityScore(cu, p as any);
        return { ...p, compatibility: { score: c.score, reason: c.reasons?.[0] || 'Good Match' } };
      }));
      setMatches(scored);
    } catch (_) {
      setMatches(MOCK_PROFILES.map(p => ({ ...p, compatibility: { score: 80, reason: 'Great Match' } })));
    } finally {
      setLoading(false);
    }
  };

  const scoreStyle = (score: number) => {
    if (score >= 90) return { color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)' };
    if (score >= 80) return { color: '#60a5fa', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)' };
    if (score >= 70) return { color: '#facc15', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)' };
    return { color: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' };
  };

  if (activeConversation) return <Conversation session={session} conversationId={activeConversation} onBack={() => setActiveConversation(null)} />;

  return (
    <div className="pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5" style={{ color: '#f43f5e' }} />
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Your Matches</h2>
          {!loading && (
            <span className="px-2 py-0.5 rounded-full text-xs glass" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {matches.length}
            </span>
          )}
        </div>
        <motion.button whileTap={{ scale: 0.92 }} onClick={loadMatches} className="btn-glass px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </motion.button>
      </div>

      {/* E2E notice */}
      <div className="glass rounded-xl px-4 py-3 flex items-center gap-2" style={{ borderColor: 'rgba(34,197,94,0.25)' }}>
        <Shield className="w-4 h-4" style={{ color: '#4ade80' }} />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>All messages are end-to-end encrypted</span>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4 flex gap-4">
              <div className="w-16 h-16 rounded-2xl shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2.5 pt-1">
                <div className="h-4 w-24 rounded-lg shimmer" />
                <div className="h-3 w-40 rounded-lg shimmer" />
                <div className="h-3 w-32 rounded-lg shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(217,70,239,0.15)', border: '1px solid rgba(217,70,239,0.3)' }}>
            <Sparkles className="w-8 h-8" style={{ color: '#d946ef' }} />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>No matches yet!</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Start liking profiles to get your first match.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match, idx) => {
            const ss = scoreStyle(match.compatibility.score);
            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07, type: 'spring', stiffness: 300, damping: 24 }}
                className="glass-card p-4 cursor-pointer card-hover"
                onClick={() => setActiveConversation(match.id)}
              >
                <div className="flex gap-4">
                  {/* Avatar with gradient ring */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden" style={{ border: '2px solid transparent', background: `linear-gradient(#1a1535, #1a1535) padding-box, linear-gradient(135deg, #f43f5e, #d946ef) border-box` }}>
                      {match.photos?.[0] ? (
                        <img src={match.photos[0]} alt={match.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #1a1535, #2d1b4e)', color: 'rgba(255,255,255,0.5)' }}>
                          {match.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* Score badge */}
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color }}>
                      {match.compatibility.score}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>{match.name}, {match.age}</h3>
                        <span className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.45)' }}>{match.gender}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color }}>
                        {match.compatibility.score}% match
                      </span>
                    </div>
                    <p className="text-xs mb-2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{match.compatibility.reason}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {match.interests?.slice(0, 3).map((int: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs glass" style={{ color: 'rgba(255,255,255,0.7)' }}>{int}</span>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Motion_btn_glow onClick={() => { }} icon={<Heart className="w-3.5 h-3.5" />} label="Like" />
                      <Motion_btn_glass onClick={(e: any) => { e.stopPropagation(); setActiveConversation(match.id); }} icon={<MessageCircle className="w-3.5 h-3.5" />} label="Message" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Motion_btn_glow({ onClick, icon, label }: any) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick}
      className="btn-glow flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold">
      {icon} {label}
    </motion.button>
  );
}

function Motion_btn_glass({ onClick, icon, label }: any) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick}
      className="btn-glass flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold">
      {icon} {label}
    </motion.button>
  );
}