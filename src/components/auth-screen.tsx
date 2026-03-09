import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoUpload } from './photo-upload';
import { LocationPermission } from './location-permission';
import {
  Sparkles, Heart, ArrowLeft, ArrowRight, Mail, Lock, User, Phone,
  MapPin, Briefcase, GraduationCap, Ruler, Calendar, ChevronRight,
  Camera, CheckCircle2
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';
import { ALL_INTERESTS } from '../constants';
import { projectId } from '../utils/supabase/info';

/* ─── Types ─── */
interface AuthScreenProps { supabase?: any; }

type AuthView = 'welcome' | 'login' | 'signup' | 'profile-wizard';

/* ─── Glassmorphism input helper ─── */
function GlassInput({ icon: Icon, ...props }: any) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
      )}
      <input
        {...props}
        className={`w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none transition-all duration-200
          focus:ring-1 focus:ring-pink-500/40 ${Icon ? 'pl-10' : ''} ${props.className || ''}`}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: '#fff',
          caretColor: '#d946ef',
          ...props.style
        }}
      />
    </div>
  );
}

function GlassSelect({ icon: Icon, children, ...props }: any) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }} />
      )}
      <select
        {...props}
        className={`w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none appearance-none cursor-pointer
          focus:ring-1 focus:ring-pink-500/40 ${Icon ? 'pl-10' : ''}`}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: '#fff',
        }}
      >
        {children}
      </select>
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   AUTH SCREEN COMPONENT
   ═══════════════════════════════════════════════ */
