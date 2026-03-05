import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MainApp } from './components/main-app';
import { AuthScreen } from './components/auth-screen';
import { Sparkles } from 'lucide-react';
import { getSupabaseClient } from './utils/supabase/client';

function SanjogSplashLogo() {
  return (
    <div className="relative flex flex-col items-center gap-6">
      {/* Animated glow rings */}
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full pulse-glow"
          style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 70%)' }}
        />
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef, #8b5cf6)' }}
        >
          <Sparkles className="w-12 h-12 text-white" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="text-center"
      >
        <h1
          className="gradient-text text-5xl font-bold mb-1"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Sanjog
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          AI-powered connections
        </p>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex gap-2 mt-2"
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </motion.div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    document.title = 'Sanjog — Find Your Perfect Match';

    // Check for existing session
    const initAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        setSession(existingSession);
      } catch (e) {
        console.warn('Failed to get session:', e);
      }
      // Small delay to show the splash screen
      setTimeout(() => setLoading(false), 1200);
    };

    initAuth();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, newSession: any) => {
        setSession(newSession);
      }
    );

    return () => subscription?.unsubscribe?.();
  }, []);

  return (
    <div className="sanjog-bg">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="splash"
            className="min-h-screen min-h-dvh flex items-center justify-center"
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <SanjogSplashLogo />

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: `${8 + i * 4}px`,
                  height: `${8 + i * 4}px`,
                  background: i % 2 === 0
                    ? 'rgba(244,63,94,0.2)'
                    : 'rgba(217,70,239,0.2)',
                  left: `${15 + i * 14}%`,
                  top: `${20 + (i % 3) * 20}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        ) : session ? (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <MainApp session={session} supabase={supabase} />
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <AuthScreen supabase={supabase} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}