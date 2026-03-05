import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Heart, X, Star, Info, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatDistance } from '../utils/location';

interface SwipeableCardProps {
  profile: any;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTapCard: () => void;
  isTop: boolean;
}

export function SwipeableCard({ profile, onSwipeLeft, onSwipeRight, onTapCard, isTop }: SwipeableCardProps) {
  const [exitX, setExitX] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photosLoading, setPhotosLoading] = useState(true);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const scale = useTransform(x, [-200, 0, 200], [0.94, 1, 0.94]);

  // Overlay opacities
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -20], [1, 0]);

  useEffect(() => {
    setPhotosLoading(true);
    setCurrentPhotoIndex(0);
    if (profile?.photoUrls?.length > 0) {
      setPhotoUrls(profile.photoUrls);
    } else {
      setPhotoUrls([]);
    }
    setPhotosLoading(false);
  }, [profile?.photoUrls]);

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoUrls.length > 1) setCurrentPhotoIndex(p => (p + 1) % photoUrls.length);
  };
  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoUrls.length > 1) setCurrentPhotoIndex(p => (p - 1 + photoUrls.length) % photoUrls.length);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > 100 || velocity.x > 500) { setExitX(1200); onSwipeRight(); }
    else if (offset.x < -100 || velocity.x < -500) { setExitX(-1200); onSwipeLeft(); }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: 'rgba(34,197,94,0.25)', border: 'rgba(34,197,94,0.5)', text: '#4ade80' };
    if (score >= 80) return { bg: 'rgba(59,130,246,0.25)', border: 'rgba(59,130,246,0.5)', text: '#60a5fa' };
    if (score >= 70) return { bg: 'rgba(234,179,8,0.25)', border: 'rgba(234,179,8,0.5)', text: '#facc15' };
    return { bg: 'rgba(244,63,94,0.25)', border: 'rgba(244,63,94,0.5)', text: '#f87171' };
  };

  const scoreColors = getScoreColor(profile.compatibility?.score || 75);

  const cardVariants = {
    enter: { scale: 0.88, y: 40, opacity: 0, rotate: 0 },
    center: { scale: isTop ? 1 : 0.94, y: isTop ? 0 : 14, opacity: isTop ? 1 : 0.6, rotate: 0, zIndex: isTop ? 10 : 1 },
    exit: { x: exitX, opacity: 0, scale: 0.72, rotate: exitX > 0 ? 20 : -20, transition: { duration: 0.28 } },
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      style={{ x, rotate, scale }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={isTop ? { cursor: 'grabbing' } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      <div
        className="w-full h-full overflow-hidden shadow-2xl"
        style={{
          borderRadius: '28px',
          background: '#1a1535',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: isTop
            ? '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), 0 0 40px rgba(217,70,239,0.08)'
            : '0 8px 32px rgba(0,0,0,0.4)',
        }}
        onClick={isTop ? onTapCard : undefined}
      >
        {/* Photo */}
        <div className="relative h-full">
          {photosLoading ? (
            <div className="w-full h-full shimmer" />
          ) : photoUrls.length > 0 ? (
            <>
              <img
                src={photoUrls[currentPhotoIndex]}
                alt={`${profile.name} photo ${currentPhotoIndex + 1}`}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />

              {/* Photo nav click zones */}
              {photoUrls.length > 1 && (
                <>
                  <button onClick={prevPhoto} className="absolute left-0 top-0 w-1/3 h-full z-10" aria-label="Previous photo" />
                  <button onClick={nextPhoto} className="absolute right-0 top-0 w-1/3 h-full z-10" aria-label="Next photo" />
                </>
              )}

              {/* Photo indicator dots */}
              <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-20">
                {photoUrls.map((_, idx) => (
                  <div key={idx} className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{ background: idx === currentPhotoIndex ? '#fff' : 'rgba(255,255,255,0.30)', boxShadow: idx === currentPhotoIndex ? '0 0 6px rgba(255,255,255,0.6)' : 'none' }} />
                ))}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl font-bold"
              style={{ background: 'linear-gradient(135deg, #1a1535, #2d1b4e)', color: 'rgba(255,255,255,0.25)' }}>
              {profile.name?.charAt(0) || '?'}
            </div>
          )}

          {/* Deep bottom gradient overlay for text readability */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(to top, rgba(8,8,16,0.95) 0%, rgba(8,8,16,0.5) 45%, transparent 70%)',
          }} />

          {/* Compatibility badge and Smart Highlights */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
            <div className="px-2.5 py-1 rounded-xl text-xs font-bold shadow-lg"
              style={{ background: scoreColors.bg, border: `1px solid ${scoreColors.border}`, color: scoreColors.text, backdropFilter: 'blur(12px)' }}>
              {profile.compatibility?.score || 75}% Match
            </div>
            {profile.compatibility?.reasons?.slice(0, 1).map((reason: string, idx: number) => (
              <div key={idx} className="px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg"
                style={{ background: 'rgba(217,70,239,0.25)', border: '1px solid rgba(217,70,239,0.5)', color: '#fbcfe8', backdropFilter: 'blur(12px)' }}>
                <Star className="w-3 h-3 text-pink-300" />
                {reason.length > 28 ? reason.substring(0, 25) + '...' : reason}
              </div>
            ))}
          </div>

          {/* Profile info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  {profile.name}
                </h2>
                <span className="text-xl font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{profile.age}</span>
                {profile.distance != null && (
                  <div className="flex items-center gap-1 ml-1">
                    <MapPin className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDistance(profile.distance)}</span>
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{profile.bio}</p>
              )}

              {/* Interest chips */}
              {profile.interests?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.interests.slice(0, 3).map((interest: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
                      {interest}
                    </span>
                  ))}
                  {profile.interests.length > 3 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f87171' }}>
                      +{profile.interests.length - 3}
                    </span>
                  )}
                </div>
              )}

              {isTop && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Info className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Tap card to see full profile</span>
                </div>
              )}
            </div>
          </div>

          {/* Like overlay */}
          {isTop && (
            <>
              <motion.div
                className="absolute top-1/2 right-6 -translate-y-1/2 px-4 py-2 rounded-2xl z-30 flex items-center gap-2"
                style={{ opacity: likeOpacity, background: 'rgba(34,197,94,0.25)', border: '2px solid #4ade80', rotate: '-15deg' }}
              >
                <Heart className="w-7 h-7" style={{ color: '#4ade80' }} fill="#4ade80" />
                <span className="text-lg font-bold" style={{ color: '#4ade80', fontFamily: 'Outfit, sans-serif' }}>LIKE</span>
              </motion.div>

              <motion.div
                className="absolute top-1/2 left-6 -translate-y-1/2 px-4 py-2 rounded-2xl z-30 flex items-center gap-2"
                style={{ opacity: nopeOpacity, background: 'rgba(239,68,68,0.25)', border: '2px solid #f87171', rotate: '15deg' }}
              >
                <X className="w-7 h-7" style={{ color: '#f87171' }} />
                <span className="text-lg font-bold" style={{ color: '#f87171', fontFamily: 'Outfit, sans-serif' }}>NOPE</span>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}