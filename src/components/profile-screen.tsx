import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoUpload } from './photo-upload';
import { PhotoRecovery } from './photo-recovery';
import {
  User, Edit, Save, X, Plus, Sparkles, RefreshCw, Heart, Eye, Star,
  MapPin, Briefcase, GraduationCap, Ruler, Calendar, ChevronRight
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { generateProfileReview } from '../services/aiService';
import { ALL_INTERESTS } from '../constants';

interface ProfileScreenProps {
  session: any;
  userProfile: any;
  onUpdateProfile: (profile: any) => void;
}

/* ─── Glassmorphism helpers (shared style with auth screen) ─── */
function GlassInput({ icon: Icon, ...props }: any) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
      )}
      <input
        {...props}
        className={`w-full px-4 py-2.5 rounded-xl text-sm bg-transparent outline-none transition-all duration-200
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
        className={`w-full px-4 py-2.5 rounded-xl text-sm bg-transparent outline-none appearance-none cursor-pointer
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

export function ProfileScreen({ session, userProfile, onUpdateProfile }: ProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [localPhotos, setLocalPhotos] = useState<string[]>(userProfile?.photos || []);
  const [showPhotoRecovery, setShowPhotoRecovery] = useState(false);

  // AI Profile Optimizer state
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewData, setReviewData] = useState<{ boast: string, roast: string, tip: string } | null>(null);

  React.useEffect(() => {
    if (userProfile?.photos) setLocalPhotos(userProfile.photos);
  }, [userProfile?.photos]);

  const handleGenerateReview = async () => {
    setIsReviewing(true);
    try {
      const result = await generateProfileReview(userProfile);
      setReviewData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReviewing(false);
    }
  };

  const startEditing = () => {
    setEditData({
      ...userProfile,
      interests: [...(userProfile.interests || [])],
    });
    setIsEditing(true);
  };
  const cancelEditing = () => { setEditData({}); setIsEditing(false); };

  const saveProfile = async () => {
    try {
      const payload: any = {
        name: editData.name,
        age: editData.age,
        gender: editData.gender,
        height: editData.height,
        city: editData.city,
        bio: editData.bio,
        education: editData.education,
        jobTitle: editData.jobTitle,
        company: editData.company,
        interests: editData.interests || [],
        interestedIn: editData.interestedIn,
        ageRangeMin: editData.ageRangeMin,
        ageRangeMax: editData.ageRangeMax,
        distancePref: editData.distancePref,
        personality: editData.personality || {},
        preferences: editData.preferences || {},
      };
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/update-personality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const d = await res.json();
        onUpdateProfile(d.profile || { ...userProfile, ...payload });
        setIsEditing(false);
      } else {
        // Optimistic fallback
        onUpdateProfile({ ...userProfile, ...payload });
        setIsEditing(false);
      }
    } catch (_) {
      // Optimistic local update even if network fails
      onUpdateProfile({ ...userProfile, ...editData });
      setIsEditing(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setEditData((prev: any) => ({
      ...prev,
      interests: (prev.interests || []).includes(interest)
        ? prev.interests.filter((i: string) => i !== interest)
        : [...(prev.interests || []), interest]
    }));
  };

  const getCompletion = () => {
    let filled = 0;
    const total = 7;
    if (userProfile?.name) filled++;
    if (userProfile?.age) filled++;
    if (userProfile?.gender) filled++;
    if (userProfile?.bio) filled++;
    if (userProfile?.interests?.length >= 3) filled++;
    if (userProfile?.photos?.length >= 1) filled++;
    if (userProfile?.city) filled++;
    return Math.round((filled / total) * 100);
  };

  if (!userProfile) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex gap-2"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
    </div>
  );

  const data = isEditing ? editData : userProfile;

  return (
    <div className="pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5" style={{ color: '#8b5cf6' }} />
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Your Profile</h2>
          {!userProfile.profileComplete && (
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>Incomplete</span>
          )}
        </div>
        {!isEditing ? (
          <motion.button whileTap={{ scale: 0.92 }} onClick={startEditing} className="btn-glass px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
            <Edit className="w-3.5 h-3.5" /> Edit
          </motion.button>
        ) : (
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.92 }} onClick={saveProfile} className="btn-glow px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Save
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={cancelEditing} className="btn-glass px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancel
            </motion.button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          HERO CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold"
              style={{ background: 'linear-gradient(135deg, #1a1535, #2d1b4e)', border: '2px solid transparent', backgroundClip: 'padding-box' }}>
              <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef)', zIndex: -1, borderRadius: '14px' }} />
              <div className="w-full h-full rounded-2xl flex items-center justify-center text-3xl font-bold relative"
                style={{ background: 'linear-gradient(135deg, #1a1535, #2d1b4e)' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{userProfile.name?.charAt(0) || '?'}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {!isEditing ? (
              <>
                <h3 className="text-xl font-bold mb-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{userProfile.name || 'Your Name'}</h3>
                <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>{userProfile.email || session?.user?.email}</p>
              </>
            ) : (
              <div className="space-y-2 mb-2">
                <GlassInput icon={User} value={editData.name || ''} onChange={(e: any) => setEditData({ ...editData, name: e.target.value })} placeholder="Your name" />
              </div>
            )}
            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5">
              {!isEditing ? (
                <>
                  {userProfile.age && <span className="text-xs px-2.5 py-1 rounded-full glass" style={{ color: 'rgba(255,255,255,0.6)' }}>🎂 {userProfile.age}</span>}
                  {userProfile.gender && <span className="text-xs px-2.5 py-1 rounded-full glass capitalize" style={{ color: 'rgba(255,255,255,0.6)' }}>{userProfile.gender}</span>}
                  {userProfile.height && <span className="text-xs px-2.5 py-1 rounded-full glass" style={{ color: 'rgba(255,255,255,0.6)' }}>📏 {userProfile.height}</span>}
                  {userProfile.city && <span className="text-xs px-2.5 py-1 rounded-full glass" style={{ color: 'rgba(255,255,255,0.6)' }}>📍 {userProfile.city}</span>}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <GlassInput icon={Calendar} type="number" min="18" max="100" value={editData.age || ''} onChange={(e: any) => setEditData({ ...editData, age: e.target.value })} placeholder="Age" />
                  <GlassSelect value={editData.gender || ''} onChange={(e: any) => setEditData({ ...editData, gender: e.target.value })}>
                    <option value="" disabled>Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </GlassSelect>
                  <GlassSelect icon={Ruler} value={editData.height || ''} onChange={(e: any) => setEditData({ ...editData, height: e.target.value })}>
                    <option value="" disabled>Height</option>
                    {["4'10\"", "4'11\"", "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"", "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\"", "6'5\"+"].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </GlassSelect>
                  <GlassInput icon={MapPin} value={editData.city || ''} onChange={(e: any) => setEditData({ ...editData, city: e.target.value })} placeholder="City" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Heart, label: 'Likes', value: '—', color: '#f43f5e' },
            { icon: Star, label: 'Matches', value: '—', color: '#d946ef' },
            { icon: Eye, label: 'Views', value: '—', color: '#8b5cf6' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
              <div className="text-base font-bold" style={{ color }}>{value}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Profile completion */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Profile Completion</span>
            <span style={{ color: '#d946ef' }}>{getCompletion()}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${getCompletion()}%`, background: 'linear-gradient(90deg, #f43f5e, #d946ef)' }} />
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════
          BIO CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="glass-card p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.85)' }}>
          ✍️ About Me
        </h3>
        {!isEditing ? (
          userProfile.bio ? (
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{userProfile.bio}</p>
          ) : (
            <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.3)' }}>No bio yet — tap Edit to add one!</p>
          )
        ) : (
          <div className="space-y-1">
            <textarea
              value={editData.bio || ''}
              onChange={e => setEditData({ ...editData, bio: e.target.value })}
              placeholder="What makes you unique? Write a few lines…"
              rows={4}
              maxLength={300}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none focus:ring-1 focus:ring-pink-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff', caretColor: '#d946ef' }}
            />
            <p className="text-right text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{(editData.bio || '').length}/300</p>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          WORK & EDUCATION CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.85)' }}>
          💼 Work & Education
        </h3>
        {!isEditing ? (
          (userProfile.education || userProfile.jobTitle || userProfile.company) ? (
            <div className="space-y-2">
              {userProfile.education && (
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 flex-shrink-0" style={{ color: '#8b5cf6' }} />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{userProfile.education}</span>
                </div>
              )}
              {(userProfile.jobTitle || userProfile.company) && (
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 flex-shrink-0" style={{ color: '#d946ef' }} />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {[userProfile.jobTitle, userProfile.company].filter(Boolean).join(' at ')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.3)' }}>No work/education info — tap Edit to add!</p>
          )
        ) : (
          <div className="space-y-2">
            <GlassInput icon={GraduationCap} value={editData.education || ''} onChange={(e: any) => setEditData({ ...editData, education: e.target.value })} placeholder="e.g. IIT Delhi — B.Tech CS" />
            <div className="grid grid-cols-2 gap-2">
              <GlassInput icon={Briefcase} value={editData.jobTitle || ''} onChange={(e: any) => setEditData({ ...editData, jobTitle: e.target.value })} placeholder="Job title" />
              <GlassInput value={editData.company || ''} onChange={(e: any) => setEditData({ ...editData, company: e.target.value })} placeholder="Company" />
            </div>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          INTERESTS CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="glass-card p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.85)' }}>
          ✨ Interests
          {!isEditing && userProfile.interests?.length > 0 && (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(217,70,239,0.12)', color: '#d946ef' }}>
              {userProfile.interests.length}
            </span>
          )}
        </h3>
        {!isEditing ? (
          userProfile.interests?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {userProfile.interests.map((interest: string) => (
                <span key={interest} className="px-3 py-1.5 rounded-xl text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(217,70,239,0.15))', border: '1px solid rgba(244,63,94,0.25)', color: 'rgba(255,255,255,0.8)' }}>
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.3)' }}>No interests selected — tap Edit to pick some!</p>
          )
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map(interest => {
                const active = (editData.interests || []).includes(interest);
                return (
                  <motion.button key={interest} whileTap={{ scale: 0.92 }}
                    onClick={() => handleInterestToggle(interest)}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
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
              {(editData.interests || []).length} selected {(editData.interests || []).length < 3 && '(min 3)'}
            </p>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          DATING PREFERENCES CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="glass-card p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.85)' }}>
          💞 Dating Preferences
        </h3>
        {!isEditing ? (
          (userProfile.interestedIn || userProfile.ageRangeMin || userProfile.distancePref) ? (
            <div className="grid grid-cols-3 gap-2">
              {userProfile.interestedIn && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color: '#f43f5e' }}>Interested In</div>
                  <div className="text-sm capitalize" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {userProfile.interestedIn === 'male' ? 'Men' : userProfile.interestedIn === 'female' ? 'Women' : 'Everyone'}
                  </div>
                </div>
              )}
              {(userProfile.ageRangeMin || userProfile.ageRangeMax) && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color: '#d946ef' }}>Age Range</div>
                  <div className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{userProfile.ageRangeMin || '18'} – {userProfile.ageRangeMax || '35'}</div>
                </div>
              )}
              {userProfile.distancePref && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color: '#8b5cf6' }}>Distance</div>
                  <div className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{userProfile.distancePref} km</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.3)' }}>No preferences set — tap Edit to configure!</p>
          )
        ) : (
          <div className="space-y-4">
            {/* Interested In */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Interested In</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: 'male', l: 'Men' }, { v: 'female', l: 'Women' }, { v: 'everyone', l: 'Everyone' }].map(opt => (
                  <motion.button key={opt.v} whileTap={{ scale: 0.95 }}
                    onClick={() => setEditData({ ...editData, interestedIn: opt.v })}
                    className="py-2.5 rounded-xl text-sm font-medium text-center transition-all"
                    style={{
                      background: editData.interestedIn === opt.v ? 'linear-gradient(135deg, #f43f5e, #d946ef)' : 'rgba(255,255,255,0.05)',
                      border: editData.interestedIn === opt.v ? 'none' : '1px solid rgba(255,255,255,0.10)',
                      color: '#fff',
                      boxShadow: editData.interestedIn === opt.v ? '0 4px 20px rgba(244,63,94,0.3)' : 'none',
                    }}
                  >{opt.l}</motion.button>
                ))}
              </div>
            </div>
            {/* Age Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Age Range: {editData.ageRangeMin || '18'} – {editData.ageRangeMax || '35'}
              </label>
              <div className="flex gap-3 items-center">
                <input type="range" min="18" max="60" value={editData.ageRangeMin || '18'}
                  onChange={e => setEditData({ ...editData, ageRangeMin: e.target.value })}
                  className="flex-1 accent-pink-500" />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>to</span>
                <input type="range" min="18" max="60" value={editData.ageRangeMax || '35'}
                  onChange={e => setEditData({ ...editData, ageRangeMax: e.target.value })}
                  className="flex-1 accent-purple-500" />
              </div>
            </div>
            {/* Distance */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Maximum Distance: {editData.distancePref || '25'} km
              </label>
              <input type="range" min="5" max="100" value={editData.distancePref || '25'}
                onChange={e => setEditData({ ...editData, distancePref: e.target.value })}
                className="w-full accent-pink-500" />
            </div>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          PHOTOS CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="glass-card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.85)' }}>
          📸 Your Photos
        </h3>
        <PhotoUpload
          photos={localPhotos}
          onPhotosUpdate={(photos: string[]) => { setLocalPhotos(photos); onUpdateProfile({ ...userProfile, photos }); }}
          session={session}
        />
        {(!localPhotos || localPhotos.length === 0) && (
          <div className="mt-3 rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Had photos before? Try recovering them.</p>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowPhotoRecovery(true)} className="btn-glass px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Recover
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          AI PROFILE REVIEW CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="glass-card p-4 space-y-4" style={{ background: 'linear-gradient(135deg, rgba(217,70,239,0.05), rgba(139,92,246,0.05))', border: '1px solid rgba(217,70,239,0.2)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#d946ef' }}>
            <Sparkles className="w-4 h-4" /> AI Profile Review
          </h3>
        </div>

        {!reviewData && !isReviewing && (
          <div className="text-center space-y-3">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Want to know how to get more matches? Let Sanjog AI review your profile and give you a Roast & Boast!</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateReview} className="w-full btn-glow py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Review My Profile
            </motion.button>
          </div>
        )}

        {isReviewing && (
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <div className="flex gap-2"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Analyzing your vibe...</p>
          </div>
        )}

        {reviewData && !isReviewing && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl space-y-1" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="text-xs font-bold text-green-400 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> The Boast</div>
              <p className="text-sm text-green-100">{reviewData.boast}</p>
            </div>
            <div className="p-3 rounded-xl space-y-1" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> The Roast</div>
              <p className="text-sm text-rose-100">{reviewData.roast}</p>
            </div>
            <div className="p-3 rounded-xl space-y-1" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Top Tip</div>
              <p className="text-sm text-purple-100">{reviewData.tip}</p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateReview} className="w-full py-2 flex items-center justify-center gap-1.5 text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <RefreshCw className="w-3.5 h-3.5" /> Review Again
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          PERSONALITY PROFILE CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.85)' }}>
            <Sparkles className="w-4 h-4" style={{ color: '#d946ef' }} /> Personality Profile
          </h3>
        </div>

        {!isEditing ? (
          userProfile.personality && Object.keys(userProfile.personality).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(userProfile.personality).map(([key, value], i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-xs font-medium capitalize mb-0.5" style={{ color: '#d946ef' }}>{key.replace(/_/g, ' ')}</div>
                  <div className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.65)' }}>{String(value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.25)' }}>
                <Sparkles className="w-6 h-6" style={{ color: '#d946ef' }} />
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Chat with Sanjog AI to discover your personality traits.</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Personality Traits</span>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => { const n = { ...editData }; if (!n.personality) n.personality = {}; n.personality[`trait_${Date.now()}`] = ''; setEditData(n); }}
                className="btn-glass px-2 py-1 rounded-lg text-xs flex items-center gap-1"><Plus className="w-3 h-3" /> Add</motion.button>
            </div>
            {editData.personality && Object.entries(editData.personality).map(([key, value], i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 px-3 py-2 rounded-xl text-xs outline-none" placeholder="Trait"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}
                  value={key.replace(/_/g, ' ')}
                  onChange={e => { const n = { ...editData }; const nk = e.target.value.replace(/ /g, '_'); delete n.personality[key]; n.personality[nk] = value; setEditData(n); }} />
                <input className="flex-1 px-3 py-2 rounded-xl text-xs outline-none" placeholder="Description"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}
                  value={String(value)}
                  onChange={e => { const n = { ...editData }; n.personality[key] = e.target.value; setEditData(n); }} />
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => { const n = { ...editData }; delete n.personality[key]; setEditData(n); }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <X className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                </motion.button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Photo Recovery Modal */}
      <AnimatePresence>
        {showPhotoRecovery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowPhotoRecovery(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="glass-card p-4 w-full max-w-md" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Photo Recovery</h3>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowPhotoRecovery(false)} className="w-8 h-8 rounded-xl flex items-center justify-center btn-glass">
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
              <PhotoRecovery session={session} onPhotosRecovered={(photos: string[]) => { setLocalPhotos(photos); onUpdateProfile({ ...userProfile, photos }); setShowPhotoRecovery(false); }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}