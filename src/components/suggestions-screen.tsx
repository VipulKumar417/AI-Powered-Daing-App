import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SwipeableCard } from './swipeable-card';
import { ProfileDetailView } from './profile-detail-view';
import { Heart, X, Star, RefreshCw, Sparkles, Compass } from 'lucide-react';
import { generateCompatibilityScore, UserProfileData } from '../services/aiService';

interface SuggestionsScreenProps {
  session: any;
  onNavigateToChat?: () => void;
  onNavigateToLikedYou?: () => void;
}

const SAMPLE_PROFILES = [
  { id: '1', name: 'Alex', age: 26, gender: 'non-binary', bio: 'Adventure seeker and coffee enthusiast ☕', interests: ['Hiking', 'Photography', 'Coffee', 'Music'], photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=600&q=80'] },
  { id: '2', name: 'Jordan', age: 28, gender: 'female', bio: 'Artist by day, stargazer by night 🌙', interests: ['Art', 'Astronomy', 'Yoga', 'Cooking'], photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80'] },
  { id: '3', name: 'Taylor', age: 25, gender: 'male', bio: 'Tech entrepreneur with a passion for travel ✈️', interests: ['Technology', 'Travel', 'Surfing', 'Reading'], photos: ['https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=600&q=80'] },
  { id: '4', name: 'Riley', age: 25, gender: 'female', bio: 'Mindful living, one breathe at a time 🧘', interests: ['Yoga', 'Meditation', 'Healthy Cooking', 'Nature'], photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=600&q=80'] },
  { id: '5', name: 'Morgan', age: 29, gender: 'male', bio: 'Rock climber & surfer. Adventure is life 🏄', interests: ['Rock Climbing', 'Surfing', 'Adventure Travel', 'Photography'], photos: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80'] },
  { id: '6', name: 'Avery', age: 27, gender: 'non-binary', bio: 'Jazz, wine, and late-night conversations 🎷', interests: ['Art Galleries', 'Jazz Music', 'Wine Tasting', 'Literature'], photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80'] },
];

export function SuggestionsScreen({ session, onNavigateToChat, onNavigateToLikedYou }: SuggestionsScreenProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);

  useEffect(() => { loadSuggestions(); }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const currentUser: UserProfileData = { name: session?.user?.email?.split('@')[0] || 'User', age: 25, bio: '', location: '', gender: '', preference: 'all' };
      const processed = await Promise.all(SAMPLE_PROFILES.map(async (match) => {
        const aiComp = await generateCompatibilityScore(currentUser, match as any);
        return { ...match, photoUrls: match.photos, compatibility: { score: aiComp.score, reason: aiComp.reasons?.[0] || 'Great Match' } };
      }));
      setSuggestions(processed);
      setCurrentIndex(0);
    } catch (_) {
      setSuggestions(SAMPLE_PROFILES.map(m => ({ ...m, photoUrls: m.photos, compatibility: { score: 75 + Math.floor(Math.random() * 20), reason: 'Great Match' } })));
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (profileId?: string) => {
    const id = profileId || suggestions[currentIndex]?.id;
    if (id) setLikedProfiles(prev => [...prev, id]);
    setSwipeDir('right');
    setTimeout(() => setSwipeDir(null), 400);
    nextProfile();
  };
  const handlePass = () => {
    setSwipeDir('left');
    setTimeout(() => setSwipeDir(null), 400);
    nextProfile();
  };
  const handleSuperLike = () => {
    const profile = suggestions[currentIndex];
    if (profile) setLikedProfiles(prev => [...prev, profile.id]);
    nextProfile();
  };
  const nextProfile = () => {
    if (currentIndex < suggestions.length - 1) setCurrentIndex(i => i + 1);
    else loadSuggestions();
  };
  const handleCardTap = (profile: any) => { setSelectedProfile(profile); setShowDetailView(true); };

  // Detail view
  if (showDetailView && selectedProfile) {
    return (
      <ProfileDetailView
        profile={selectedProfile}
        onBack={() => setShowDetailView(false)}
        onLike={() => { handleLike(selectedProfile.id); setShowDetailView(false); }}
        onPass={() => { handlePass(); setShowDetailView(false); }}
        onMessage={() => { alert('Conversation started! Check your messages.'); setShowDetailView(false); }}
      />
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-3 pt-2 pb-4">
          <Compass className="w-5 h-5" style={{ color: '#f43f5e' }} />
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.9)' }}>Discover</h2>
        </div>
        <div className="relative mx-auto" style={{ height: '540px', maxWidth: '360px' }}>
          <div className="absolute inset-0 rounded-3xl shimmer" />
          <div className="absolute inset-0 rounded-3xl flex items-end p-6">
            <div className="space-y-2 w-full">
              <div className="h-7 w-32 rounded-lg shimmer" />
              <div className="h-4 w-48 rounded-lg shimmer" />
              <div className="flex gap-2 mt-3">
                {[1, 2, 3].map(i => <div key={i} className="h-6 w-16 rounded-full shimmer" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const visibleSuggestions = suggestions.slice(currentIndex, currentIndex + 3);

  if (visibleSuggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pb-24 pt-12 text-center space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(217,70,239,0.2))', border: '1px solid rgba(244,63,94,0.3)' }}>
          <Sparkles className="w-10 h-10" style={{ color: '#d946ef' }} />
        </motion.div>
        <div>
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>All caught up!</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>You've seen everyone. Check back later for more!</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={loadSuggestions} className="btn-glow px-6 py-3 rounded-2xl font-semibold flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Find More People
        </motion.button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5" style={{ color: '#f43f5e' }} />
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Discover</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium glass" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {suggestions.length - currentIndex} left
          </span>
        </div>
        {likedProfiles.length > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(244,63,94,0.2)', border: '1px solid rgba(244,63,94,0.4)', color: '#f43f5e' }}
          >
            <Heart className="w-3 h-3" fill="#f43f5e" /> {likedProfiles.length}
          </motion.span>
        )}
      </div>

      {/* Card stack */}
      <div className="relative mx-auto" style={{ height: '520px', maxWidth: '360px' }}>
        <AnimatePresence>
          {visibleSuggestions.map((suggestion, index) => (
            <SwipeableCard
              key={`${suggestion.id}-${currentIndex + index}`}
              profile={suggestion}
              onSwipeLeft={handlePass}
              onSwipeRight={handleLike}
              onTapCard={() => handleCardTap(suggestion)}
              isTop={index === 0}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center items-center gap-5 mt-6">
        {/* Pass */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handlePass}
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', backdropFilter: 'blur(12px)' }}
        >
          <X className="w-6 h-6" style={{ color: '#ef4444' }} />
        </motion.button>

        {/* Super Like */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleSuperLike}
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', backdropFilter: 'blur(12px)' }}
        >
          <Star className="w-5 h-5" style={{ color: '#3b82f6' }} />
        </motion.button>

        {/* Like */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => handleLike()}
          className="w-14 h-14 rounded-2xl flex items-center justify-center btn-glow"
        >
          <Heart className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <p className="text-center mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Swipe left to pass · Tap card for details · Swipe right to like
      </p>
    </div>
  );
}