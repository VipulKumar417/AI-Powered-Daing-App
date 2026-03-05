import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Heart, X, Star, MessageCircle, MapPin, Music, Coffee, Briefcase, GraduationCap, Camera } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId } from '../utils/supabase/info';

interface ProfileDetailViewProps {
  profile: any;
  onBack: () => void;
  onLike: () => void;
  onPass: () => void;
  onMessage: () => void;
}

export function ProfileDetailView({ profile, onBack, onLike, onPass, onMessage }: ProfileDetailViewProps) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'about' | 'photos'>('about');

  useEffect(() => {
    if (profile?.photoUrls?.length > 0) { setPhotoUrls(profile.photoUrls); return; }
    if (profile?.photos?.length > 0) {
      const urls: string[] = [];
      Promise.all(profile.photos.map(async (p: string) => {
        try {
          const r = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/photo/${p}`);
          if (r.ok) { const d = await r.json(); if (d.url) urls.push(d.url); }
        } catch (_) { }
      })).then(() => setPhotoUrls(urls));
    } else { setPhotoUrls([]); }
  }, [profile]);

  const score = profile.compatibility?.score || 75;
  const scoreColor = score >= 90 ? '#4ade80' : score >= 80 ? '#60a5fa' : score >= 70 ? '#facc15' : '#f87171';
  const scoreBg = score >= 90 ? 'rgba(34,197,94,0.2)' : score >= 80 ? 'rgba(59,130,246,0.2)' : score >= 70 ? 'rgba(234,179,8,0.2)' : 'rgba(244,63,94,0.2)';

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(160deg, #080810 0%, #12112a 50%, #080810 100%)' }}
    >
      {/* Hero photo section */}
      <div className="relative flex-shrink-0" style={{ height: '55%' }}>
        {photoUrls.length > 0 ? (
          <img
            src={photoUrls[currentPhoto]}
            alt={profile.name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl font-bold"
            style={{ background: 'linear-gradient(135deg, #1a1535, #2d1b4e)', color: 'rgba(255,255,255,0.2)' }}>
            {profile.name?.charAt(0) || '?'}
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #080810 0%, transparent 60%)' }} />

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(8,8,16,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* Photo dots */}
        {photoUrls.length > 1 && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5">
            {photoUrls.map((_, i) => (
              <button key={i} onClick={() => setCurrentPhoto(i)}
                className="rounded-full transition-all"
                style={{ width: i === currentPhoto ? '20px' : '6px', height: '6px', background: i === currentPhoto ? '#fff' : 'rgba(255,255,255,0.4)' }} />
            ))}
          </div>
        )}

        {/* Score badge */}
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl text-sm font-bold"
          style={{ background: scoreBg, border: `1px solid ${scoreColor}50`, color: scoreColor, backdropFilter: 'blur(12px)' }}>
          {score}% Match
        </div>

        {/* Name block at bottom of photo */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-baseline gap-2 mb-1">
            <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{profile.name}</h1>
            <span className="text-2xl font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{profile.age}</span>
          </div>
          {profile.compatibility?.reason && (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{profile.compatibility.reason}</p>
          )}
        </div>
      </div>

      {/* Scrollable info section */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        {/* Bio */}
        {profile.bio && (
          <div className="glass-card p-4">
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{profile.bio}</p>
          </div>
        )}

        {/* Interests */}
        {profile.interests?.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Outfit, sans-serif' }}>
              <Music className="w-4 h-4" style={{ color: '#d946ef' }} /> Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((int: string, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-xl text-sm"
                  style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.25)', color: 'rgba(255,255,255,0.8)' }}>
                  {int}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lifestyle */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Outfit, sans-serif' }}>
            <Coffee className="w-4 h-4" style={{ color: '#f59e0b' }} /> Lifestyle
          </h3>
          <div className="space-y-2">
            {[
              { Icon: Briefcase, label: 'Creative Professional' },
              { Icon: GraduationCap, label: 'University Graduate' },
              { Icon: Camera, label: 'Photography, Travel, Cooking' },
              { Icon: Heart, label: 'Looking for something serious' },
            ].map(({ Icon, label }, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Personality traits */}
        {profile.personality && Object.keys(profile.personality).length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Outfit, sans-serif' }}>
              <Star className="w-4 h-4" style={{ color: '#fbbf24' }} /> Personality
            </h3>
            <div className="space-y-3">
              {Object.entries(profile.personality).slice(0, 4).map(([trait, level], i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize" style={{ color: 'rgba(255,255,255,0.75)' }}>{trait.replace('_', ' ')}</span>
                    <span className="capitalize" style={{ color: 'rgba(255,255,255,0.45)' }}>{String(level)}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${String(level) === 'high' ? 85 : String(level) === 'medium' ? 55 : 30}%`, background: 'linear-gradient(90deg, #f43f5e, #d946ef)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-safe flex gap-3"
        style={{ background: 'linear-gradient(to top, rgba(8,8,16,0.98) 0%, rgba(8,8,16,0.90) 100%)', backdropFilter: 'blur(12px)' }}>
        <motion.button whileTap={{ scale: 0.88 }} onClick={onPass}
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <X className="w-6 h-6" style={{ color: '#ef4444' }} />
        </motion.button>

        <motion.button whileTap={{ scale: 0.88 }} onClick={onMessage}
          className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 btn-glass font-semibold">
          <MessageCircle className="w-5 h-5" /> Message
        </motion.button>

        <motion.button whileTap={{ scale: 0.88 }} onClick={onLike}
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 btn-glow pulse-glow">
          <Heart className="w-6 h-6 text-white" />
        </motion.button>
      </div>
    </motion.div>
  );
}