export function AuthScreen({ supabase: _sb }: AuthScreenProps) {
  const supabase = _sb || getSupabaseClient();

  const [view, setView] = useState<AuthView>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  // Profile wizard
  const [wizardStep, setWizardStep] = useState(0);
  const [tempSession, setTempSession] = useState<any>(null);
  const [profile, setProfile] = useState({
    age: '', gender: '', height: '', city: '',
    religion: '', drinking: '', smoking: '', lookingFor: '',
    bio: '', education: '', jobTitle: '', company: '',
    interests: [] as string[],
    interestedIn: '', ageRangeMin: '18', ageRangeMax: '35', distancePref: '25',
    photos: [] as string[],
  });

  const WIZARD_STEPS = ['Basic Info', 'About You', 'Interests', 'Preferences', 'Photos', 'Location'];

  /* ─── Auth handlers ─── */
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) setError(error.message);
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      if (data?.user) {
        // Auth state change will handle redirect
      }
    } catch (e: any) {
      setError(e.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      let session: any = null;

      // Strategy 1: Try server /signup endpoint (admin API, auto-confirms email)
      try {
        const serverRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, phone }),
        });
        if (serverRes.ok) {
          // Server created & confirmed user — now we can sign in
          const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
          session = signInData?.session;
        }
      } catch {
        console.log('Server signup unavailable, using client fallback');
      }

      // Strategy 2: Client-side fallback if server is down
      if (!session) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, phone } }
        });

        if (signUpError) {
          // If user already exists, try signing in directly
          if (signUpError.message?.includes('already') || signUpError.message?.includes('registered')) {
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            if (loginError) {
              setError('Account exists but login failed. Try resetting your password.');
              return;
            }
            session = loginData?.session;
          } else {
            setError(signUpError.message);
            return;
          }
        } else if (data?.session) {
          // signUp returned a session (auto-confirm is on)
          session = data.session;
        } else if (data?.user) {
          // User created but no session — try signing in
          const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
          session = signInData?.session;
          if (!session) {
            // Email confirmation is required — show helpful message
            setError('Account created! Please check your email to confirm, then sign in.');
            setView('login');
            return;
          }
        }
      }

      if (session) {
        setTempSession(session);
        setView('profile-wizard');
        setWizardStep(0);
      } else {
        setError('Signup succeeded but could not create session. Please try signing in.');
      }
    } catch (e: any) {
      setError(e.message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setProfile(p => ({
      ...p,
      interests: p.interests.includes(interest)
        ? p.interests.filter(i => i !== interest)
        : [...p.interests, interest]
    }));
  };

  const handleWizardComplete = async () => {
    // Save all wizard-collected profile data to the server before reloading
    if (tempSession?.access_token) {
      try {
        setLoading(true);
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tempSession.access_token}`,
          },
          body: JSON.stringify({
            name,
            age: profile.age ? parseInt(profile.age) : null,
            gender: profile.gender,
            height: profile.height,
            city: profile.city,
            religion: profile.religion,
            drinking: profile.drinking,
            smoking: profile.smoking,
            lookingFor: profile.lookingFor,
            bio: profile.bio,
            education: profile.education,
            jobTitle: profile.jobTitle,
            company: profile.company,
            interests: profile.interests,
            interestedIn: profile.interestedIn,
            ageRangeMin: profile.ageRangeMin,
            ageRangeMax: profile.ageRangeMax,
            distancePref: profile.distancePref,
            photos: profile.photos,
            profileComplete: true,
          }),
        });
      } catch (err) {
        console.warn('Failed to save profile to cloud:', err);
      } finally {
        setLoading(false);
      }
    }
    // Auth state listener will redirect to main app
    window.location.reload();
  };

  const handleWizardNext = () => {
    if (wizardStep < WIZARD_STEPS.length - 1) setWizardStep(s => s + 1);
    else handleWizardComplete();
  };

  const handleWizardBack = () => {
    if (wizardStep > 0) setWizardStep(s => s - 1);
  };

  /* ═══════════════════════════════════════════════
     RENDER: PROFILE WIZARD
     ═══════════════════════════════════════════════ */
  if (view === 'profile-wizard') {
    return (
      <div className="sanjog-bg min-h-screen min-h-dvh flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-6 pb-2">
          <button onClick={handleWizardBack} disabled={wizardStep === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: wizardStep === 0 ? 'transparent' : 'rgba(255,255,255,0.07)', opacity: wizardStep === 0 ? 0.3 : 1 }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {wizardStep + 1} of {WIZARD_STEPS.length}
          </span>
          {wizardStep < WIZARD_STEPS.length - 1 ? (
            <button onClick={() => handleWizardNext()} className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Skip
            </button>
          ) : <div className="w-9" />}
        </div>

        {/* Progress bar */}
        <div className="px-5 py-2">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #f43f5e, #d946ef)' }}
              animate={{ width: `${((wizardStep + 1) / WIZARD_STEPS.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 px-5 py-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={wizardStep}
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }} className="space-y-5"
            >
              {/* ─── Step 0: Basic Info ─── */}
              {wizardStep === 0 && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Tell us about yourself</h2>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Let's start with the basics</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Full Name</label>
                    <GlassInput icon={User} value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Age</label>
                      <GlassInput icon={Calendar} type="number" min="18" max="100" value={profile.age}
                        onChange={(e: any) => setProfile(p => ({ ...p, age: e.target.value }))} placeholder="Age" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Gender</label>
                      <GlassSelect value={profile.gender} onChange={(e: any) => setProfile(p => ({ ...p, gender: e.target.value }))}>
                        <option value="" disabled>Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="other">Other</option>
                      </GlassSelect>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Height</label>
                      <GlassSelect icon={Ruler} value={profile.height} onChange={(e: any) => setProfile(p => ({ ...p, height: e.target.value }))}>
                        <option value="" disabled>Select</option>
                        {["4'10\"", "4'11\"", "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"", "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\"", "6'5\"+"].map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </GlassSelect>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>City</label>
                      <GlassInput icon={MapPin} value={profile.city}
                        onChange={(e: any) => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="Your city" />
                    </div>
                  </div>
                </>
              )}

              {/* ─── Step 1: About You ─── */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>About You</h2>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Share a little more to stand out</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                      placeholder="What makes you unique? Write a few lines…"
                      rows={2}
                      maxLength={300}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none focus:ring-1 focus:ring-pink-500/40"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff', caretColor: '#d946ef' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Education</label>
                      <GlassInput icon={GraduationCap} value={profile.education}
                        onChange={(e: any) => setProfile(p => ({ ...p, education: e.target.value }))} placeholder="e.g. IIT Delhi" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Job Title</label>
                      <GlassInput icon={Briefcase} value={profile.jobTitle}
                        onChange={(e: any) => setProfile(p => ({ ...p, jobTitle: e.target.value }))} placeholder="e.g. Engineer" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Religion</label>
                      <GlassSelect value={profile.religion} onChange={(e: any) => setProfile(p => ({ ...p, religion: e.target.value }))}>
                        <option value="" disabled>Select</option>
                        {['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other', 'Atheist'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </GlassSelect>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Looking For</label>
                      <GlassSelect value={profile.lookingFor} onChange={(e: any) => setProfile(p => ({ ...p, lookingFor: e.target.value }))}>
                        <option value="" disabled>Select</option>
                        <option value="Long-term partner">Long-term partner</option>
                        <option value="Casual dating">Casual dating</option>
                        <option value="New friends">New friends</option>
                        <option value="Not sure yet">Not sure yet</option>
                      </GlassSelect>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Drinking</label>
                      <GlassSelect value={profile.drinking} onChange={(e: any) => setProfile(p => ({ ...p, drinking: e.target.value }))}>
                        <option value="" disabled>Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Occasionally">Occasionally</option>
                      </GlassSelect>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Smoking</label>
                      <GlassSelect value={profile.smoking} onChange={(e: any) => setProfile(p => ({ ...p, smoking: e.target.value }))}>
                        <option value="" disabled>Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Occasionally">Occasionally</option>
                      </GlassSelect>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Step 2: Interests ─── */}
              {wizardStep === 2 && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Your Interests</h2>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Pick at least 3 to help us find the right matches</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_INTERESTS.map(interest => {
                      const active = profile.interests.includes(interest);
                      return (
                        <motion.button key={interest} whileTap={{ scale: 0.92 }}
                          onClick={() => handleInterestToggle(interest)}
                          className="px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                          style={{
                            background: active ? 'linear-gradient(135deg, rgba(244,63,94,0.25), rgba(217,70,239,0.25))' : 'rgba(255,255,255,0.05)',
                            border: active ? '1px solid rgba(244,63,94,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {interest}
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {profile.interests.length} selected {profile.interests.length < 3 && '(min 3)'}
                  </p>
                </>
              )}

              {/* ─── Step 3: Preferences ─── */}
              {wizardStep === 3 && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Dating Preferences</h2>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Who are you looking for?</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Interested In</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ v: 'male', l: 'Men' }, { v: 'female', l: 'Women' }, { v: 'everyone', l: 'Everyone' }].map(opt => (
                        <motion.button key={opt.v} whileTap={{ scale: 0.95 }}
                          onClick={() => setProfile(p => ({ ...p, interestedIn: opt.v }))}
                          className="py-3 rounded-xl text-sm font-medium text-center transition-all"
                          style={{
                            background: profile.interestedIn === opt.v ? 'linear-gradient(135deg, #f43f5e, #d946ef)' : 'rgba(255,255,255,0.05)',
                            border: profile.interestedIn === opt.v ? 'none' : '1px solid rgba(255,255,255,0.10)',
                            color: '#fff',
                            boxShadow: profile.interestedIn === opt.v ? '0 4px 20px rgba(244,63,94,0.3)' : 'none',
                          }}
                        >{opt.l}</motion.button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Age Range: {profile.ageRangeMin} – {profile.ageRangeMax}
                    </label>
                    <div className="flex gap-3 items-center">
                      <input type="range" min="18" max="60" value={profile.ageRangeMin}
                        onChange={e => setProfile(p => ({ ...p, ageRangeMin: e.target.value }))}
                        className="flex-1 accent-pink-500" />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>to</span>
                      <input type="range" min="18" max="60" value={profile.ageRangeMax}
                        onChange={e => setProfile(p => ({ ...p, ageRangeMax: e.target.value }))}
                        className="flex-1 accent-purple-500" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Maximum Distance: {profile.distancePref} km
                    </label>
                    <input type="range" min="5" max="100" value={profile.distancePref}
                      onChange={e => setProfile(p => ({ ...p, distancePref: e.target.value }))}
                      className="w-full accent-pink-500" />
                  </div>
                </>
              )}

              {/* ─── Step 4: Photos ─── */}
              {wizardStep === 4 && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Add Your Photos</h2>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Add at least 3 photos to get started</p>
                  </div>
                  <PhotoUpload
                    photos={profile.photos}
                    onPhotosUpdate={(photos) => setProfile(p => ({ ...p, photos }))}
                    session={tempSession}
                    minPhotos={3}
                    maxPhotos={6}
                  />
                </>
              )}

              {/* ─── Step 5: Location ─── */}
              {wizardStep === 5 && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Enable Location</h2>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Find amazing people near you</p>
                  </div>
                  <LocationPermission
                    onLocationUpdate={() => { }}
                    showSkipOption={true}
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom CTA */}
        <div className="px-5 pb-8 pt-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleWizardNext}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white btn-glow flex items-center justify-center gap-2"
          >
            {wizardStep === WIZARD_STEPS.length - 1 ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Start Matching!</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    );
  }

  /* ─── Floating hearts data ─── */
  const HEARTS = [
    { emoji: '💕', left: '5%', duration: 12, delay: 0, size: '1.1rem' },
    { emoji: '❤️', left: '15%', duration: 14, delay: 2, size: '0.9rem' },
    { emoji: '💗', left: '28%', duration: 11, delay: 4, size: '1.3rem' },
    { emoji: '💖', left: '45%', duration: 16, delay: 1, size: '1rem' },
    { emoji: '❤️', left: '62%', duration: 13, delay: 3, size: '1.2rem' },
    { emoji: '💕', left: '78%', duration: 15, delay: 5, size: '0.8rem' },
    { emoji: '💗', left: '88%', duration: 10, delay: 2.5, size: '1.1rem' },
    { emoji: '💖', left: '95%', duration: 17, delay: 6, size: '0.9rem' },
  ];

  const LOVE_QUOTES = [
    '"Where hearts find their way home"',
    '"Every love story is beautiful, but ours is my favourite"',
    '"Two souls, one connection"',
  ];

  const [quoteIndex] = useState(() => Math.floor(Math.random() * LOVE_QUOTES.length));

  /* ─── Cursor glow handler ─── */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  /* ─── Google SVG icon (reusable) ─── */
  const GoogleIcon = ({ size = 'w-5 h-5' }: { size?: string }) => (
    <svg className={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  /* ═══════════════════════════════════════════════
     RENDER: WELCOME / LOGIN / SIGNUP
     ═══════════════════════════════════════════════ */
  return (
    <div
      className="auth-bg cursor-glow flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Decorative background orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f43f5e, transparent)' }} />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'radial-gradient(circle, #d946ef, transparent)' }} />

      {/* Floating hearts */}
      {HEARTS.map((h, i) => (
        <span
          key={i}
          className="floating-heart"
          style={{
            left: h.left,
            fontSize: h.size,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
          }}
        >
          {h.emoji}
        </span>
      ))}

      <AnimatePresence mode="wait">
        {/* ─── WELCOME LANDING ─── */}
        {view === 'welcome' && (
          <motion.div key="welcome"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }} className="w-full max-w-md text-center space-y-8 relative z-10"
          >
            {/* Logo */}
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-28 h-28 rounded-3xl overflow-hidden mx-auto pulse-glow shadow-2xl border border-white/10"
              >
                <img src="/sanjog-logo.png" alt="Sanjog Logo" className="w-full h-full object-cover backdrop-blur-lg" />
              </motion.div>
              <div>
                <h1 className="gradient-text-animated text-6xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Sanjog</h1>
                <p className="text-[15px] mt-2 tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>AI-powered connections, made for you</p>
              </div>
            </div>

            {/* Features preview */}
            <div className="space-y-3.5 pt-2 pb-4 text-left">
              {[
                {
                  icon: '🤖', title: 'AI Matchmaking', desc: 'Find matches based on deep personality compatibility',
                  bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', color: '#f43f5e'
                },
                {
                  icon: '💬', title: 'Smart Icebreakers', desc: 'Personalized prompts tailored to your match',
                  bg: 'rgba(217,70,239,0.1)', border: 'rgba(217,70,239,0.2)', color: '#d946ef'
                },
                {
                  icon: '📍', title: 'Perfect Dates', desc: 'Curated date recommendations near you',
                  bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', color: '#8b5cf6'
                },
              ].map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.12 }}
                  className="flex items-center gap-4 p-4 rounded-2xl glass-card relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-[100px] opacity-20 transition-opacity group-hover:opacity-40"
                    style={{ background: `radial-gradient(circle at top right, ${f.color}, transparent)` }} />
                  <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 text-xl z-10 transition-transform group-hover:scale-110"
                    style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                    {f.icon}
                  </div>
                  <div className="z-10">
                    <h5 className="font-bold text-[15px] text-white tracking-wide">{f.title}</h5>
                    <p className="text-[13px] mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="space-y-4 pt-3">
              {/* Google button */}
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleGoogleLogin} disabled={loading}
                className="btn-auth btn-auth-google disabled:opacity-50"
              >
                <GoogleIcon size="w-6 h-6" />
                <span>Continue with Google</span>
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
              </div>

              {/* Email Sign In */}
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setView('login')}
                className="btn-auth btn-auth-primary"
              >
                <Mail className="w-5 h-5" />
                <span>Sign in with Email</span>
              </motion.button>

              {/* Sign Up link */}
              <p className="text-base pt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                New here?{' '}
                <button onClick={() => setView('signup')} className="font-bold underline underline-offset-4" style={{ color: '#d946ef' }}>
                  Create Account
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {/* ─── LOGIN FORM ─── */}
        {view === 'login' && (
          <motion.div key="login"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }} className="w-full max-w-md space-y-6 relative z-10"
          >
            {/* Back button */}
            <button onClick={() => { setView('welcome'); setError(''); }}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-all hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div>
              <h2 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Welcome Back</h2>
              <p className="text-sm mt-2 italic" style={{ color: 'rgba(255,255,255,0.35)' }}>
                "Love is just a heartbeat away" 💗
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Email</label>
                <GlassInput icon={Mail} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                <GlassInput icon={Lock} type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                type="submit" disabled={loading}
                className="btn-auth btn-auth-primary disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </motion.button>
            </form>

            <p className="text-base text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Don't have an account?{' '}
              <button onClick={() => { setView('signup'); setError(''); }} className="font-bold underline underline-offset-4" style={{ color: '#d946ef' }}>
                Sign Up
              </button>
            </p>
          </motion.div>
        )}

        {/* ─── SIGNUP FORM ─── */}
        {view === 'signup' && (
          <motion.div key="signup"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }} className="w-full max-w-md space-y-6 relative z-10"
          >
            <button onClick={() => { setView('welcome'); setError(''); }}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-all hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div>
              <h2 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Create Account</h2>
              <p className="text-sm mt-2 italic" style={{ color: 'rgba(255,255,255,0.35)' }}>
                "Your love story starts here" ✨
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Full Name</label>
                <GlassInput icon={User} value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Your full name" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Email</label>
                <GlassInput icon={Mail} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Mobile Number</label>
                <GlassInput icon={Phone} type="tel" value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                <GlassInput icon={Lock} type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="Min 6 characters" required />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                type="submit" disabled={loading}
                className="btn-auth btn-auth-primary disabled:opacity-50"
              >
                {loading ? 'Creating Account…' : 'Create Account'}
              </motion.button>
            </form>

            {/* Google alternate */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleGoogleLogin} disabled={loading}
                className="btn-auth btn-auth-google disabled:opacity-50"
              >
                <GoogleIcon size="w-5 h-5" />
                <span>Sign up with Google</span>
              </motion.button>
            </div>

            <p className="text-base text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Already have an account?{' '}
              <button onClick={() => { setView('login'); setError(''); }} className="font-bold underline underline-offset-4" style={{ color: '#d946ef' }}>
                Sign In
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}