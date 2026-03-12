import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatInterface } from './chat-interface';
import { ProfileScreen } from './profile-screen';
import { LikedYouScreen } from './liked-you-screen';
import { SuggestionsScreen } from './suggestions-screen';
import { MessagesScreen } from './messages-screen';
import { BottomNav } from './bottom-nav';
import { PhotoUpload } from './photo-upload';
import { Sparkles, Heart, AlertCircle, Wifi, RefreshCw } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { makeAuthenticatedRequest } from '../utils/session-helper';

interface MainAppProps {
  session: any;
  supabase: any;
}

const pageVariants = {
  initial: { opacity: 0, x: 24, filter: 'blur(4px)' },
  in: { opacity: 1, x: 0, filter: 'blur(0px)' },
  out: { opacity: 0, x: -24, filter: 'blur(4px)' },
};


export function MainApp({ session, supabase }: MainAppProps) {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      setProfileLoading(true);
      if (!session || !session.access_token) {
        setUserProfile({ id: 'no-session', name: 'User', photos: [], profileComplete: false, isOffline: true });
        setProfileLoading(false);
        return;
      }
      if (!navigator.onLine) {
        setUserProfile({ id: session.user.id, name: session.user.email?.split('@')[0] || 'User', email: session.user.email, photos: [], profileComplete: false, isOffline: true });
        setProfileLoading(false);
        return;
      }
      if (navigator.onLine && session?.access_token) {
        try {
          await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/create-sample-users`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
          });
        } catch (_) { }
      }
      await loadUserProfile();
      setProfileLoading(false);
    };
    const t = setTimeout(initProfile, 100);
    return () => clearTimeout(t);
  }, [session?.access_token]);

  const loadUserProfile = async (retryCount = 0) => {
    const maxRetries = 2;
    try {
      if (!navigator.onLine) {
        setUserProfile({ id: session?.user?.id || 'offline-user', name: session?.user?.email?.split('@')[0] || 'User', photos: [], profileComplete: false, isOffline: true });
        return;
      }
      if (!session || !session.access_token) {
        setUserProfile({ id: session?.user?.id || 'unknown', name: session?.user?.email?.split('@')[0] || 'User', photos: [], profileComplete: false });
        return;
      }
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 2000);
        const h = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/health`, { headers: { 'Authorization': `Bearer ${session.access_token}` }, signal: controller.signal });
        clearTimeout(tid);
        if (!h.ok) throw new Error('health check failed');
      } catch (healthErr: any) {
        if (healthErr.name === 'AbortError' || healthErr.message?.includes('fetch')) {
          setUserProfile({ id: session.user.id, name: session.user.email?.split('@')[0] || 'User', email: session.user.email, photos: [], profileComplete: false, isOffline: true, serverError: true });
          return;
        }
      }
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/profile`, { signal: controller.signal, headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }, session);
        clearTimeout(tid);
        if (response.ok) {
          const data = await response.json();
          if (data.profile) { setUserProfile(data.profile); setChatHistory(data.chatHistory || []); }
          else if (data.id) { setUserProfile(data); }
          else if (data.success && data.profile) { setUserProfile(data.profile); setChatHistory(data.chatHistory || []); }
          else throw new Error('Invalid profile response format');
          return;
        } else if (response.status === 404) {
          try {
            const cr = await makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/profile`, { method: 'PUT', body: JSON.stringify({ name: session.user.email?.split('@')[0] || 'User', email: session.user.email, photos: [], profileComplete: false, created_at: new Date().toISOString() }) }, session);
            if (cr.ok) { const cp = await cr.json(); setUserProfile(cp.profile || { id: session.user.id, name: session.user.email?.split('@')[0] || 'User', email: session.user.email, photos: [], profileComplete: false }); return; }
          } catch (_) { }
          setUserProfile({ id: session.user.id, name: session.user.email?.split('@')[0] || 'User', email: session.user.email, photos: [], profileComplete: false });
          return;
        } else { throw new Error(`Server ${response.status}`); }
      } catch (fe) { clearTimeout(tid); throw fe; }
    } catch (error: any) {
      const isNet = error.name === 'AbortError' || error.name === 'TypeError' || error.message?.includes('fetch') || error.message?.includes('Failed to fetch') || error.message?.includes('Network error');
      if (isNet && retryCount < maxRetries) { setTimeout(() => loadUserProfile(retryCount + 1), (retryCount + 1) * 500); return; }
      setNetworkError(isNet);
      setUserProfile({ id: session?.user?.id || 'fallback-user', name: session?.user?.email?.split('@')[0] || 'User', email: session?.user?.email, photos: [], profileComplete: false, hasError: true, errorMessage: isNet ? 'Network connection issue' : 'Server error' });
    }
  };

  const updateProfile = (p: any) => setUserProfile(p);
  const updateChatHistory = (h: any[]) => setChatHistory(h);

  // ── Loading screen ──
  if (profileLoading) {
    return (
      <div className="sanjog-bg min-h-screen min-h-dvh flex items-center justify-center">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto pulse-glow"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef, #8b5cf6)' }}
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <div>
            <h2 className="text-xl font-semibold gradient-text mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Setting up your profile</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Just a moment…</p>
          </div>
          <div className="flex gap-2 justify-center">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          {!navigator.onLine && (
            <div className="bg-white/90 backdrop-blur-md rounded-xl px-4 py-3 mx-4 flex items-center gap-2 shadow-sm border border-orange-100">
              <Wifi className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>You appear to be offline</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Profile completion screen ──
  if (userProfile && !userProfile.profileComplete) {
    return (
      <div className="sanjog-bg min-h-screen min-h-dvh">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40 pt-safe">
          <div className="max-w-2xl w-full mx-auto px-4 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef)' }}>
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Sanjog</span>
          </div>
        </header>

        <main className="max-w-2xl w-full mx-auto p-4 pb-8">
          {/* Alert */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-orange-50 rounded-xl p-4 flex items-start gap-3 mb-6 mt-4 border border-orange-200">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <div>
              <h3 className="font-semibold mb-1" style={{ color: '#f59e0b' }}>Complete Your Profile</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Add at least 3 photos to start discovering matches.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Almost There!</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Add your photos to complete your profile and get amazing matches.</p>
          </motion.div>

          <PhotoUpload
            session={session}
            userProfile={userProfile}
            onProfileUpdate={updateProfile}
            onComplete={() => {
              const completeProfile = { ...userProfile, profileComplete: true };
              updateProfile(completeProfile);
              fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/complete-profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ profileComplete: true }) }).catch(() => { });
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="sanjog-bg min-h-screen min-h-dvh" style={{ paddingBottom: activeTab === 'chat' ? 0 : '88px' }}>
      {/* Connection banner */}
      <AnimatePresence>
        {(userProfile?.hasError || userProfile?.isOffline || !navigator.onLine) && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-safe"
          >
            <div className="bg-white/90 backdrop-blur-md mx-4 mt-2 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm border border-orange-100">
              {!navigator.onLine ? (
                <>
                  <Wifi className="w-4 h-4" style={{ color: '#f59e0b' }} />
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>You're offline</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} />
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>Connection issues detected</span>
                  {networkError && (
                    <button onClick={() => { setNetworkError(false); setProfileLoading(true); loadUserProfile(); }} className="flex items-center gap-1 text-xs underline ml-1" style={{ color: '#f43f5e' }}>
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky header (hidden in chat mode) */}
      <AnimatePresence>
        {activeTab !== 'chat' && (
          <motion.header
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40 pt-safe shadow-sm"
          >
            <div className="max-w-2xl w-full mx-auto px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef)' }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-xl gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Sanjog</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {userProfile?.name || session?.user?.email?.split('@')[0] || 'User'}
                </span>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <main className="max-w-2xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' ? (
            <motion.div key="chat" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.28 }} className="flex-1">
              <ChatInterface session={session} chatHistory={chatHistory} onUpdateChatHistory={updateChatHistory} onBack={() => setActiveTab('suggestions')} />
            </motion.div>
          ) : (
            <motion.div key={activeTab} variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.28 }} className="px-4 pt-2 pb-4">
              {activeTab === 'suggestions' && (
                <SuggestionsScreen session={session} chatHistory={chatHistory} onNavigateToChat={() => setActiveTab('chat')} onNavigateToLikedYou={() => setActiveTab('likedyou')} />
              )}
              {activeTab === 'likedyou' && (
                <LikedYouScreen session={session} onNavigateToDiscover={() => setActiveTab('suggestions')} />
              )}
              {activeTab === 'messages' && (
                <MessagesScreen session={session} onNavigateToDiscover={() => setActiveTab('suggestions')} onNavigateToAIChat={() => setActiveTab('chat')} />
              )}
              {activeTab === 'profile' && (
                <ProfileScreen session={session} userProfile={userProfile} onUpdateProfile={updateProfile} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <AnimatePresence>
        {activeTab !== 'chat' && (
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </AnimatePresence>
    </div >
  );
}