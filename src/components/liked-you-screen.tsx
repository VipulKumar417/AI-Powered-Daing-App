import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Crown, Sparkles, RefreshCw, Lock, X } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface LikedYouScreenProps {
  session: any;
  onNavigateToDiscover?: () => void;
}

export function LikedYouScreen({ session, onNavigateToDiscover }: LikedYouScreenProps) {
  const [likedYou, setLikedYou] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => { loadLikedYou(); }, []);

  const loadLikedYou = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/liked-you`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (res.ok) { const d = await res.json(); setLikedYou(d.likedYou || []); }
    } catch (_) { } finally { setLoading(false); }
  };

  const handleLikeBack = async (profileId: string) => {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/like-profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ likedUserId: profileId }) });
      if (res.ok) {
        const d = await res.json();
        if (d.isMatch) { alert("🎉 It's a Match!"); setLikedYou(p => p.filter(p2 => p2.id !== profileId)); }
      }
    } catch (_) { }
  };

  const handlePass = (id: string) => setLikedYou(p => p.filter(p2 => p2.id !== id));

  return (
    <div className="pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5" style={{ color: '#f43f5e' }} fill="#f43f5e" />
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Liked You</h2>
          {!loading && likedYou.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.35)', color: '#f43f5e' }}>{likedYou.length}</span>
          )}
        </div>
        <motion.button whileTap={{ scale: 0.92 }} onClick={loadLikedYou} className="btn-glass px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </motion.button>
      </div>

      {/* Premium banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer"
        style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.12), rgba(251,146,60,0.12))', border: '1px solid rgba(234,179,8,0.25)' }}
        onClick={() => setShowPremiumModal(true)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(234,179,8,0.2)' }}>
          <Crown className="w-5 h-5" style={{ color: '#fbbf24' }} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm" style={{ color: '#fbbf24', fontFamily: 'Outfit, sans-serif' }}>Sanjog Premium</h4>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>See who liked you first • Unlimited likes</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-xl font-semibold" style={{ background: 'rgba(234,179,8,0.25)', color: '#fbbf24' }}>Upgrade</span>
      </motion.div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[3/4] rounded-2xl shimmer" />)}
        </div>
      ) : likedYou.length === 0 ? (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto float"
            style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)' }}>
            <Heart className="w-8 h-8" style={{ color: '#f43f5e' }} />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>No likes yet!</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Keep swiping! When someone likes you, they'll appear here.</p>
          </div>
          <motion.button whileTap={{ scale: 0.94 }} onClick={onNavigateToDiscover} className="btn-glow px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 mx-auto">
            <Sparkles className="w-4 h-4" /> Start Discovering
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {likedYou.map((profile, idx) => (
            <motion.div key={profile.id} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 22 }}
              className="relative rounded-2xl overflow-hidden cursor-pointer group"
              style={{ aspectRatio: '3/4', background: '#1a1535' }}>
              {/* Photo or gradient fallback */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1535, #2d1b4e, #1f0f3a)' }}>
                <div className="w-full h-full flex items-center justify-center text-5xl font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {profile.name?.charAt(0) || '?'}
                </div>
              </div>

              {/* Lock overlay in blur for non-premium */}
              <div className="absolute inset-0" style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Lock className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                </div>
              </div>

              {/* Heart badge */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.9)' }}>
                <Heart className="w-4 h-4 text-white" fill="white" />
              </div>

              {/* Name overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(to top, rgba(8,8,16,0.9), transparent)' }}>
                <p className="text-white font-semibold text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{profile.name}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{profile.age} years old</p>
              </div>

              {/* Hover action overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ background: 'rgba(8,8,16,0.6)' }}>
                <motion.button whileTap={{ scale: 0.88 }} onClick={e => { e.stopPropagation(); handlePass(profile.id); }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                  <X className="w-5 h-5" style={{ color: '#ef4444' }} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.88 }} onClick={e => { e.stopPropagation(); handleLikeBack(profile.id); }}
                  className="btn-glow flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold">
                  <Heart className="w-4 h-4" /> Like
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowPremiumModal(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="glass-card p-6 w-full max-w-md text-center space-y-4"
              onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.35)' }}>
                <Crown className="w-8 h-8" style={{ color: '#fbbf24' }} />
              </div>
              <h3 className="text-xl font-bold gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Sanjog Premium</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Premium features coming soon! Unlimited likes, advanced filters, and priority matching.</p>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowPremiumModal(false)} className="btn-glass flex-1 py-3 rounded-2xl font-semibold text-sm">
                  Maybe Later
                </motion.button>
                <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowPremiumModal(false)} className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                  Notify Me 🔔
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}