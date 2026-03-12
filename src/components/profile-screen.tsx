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

/* ─── Light Theme Helpers ─── */
function GlassInput({ icon: Icon, ...props }: any) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sanjog-text-secondary)' }} />
      )}
      <input
        {...props}
        className={`w-full px-4 py-2.5 rounded-xl text-[15px] outline-none transition-all duration-200
          focus:ring-2 focus:ring-pink-500/20 bg-gray-50 border border-gray-200 ${Icon ? 'pl-10' : ''} ${props.className || ''}`}
        style={{
          color: 'var(--sanjog-text-primary)',
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
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--sanjog-text-secondary)' }} />
      )}
      <select
        {...props}
        className={`w-full px-4 py-2.5 rounded-xl text-[15px] outline-none appearance-none cursor-pointer
          focus:ring-2 focus:ring-pink-500/20 bg-gray-50 border border-gray-200 ${Icon ? 'pl-10' : ''}`}
        style={{
          color: 'var(--sanjog-text-primary)',
        }}
      >
        {children}
      </select>
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none" style={{ color: 'var(--sanjog-text-tertiary)' }} />
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
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--sanjog-text-primary)' }}>Your Profile</h2>
          {!userProfile.profileComplete && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#D97706' }}>Incomplete</span>
          )}
        </div>
        {!isEditing ? (
          <motion.button whileTap={{ scale: 0.92 }} onClick={startEditing} className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200">
            <Edit className="w-3.5 h-3.5" /> Edit
          </motion.button>
        ) : (
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.92 }} onClick={saveProfile} className="btn-glow px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-white">
              <Save className="w-3.5 h-3.5" /> Save
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={cancelEditing} className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200">
              <X className="w-3.5 h-3.5" /> Cancel
            </motion.button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          HERO CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold bg-gray-100 text-gray-400 border-2 border-transparent relative">
              <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f43f5e, #d946ef)', zIndex: -1, margin: '-2px' }} />
              <div className="w-full h-full rounded-2xl flex items-center justify-center text-3xl font-bold bg-white text-gray-600 relative z-10">
                <span>{userProfile.name?.charAt(0) || '?'}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {!isEditing ? (
              <>
                <h3 className="text-xl font-bold mb-0.5 text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{userProfile.name || 'Your Name'}</h3>
                <p className="text-sm mb-2 text-gray-500 font-medium">{userProfile.email || session?.user?.email}</p>
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
                  {userProfile.age && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">🎂 {userProfile.age}</span>}
                  {userProfile.gender && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 capitalize">{userProfile.gender}</span>}
                  {userProfile.height && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">📏 {userProfile.height}</span>}
                  {userProfile.city && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">📍 {userProfile.city}</span>}
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
            <div key={label} className="rounded-xl p-3 text-center bg-gray-50 border border-gray-100">
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
              <div className="text-base font-bold" style={{ color }}>{value}</div>
              <div className="text-xs font-medium text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Profile completion */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-gray-500">Profile Completion</span>
            <span style={{ color: '#d946ef' }}>{getCompletion()}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${getCompletion()}%`, background: 'linear-gradient(90deg, #f43f5e, #d946ef)' }} />
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════
          BIO CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          ✍️ About Me
        </h3>
        {!isEditing ? (
          userProfile.bio ? (
            <p className="text-sm leading-relaxed text-gray-600 font-medium">{userProfile.bio}</p>
          ) : (
            <p className="text-sm italic text-gray-400 font-medium">No bio yet — tap Edit to add one!</p>
          )
        ) : (
          <div className="space-y-1">
            <textarea
              value={editData.bio || ''}
              onChange={e => setEditData({ ...editData, bio: e.target.value })}
              placeholder="What makes you unique? Write a few lines…"
              rows={4}
              maxLength={300}
              className="w-full px-4 py-3 rounded-xl text-[15px] outline-none resize-none focus:ring-2 focus:ring-pink-500/20 bg-gray-50 border border-gray-200 text-gray-900 font-medium"
              style={{ caretColor: '#d946ef' }}
            />
            <p className="text-right text-xs font-semibold text-gray-400">{(editData.bio || '').length}/300</p>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          WORK & EDUCATION CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          💼 Work & Education
        </h3>
        {!isEditing ? (
          (userProfile.education || userProfile.jobTitle || userProfile.company) ? (
            <div className="space-y-2">
              {userProfile.education && (
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 flex-shrink-0" style={{ color: '#8b5cf6' }} />
                  <span className="text-[15px] font-medium text-gray-700">{userProfile.education}</span>
                </div>
              )}
              {(userProfile.jobTitle || userProfile.company) && (
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 flex-shrink-0" style={{ color: '#d946ef' }} />
                  <span className="text-[15px] font-medium text-gray-700">
                    {[userProfile.jobTitle, userProfile.company].filter(Boolean).join(' at ')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm italic text-gray-400 font-medium">No work/education info — tap Edit to add!</p>
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          ✨ Interests
          {!isEditing && userProfile.interests?.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
              {userProfile.interests.length}
            </span>
          )}
        </h3>
        {!isEditing ? (
          userProfile.interests?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {userProfile.interests.map((interest: string) => (
                <span key={interest} className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-pink-50 text-pink-600 border border-pink-100">
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-gray-400 font-medium">No interests selected — tap Edit to pick some!</p>
          )
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map(interest => {
                const active = (editData.interests || []).includes(interest);
                return (
                  <motion.button key={interest} whileTap={{ scale: 0.92 }}
                    onClick={() => handleInterestToggle(interest)}
                    className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border"
                    style={{
                      background: active ? '#fdf2f8' : '#f9fafb',
                      borderColor: active ? '#fbcfe8' : '#f3f4f6',
                      color: active ? '#db2777' : '#6b7280',
                    }}
                  >
                    {interest}
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs font-semibold text-gray-400">
              {(editData.interests || []).length} selected {(editData.interests || []).length < 3 && '(min 3)'}
            </p>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          DATING PREFERENCES CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          💞 Dating Preferences
        </h3>
        {!isEditing ? (
          (userProfile.interestedIn || userProfile.ageRangeMin || userProfile.distancePref) ? (
            <div className="grid grid-cols-3 gap-2">
              {userProfile.interestedIn && (
                <div className="rounded-xl p-3 text-center bg-gray-50 border border-gray-100">
                  <div className="text-xs font-semibold mb-1" style={{ color: '#f43f5e' }}>Interested In</div>
                  <div className="text-[15px] font-medium text-gray-700 capitalize">
                    {userProfile.interestedIn === 'male' ? 'Men' : userProfile.interestedIn === 'female' ? 'Women' : 'Everyone'}
                  </div>
                </div>
              )}
              {(userProfile.ageRangeMin || userProfile.ageRangeMax) && (
                <div className="rounded-xl p-3 text-center bg-gray-50 border border-gray-100">
                  <div className="text-xs font-semibold mb-1" style={{ color: '#d946ef' }}>Age Range</div>
                  <div className="text-[15px] font-medium text-gray-700">{userProfile.ageRangeMin || '18'} – {userProfile.ageRangeMax || '35'}</div>
                </div>
              )}
              {userProfile.distancePref && (
                <div className="rounded-xl p-3 text-center bg-gray-50 border border-gray-100">
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8b5cf6' }}>Distance</div>
                  <div className="text-[15px] font-medium text-gray-700">{userProfile.distancePref} km</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm italic text-gray-400 font-medium">No preferences set — tap Edit to configure!</p>
          )
        ) : (
          <div className="space-y-4">
            {/* Interested In */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Interested In</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: 'male', l: 'Men' }, { v: 'female', l: 'Women' }, { v: 'everyone', l: 'Everyone' }].map(opt => (
                  <motion.button key={opt.v} whileTap={{ scale: 0.95 }}
                    onClick={() => setEditData({ ...editData, interestedIn: opt.v })}
                    className="py-2.5 rounded-xl text-sm font-semibold text-center transition-all border"
                    style={{
                      background: editData.interestedIn === opt.v ? '#fdf2f8' : '#f9fafb',
                      borderColor: editData.interestedIn === opt.v ? '#fbcfe8' : '#e5e7eb',
                      color: editData.interestedIn === opt.v ? '#db2777' : '#6b7280',
                    }}
                  >{opt.l}</motion.button>
                ))}
              </div>
            </div>
            {/* Age Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">
                Age Range: {editData.ageRangeMin || '18'} – {editData.ageRangeMax || '35'}
              </label>
              <div className="flex gap-3 items-center">
                <input type="range" min="18" max="60" value={editData.ageRangeMin || '18'}
                  onChange={e => setEditData({ ...editData, ageRangeMin: e.target.value })}
                  className="flex-1 accent-pink-500" />
                <span className="text-xs font-medium text-gray-400">to</span>
                <input type="range" min="18" max="60" value={editData.ageRangeMax || '35'}
                  onChange={e => setEditData({ ...editData, ageRangeMax: e.target.value })}
                  className="flex-1 accent-purple-500" />
              </div>
            </div>
            {/* Distance */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          📸 Your Photos
        </h3>
        <PhotoUpload
          photos={localPhotos}
          onPhotosUpdate={(photos: string[]) => { setLocalPhotos(photos); onUpdateProfile({ ...userProfile, photos }); }}
          session={session}
        />
        {(!localPhotos || localPhotos.length === 0) && (
          <div className="mt-3 rounded-xl p-3 flex items-center justify-between" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <p className="text-xs font-semibold text-amber-700">Had photos before? Try recovering them.</p>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowPhotoRecovery(true)} className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 bg-amber-100 text-amber-800">
              <RefreshCw className="w-3 h-3" /> Recover
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          AI PROFILE REVIEW CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="bg-purple-50 rounded-2xl border border-purple-100 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2 text-purple-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Sparkles className="w-4 h-4" /> AI Profile Review
          </h3>
        </div>

        {!reviewData && !isReviewing && (
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold text-purple-900/60">Want to know how to get more matches? Let Sanjog AI review your profile and give you a Roast & Boast!</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateReview} className="w-full btn-glow py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white">
              <Sparkles className="w-4 h-4" /> Review My Profile
            </motion.button>
          </div>
        )}

        {isReviewing && (
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <div className="flex gap-2"><span className="typing-dot bg-purple-500" /><span className="typing-dot bg-purple-500" /><span className="typing-dot bg-purple-500" /></div>
            <p className="text-xs font-semibold text-purple-400">Analyzing your vibe...</p>
          </div>
        )}

        {reviewData && !isReviewing && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl space-y-1 bg-green-50 border border-green-100">
              <div className="text-xs font-bold text-green-600 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> The Boast</div>
              <p className="text-[14px] font-medium text-green-800">{reviewData.boast}</p>
            </div>
            <div className="p-3 rounded-xl space-y-1 bg-rose-50 border border-rose-100">
              <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> The Roast</div>
              <p className="text-[14px] font-medium text-rose-800">{reviewData.roast}</p>
            </div>
            <div className="p-3 rounded-xl space-y-1 bg-purple-50 border border-purple-100">
              <div className="text-xs font-bold text-purple-600 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Top Tip</div>
              <p className="text-[14px] font-medium text-purple-800">{reviewData.tip}</p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleGenerateReview} className="w-full py-2 flex items-center justify-center gap-1.5 text-xs mt-2 font-semibold text-purple-500">
              <RefreshCw className="w-3.5 h-3.5" /> Review Again
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════
          PERSONALITY PROFILE CARD
         ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Sparkles className="w-4 h-4" style={{ color: '#d946ef' }} /> Personality Profile
          </h3>
        </div>

        {!isEditing ? (
          userProfile.personality && Object.keys(userProfile.personality).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(userProfile.personality).map(([key, value], i) => (
                <div key={i} className="rounded-xl p-3 bg-gray-50 border border-gray-100">
                  <div className="text-xs font-semibold capitalize mb-0.5" style={{ color: '#d946ef' }}>{key.replace(/_/g, ' ')}</div>
                  <div className="text-[13px] font-medium capitalize text-gray-700">{String(value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-fuchsia-50 border border-fuchsia-100">
                <Sparkles className="w-6 h-6" style={{ color: '#d946ef' }} />
              </div>
              <p className="text-sm font-medium text-gray-500">Chat with Sanjog AI to discover your personality traits.</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">Personality Traits</span>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => { const n = { ...editData }; if (!n.personality) n.personality = {}; n.personality[`trait_${Date.now()}`] = ''; setEditData(n); }}
                className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200"><Plus className="w-3 h-3" /> Add</motion.button>
            </div>
            {editData.personality && Object.entries(editData.personality).map(([key, value], i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 px-3 py-2 rounded-xl text-xs outline-none bg-gray-50 border border-gray-200 text-gray-900 font-medium" placeholder="Trait"
                  value={key.replace(/_/g, ' ')}
                  onChange={e => { const n = { ...editData }; const nk = e.target.value.replace(/ /g, '_'); delete n.personality[key]; n.personality[nk] = value; setEditData(n); }} />
                <input className="flex-1 px-3 py-2 rounded-xl text-xs outline-none bg-gray-50 border border-gray-200 text-gray-900 font-medium" placeholder="Description"
                  value={String(value)}
                  onChange={e => { const n = { ...editData }; n.personality[key] = e.target.value; setEditData(n); }} />
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => { const n = { ...editData }; delete n.personality[key]; setEditData(n); }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 border border-red-100">
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
            className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPhotoRecovery(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-full max-w-2xl" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Photo Recovery</h3>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowPhotoRecovery(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200">
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
              <PhotoRecovery session={session} onPhotosRecovered={(photos: string[]) => { setLocalPhotos(photos); onUpdateProfile({ ...userProfile, photos }); setShowPhotoRecovery(false); }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}