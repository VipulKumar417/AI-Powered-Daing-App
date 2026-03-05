import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Simple health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Sanjog server is running'
  });
});

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Content-Type"],
    maxAge: 600,
    credentials: false,
  }),
);

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Initialize storage bucket on startup
(async () => {
  try {
    const bucketName = 'make-4644327c-photos';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      console.log('Creating photo storage bucket...');
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: false // Private bucket for user photos
      });

      if (error) {
        console.error('Failed to create bucket:', error);
      } else {
        console.log('Photo storage bucket created successfully');
      }
    } else {
      console.log('Photo storage bucket already exists');
    }
  } catch (error) {
    console.error('Bucket initialization error:', error);
  }
})();

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// User signup endpoint
app.post("/make-server-4644327c/signup", async (c) => {
  try {
    const { email, password, name, age, location, bio, gender, preference } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    let userId: string;

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Auto-confirm since no email server is configured
    });

    if (error) {
      // Handle "User already registered" — confirm email and update password
      if (error.message?.includes('already') || error.message?.includes('exists') || error.message?.includes('unique')) {
        console.log('User already exists, attempting to recover...');
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email === email);
        if (!existingUser) {
          return c.json({ error: 'User lookup failed' }, 400);
        }
        userId = existingUser.id;
        // Confirm email and update password so they can sign in
        await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true,
          password,
          user_metadata: { name },
        });
      } else {
        console.error('Auth signup error:', error);
        return c.json({ error: error.message }, 400);
      }
    } else {
      userId = data.user.id;
    }

    // Create/update user profile in KV store
    let existingProfile = await kv.get(`user:${userId}`);
    if (!existingProfile) {
      const userProfile = {
        id: userId,
        email,
        name,
        age: age || null,
        location: location || '',
        bio: bio || '',
        gender: gender || '',
        preference: preference || 'all',
        photos: [],
        profileComplete: false,
        aiAnalysisComplete: false,
        conversationDepth: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await kv.set(`user:${userId}`, userProfile);
    }

    return c.json({
      success: true,
      message: 'User created successfully',
      userId
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user profile endpoint
app.get("/make-server-4644327c/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Load chat history
    const chatData = await kv.get(`chat:${user.id}`);
    const chatHistory = chatData?.chatHistory || [];

    return c.json({
      profile: userProfile,
      chatHistory,
      success: true
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user profile endpoint
app.put("/make-server-4644327c/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const updates = await c.req.json();
    let userProfile = await kv.get(`user:${user.id}`);

    // If profile doesn't exist, create a new one with any provided data
    if (!userProfile) {
      console.log(`Creating new profile for user ${user.id}`);
      userProfile = {
        id: user.id,
        email: user.email,
        name: user.email?.split('@')[0] || 'User',
        photos: updates.photos || [], // Preserve any photos being uploaded
        profileComplete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updates // Include all provided data
      };

      // Save the new profile and return it
      await kv.set(`user:${user.id}`, userProfile);
      return c.json({
        success: true,
        message: 'Profile created successfully',
        profile: userProfile
      });
    }

    // Check if photos count changed to update profileComplete status
    let profileComplete = userProfile.profileComplete;
    if (updates.photos && Array.isArray(updates.photos)) {
      profileComplete = updates.photos.length >= 3;
    }

    const updatedProfile = {
      ...userProfile,
      ...updates,
      profileComplete,
      updated_at: new Date().toISOString()
    };

    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Upload photos endpoint
app.post("/make-server-4644327c/upload-photos", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { photos } = await c.req.json();

    if (!photos || !Array.isArray(photos)) {
      return c.json({ error: 'Invalid photos data' }, 400);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const updatedProfile = {
      ...userProfile,
      photos,
      profileComplete: photos.length >= 3,
      updated_at: new Date().toISOString()
    };

    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({
      success: true,
      message: 'Photos uploaded successfully',
      profileComplete: updatedProfile.profileComplete
    });
  } catch (error) {
    console.error('Upload photos error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get matches for discovery
app.get("/make-server-4644327c/matches", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allUsers = await kv.getByPrefix('user:');
    const currentUser = allUsers.find(u => u.id === user.id);

    if (!currentUser) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Check if user needs personality analysis (AI conversation)
    if (!currentUser.aiAnalysisComplete && (currentUser.conversationDepth || 0) < 8) {
      return c.json({
        needsPersonalityAssessment: true,
        conversationDepth: currentUser.conversationDepth || 0,
        matches: []
      });
    }

    // Auto-cleanup broken photo references for all users when loading matches
    let cleanupPromises = [];
    for (const user of allUsers) {
      if (user && user.photos && user.photos.length > 0) {
        // Check for obvious broken photo references (non-URL strings that look like filenames)
        const suspiciousPictures = user.photos.filter(photo =>
          typeof photo === 'string' &&
          !photo.startsWith('http') &&
          !photo.startsWith('data:') &&
          photo.includes('-') &&
          photo.length > 20 // Looks like a UUID filename
        );

        if (suspiciousPictures.length > 0) {
          cleanupPromises.push(
            (async () => {
              const validPhotos = [];
              for (const photo of user.photos) {
                if (photo.startsWith('http') || photo.startsWith('data:')) {
                  validPhotos.push(photo);
                  continue;
                }

                try {
                  const { data: urlData, error: urlError } = await supabase.storage
                    .from('make-4644327c-photos')
                    .createSignedUrl(photo, 60);

                  if (urlData && urlData.signedUrl && !urlError) {
                    validPhotos.push(photo);
                  }
                } catch {
                  // Skip broken photo
                }
              }

              if (validPhotos.length !== user.photos.length) {
                await kv.set(`user:${user.id}`, {
                  ...user,
                  photos: validPhotos,
                  profileComplete: validPhotos.length >= 3,
                  updated_at: new Date().toISOString()
                });
              }
            })()
          );
        }
      }
    }

    // Run cleanup in background (don't wait for it)
    if (cleanupPromises.length > 0) {
      Promise.all(cleanupPromises).catch(error =>
        console.log('Background photo cleanup error:', error)
      );
    }

    // Filter potential matches
    let potentialMatches = allUsers.filter(u =>
      u &&
      u.id !== user.id &&
      u.profileComplete === true
    );

    // If no real users with photos, try to get sample users or create them
    if (potentialMatches.length === 0) {
      // Check if sample users exist
      const sampleUsers = await kv.mget([
        'user:sample-user-1',
        'user:sample-user-2',
        'user:sample-user-3',
        'user:sample-user-4'
      ]);

      const existingSamples = sampleUsers.filter(u => u !== null);

      if (existingSamples.length > 0) {
        // Add compatibility scores to existing samples
        const samplesWithScores = existingSamples.map(sample => ({
          ...sample,
          compatibility: {
            score: Math.floor(Math.random() * 30) + 70, // 70-99% match
            reason: [
              'Shared love for outdoor adventures',
              'Creative minds think alike',
              'Ambitious spirits who love exploring',
              'Peaceful souls seeking balance',
              'Adventurous hearts unite'
            ][Math.floor(Math.random() * 5)]
          }
        }));

        return c.json({ matches: samplesWithScores });
      }

      // Fallback to immediate sample profiles with mock locations
      const fallbackProfiles = [
        {
          id: 'fallback1',
          name: 'Alex',
          age: 26,
          gender: 'non-binary',
          bio: 'Adventure seeker and coffee enthusiast',
          interests: ['Hiking', 'Photography', 'Coffee', 'Music'],
          photos: [
            'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=600&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80'
          ],
          compatibility: { score: 88, reason: 'Shared love for outdoor adventures' },
          distance: Math.random() * 20 + 1, // Random distance between 1-21 km
          location: { city: 'New York', country: 'USA' }
        },
        {
          id: 'fallback2',
          name: 'Jordan',
          age: 28,
          gender: 'female',
          bio: 'Artist by day, stargazer by night',
          interests: ['Art', 'Astronomy', 'Yoga', 'Cooking'],
          photos: [
            'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
            'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80'
          ],
          compatibility: { score: 92, reason: 'Creative minds think alike' },
          distance: Math.random() * 15 + 2, // Random distance between 2-17 km
          location: { city: 'Los Angeles', country: 'USA' }
        },
        {
          id: 'fallback3',
          name: 'Taylor',
          age: 25,
          gender: 'male',
          bio: 'Tech entrepreneur with a passion for travel',
          interests: ['Technology', 'Travel', 'Surfing', 'Reading'],
          photos: [
            'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=600&q=80',
            'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80'
          ],
          compatibility: { score: 85, reason: 'Ambitious spirits who love exploring' },
          distance: Math.random() * 25 + 5, // Random distance between 5-30 km
          location: { city: 'San Francisco', country: 'USA' }
        }
      ];

      return c.json({ matches: fallbackProfiles });
    }

    // Calculate distances and prepare matches
    const processedMatches = potentialMatches.slice(0, 20).map(match => {
      let distance = null;

      // Calculate distance if both users have location
      if (currentUser.location && match.location &&
        currentUser.location.latitude && currentUser.location.longitude &&
        match.location.latitude && match.location.longitude) {
        distance = calculateDistance(
          currentUser.location.latitude,
          currentUser.location.longitude,
          match.location.latitude,
          match.location.longitude
        );
      }

      return {
        ...match,
        photos: match.photos || [],
        distance: distance,
        location: match.location ? {
          city: match.location.city,
          country: match.location.country
        } : null
      };
    });

    // Sort by distance if available, then by compatibility
    processedMatches.sort((a, b) => {
      // First prioritize by distance (closer users first)
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }

      // Then by compatibility score
      const aScore = a.compatibility?.score || 0;
      const bScore = b.compatibility?.score || 0;
      return bScore - aScore;
    });

    return c.json({ matches: processedMatches });
  } catch (error) {
    console.error('Get matches error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get photo URL endpoint
app.get("/make-server-4644327c/photo/:photoId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const photoId = c.req.param('photoId');
    console.log(`Getting photo URL for photoId: ${photoId} (starts with: ${photoId.substring(0, 10)}...)`);

    // If photo ID is a data URL, return it directly
    if (photoId.startsWith('data:')) {
      console.log('Returning data URL directly');
      return c.json({ url: photoId });
    }

    // If photo ID looks like a direct URL, return it
    if (photoId.startsWith('http')) {
      console.log('Returning HTTP URL directly');
      return c.json({ url: photoId });
    }

    // Try to get signed URL from Supabase Storage
    try {
      console.log('Attempting to get signed URL from storage');
      const { data: signedUrl, error: storageError } = await supabase.storage
        .from('make-4644327c-photos')
        .createSignedUrl(photoId, 3600); // 1 hour expiry

      if (signedUrl && !storageError) {
        console.log('Successfully got signed URL from storage');
        return c.json({ url: signedUrl.signedUrl });
      } else {
        console.log('Storage error or no signed URL:', storageError);
      }
    } catch (storageError) {
      console.log('Storage operation failed:', storageError);
    }

    // Fallback to a placeholder
    console.log('Using fallback placeholder image');
    return c.json({
      url: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=600&q=80'
    });
  } catch (error) {
    console.error('Get photo error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Like profile endpoint
app.post("/make-server-4644327c/like-profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { likedUserId } = await c.req.json();

    if (!likedUserId) {
      return c.json({ error: 'Missing likedUserId' }, 400);
    }

    // Store the like
    const likeKey = `like:${user.id}:${likedUserId}`;
    await kv.set(likeKey, {
      likerId: user.id,
      likedUserId,
      timestamp: new Date().toISOString()
    });

    // Check for mutual like (match)
    const reciprocalLikeKey = `like:${likedUserId}:${user.id}`;
    const reciprocalLike = await kv.get(reciprocalLikeKey);

    if (reciprocalLike) {
      // It's a match! Create match record
      const matchKey = `match:${user.id}:${likedUserId}`;
      await kv.set(matchKey, {
        user1: user.id,
        user2: likedUserId,
        timestamp: new Date().toISOString(),
        conversationStarted: false
      });

      return c.json({
        success: true,
        isMatch: true,
        message: 'It\'s a match!'
      });
    }

    return c.json({
      success: true,
      isMatch: false,
      message: 'Like sent successfully'
    });
  } catch (error) {
    console.error('Like profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Start conversation endpoint
app.post("/make-server-4644327c/start-conversation", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { matchId } = await c.req.json();

    if (!matchId) {
      return c.json({ error: 'Missing matchId' }, 400);
    }

    // Check if match exists
    const matchKey1 = `match:${user.id}:${matchId}`;
    const matchKey2 = `match:${matchId}:${user.id}`;

    let matchRecord = await kv.get(matchKey1);
    if (!matchRecord) {
      matchRecord = await kv.get(matchKey2);
    }

    if (!matchRecord) {
      return c.json({ error: 'No match found' }, 404);
    }

    // Create conversation
    const conversationId = `${Date.now()}-${user.id}-${matchId}`;
    const conversationKey = `conversation:${conversationId}`;

    await kv.set(conversationKey, {
      id: conversationId,
      participants: [user.id, matchId],
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Update match record
    const updatedMatch = {
      ...matchRecord,
      conversationStarted: true,
      conversationId,
      updated_at: new Date().toISOString()
    };

    await kv.set(matchRecord.user1 === user.id ? matchKey1 : matchKey2, updatedMatch);

    return c.json({
      success: true,
      conversationId,
      message: 'Conversation started successfully'
    });
  } catch (error) {
    console.error('Start conversation error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Upload single photo endpoint
app.post("/make-server-4644327c/upload-photo", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return c.json({ error: 'No photo provided' }, 400);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('make-4644327c-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return c.json({ error: `Storage error: ${uploadError.message}` }, 500);
      } else {
        // Storage upload successful
        const userProfile = await kv.get(`user:${user.id}`);
        if (userProfile) {
          const updatedPhotos = [...(userProfile.photos || []), fileName];
          const updatedProfile = {
            ...userProfile,
            photos: updatedPhotos,
            profileComplete: updatedPhotos.length >= 3,
            updated_at: new Date().toISOString()
          };
          await kv.set(`user:${user.id}`, updatedProfile);

          return c.json({
            success: true,
            fileName,
            message: 'Photo uploaded successfully'
          });
        }
      }
    } catch (storageError) {
      console.error('Storage operation failed:', storageError);
      return c.json({ error: 'Failed to store photo' }, 500);
    }

    return c.json({ error: 'Failed to update user profile' }, 500);
  } catch (error) {
    console.error('Upload photo error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete photo endpoint
app.delete("/make-server-4644327c/photo/:photoId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const photoId = c.req.param('photoId');

    // Remove from user profile
    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile && userProfile.photos) {
      const updatedPhotos = userProfile.photos.filter((photo: string) => photo !== photoId);
      const updatedProfile = {
        ...userProfile,
        photos: updatedPhotos,
        profileComplete: updatedPhotos.length >= 3,
        updated_at: new Date().toISOString()
      };
      await kv.set(`user:${user.id}`, updatedProfile);

      // Try to delete from storage if it's not a data URL
      if (!photoId.startsWith('data:')) {
        try {
          await supabase.storage
            .from('make-4644327c-photos')
            .remove([photoId]);
        } catch (storageError) {
          console.log('Storage delete failed (non-critical):', storageError);
        }
      }

      return c.json({ success: true, message: 'Photo deleted successfully' });
    }

    return c.json({ error: 'Photo not found' }, 404);
  } catch (error) {
    console.error('Delete photo error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Debug photos endpoint
app.get("/make-server-4644327c/debug-photos", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);

    return c.json({
      photos: userProfile?.photos || [],
      count: userProfile?.photos?.length || 0,
      profileComplete: userProfile?.profileComplete || false
    });
  } catch (error) {
    console.error('Debug photos error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Debug profile endpoint - check what's stored for current user
app.get("/make-server-4644327c/debug-profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    const allUsers = await kv.getByPrefix('user:');

    return c.json({
      success: true,
      currentProfile: userProfile,
      userId: user.id,
      allUserIds: allUsers.map(u => ({ id: u.id, email: u.email, photos: u.photos?.length || 0 }))
    });
  } catch (error) {
    console.error('Debug profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Restore photos endpoint - attempt to recover photos from storage
app.post("/make-server-4644327c/restore-photos", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // List files in the user's folder in Supabase Storage
    const bucketName = 'make-4644327c-user-photos';
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list(`${user.id}/`, { limit: 10 });

    if (listError) {
      console.error('Error listing files:', listError);
      return c.json({ error: 'Could not access storage' }, 500);
    }

    if (!files || files.length === 0) {
      return c.json({
        success: true,
        message: 'No photos found in storage',
        foundPhotos: []
      });
    }

    // Get the current profile
    let userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Add found photos to profile
    const existingPhotos = userProfile.photos || [];
    const foundPhotos = files
      .filter(file => file.name && file.name !== '.emptyFolderPlaceholder')
      .map(file => `${user.id}/${file.name}`);

    // Merge with existing photos (avoid duplicates)
    const allPhotos = [...new Set([...existingPhotos, ...foundPhotos])];

    // Update profile with recovered photos
    const updatedProfile = {
      ...userProfile,
      photos: allPhotos,
      profileComplete: allPhotos.length >= 3,
      updated_at: new Date().toISOString()
    };

    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({
      success: true,
      message: `Restored ${foundPhotos.length} photos`,
      foundPhotos,
      totalPhotos: allPhotos.length,
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Restore photos error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Clear photos endpoint
app.post("/make-server-4644327c/debug-clear-photos", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile) {
      const updatedProfile = {
        ...userProfile,
        photos: [],
        profileComplete: false,
        updated_at: new Date().toISOString()
      };
      await kv.set(`user:${user.id}`, updatedProfile);

      return c.json({ success: true, message: 'Photos cleared successfully' });
    }

    return c.json({ error: 'User profile not found' }, 404);
  } catch (error) {
    console.error('Clear photos error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create sample users for demo
app.post("/make-server-4644327c/create-sample-users", async (c) => {
  try {
    const sampleUsers = [
      {
        id: 'sample-user-1',
        email: 'alex@example.com',
        name: 'Alex',
        age: 26,
        gender: 'non-binary',
        preference: 'all',
        bio: 'Adventure seeker and coffee enthusiast. Love hiking, photography, and discovering new coffee shops around the city.',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          city: 'New York',
          country: 'USA',
          lastUpdated: new Date().toISOString()
        },
        interests: ['Hiking', 'Photography', 'Coffee', 'Music', 'Travel'],
        photos: [
          'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=600&q=80',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
          'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80'
        ],
        profileComplete: true,
        aiAnalysisComplete: true,
        conversationDepth: 8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'sample-user-2',
        email: 'jordan@example.com',
        name: 'Jordan',
        age: 28,
        gender: 'female',
        preference: 'all',
        bio: 'Artist by day, stargazer by night. I create digital art and love spending evenings watching the stars.',
        location: {
          latitude: 34.0522,
          longitude: -118.2437,
          city: 'Los Angeles',
          country: 'USA',
          lastUpdated: new Date().toISOString()
        },
        interests: ['Art', 'Astronomy', 'Yoga', 'Cooking', 'Museums'],
        photos: [
          'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
          'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80',
          'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80'
        ],
        profileComplete: true,
        aiAnalysisComplete: true,
        conversationDepth: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'sample-user-3',
        email: 'taylor@example.com',
        name: 'Taylor',
        age: 25,
        gender: 'male',
        preference: 'all',
        bio: 'Tech entrepreneur with a passion for travel. Building the next big thing while exploring the world.',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          city: 'San Francisco',
          country: 'USA',
          lastUpdated: new Date().toISOString()
        },
        interests: ['Technology', 'Travel', 'Surfing', 'Reading', 'Startups'],
        photos: [
          'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=600&q=80',
          'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80',
          'https://images.unsplash.com/photo-1558203728-00f45181dd84?w=600&q=80'
        ],
        profileComplete: true,
        aiAnalysisComplete: true,
        conversationDepth: 12,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'sample-user-4',
        email: 'riley@example.com',
        name: 'Riley',
        age: 24,
        gender: 'female',
        preference: 'all',
        bio: 'Yoga instructor and wellness coach. Helping people find their inner peace and balance.',
        location: {
          latitude: 30.2672,
          longitude: -97.7431,
          city: 'Austin',
          country: 'USA',
          lastUpdated: new Date().toISOString()
        },
        interests: ['Yoga', 'Meditation', 'Healthy Cooking', 'Nature', 'Mindfulness'],
        photos: [
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80',
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80',
          'https://images.unsplash.com/photo-1594751543129-6701ad444259?w=600&q=80'
        ],
        profileComplete: true,
        aiAnalysisComplete: true,
        conversationDepth: 9,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Store sample users
    for (const user of sampleUsers) {
      await kv.set(`user:${user.id}`, user);
    }

    return c.json({
      success: true,
      message: `Created ${sampleUsers.length} sample users`,
      users: sampleUsers.map(u => ({ id: u.id, name: u.name, email: u.email }))
    });
  } catch (error) {
    console.error('Create sample users error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Chat endpoint for AI conversation
app.post("/make-server-4644327c/chat", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { message, chatHistory } = await c.req.json();

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // Get user profile for context
    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Simple AI responses based on conversation flow
    const userMessageCount = chatHistory.filter(m => m.role === 'user').length;
    let aiResponse = '';

    // Personality-driven responses
    if (userMessageCount === 0) {
      aiResponse = `Hi ${userProfile.name}! I'm Cupid, your AI dating coach. I'm excited to help you find meaningful connections! 💕\n\nTo start, tell me what you're looking for in a relationship. Are you seeking something casual, serious, or just exploring?`;
    } else if (userMessageCount === 1) {
      aiResponse = `That's wonderful! I can see you have clear intentions. 😊\n\nNow, let's dive deeper - what activities make you feel most alive and energized? This will help me understand your personality better!`;
    } else if (userMessageCount === 2) {
      aiResponse = `I love your enthusiasm! Those activities tell me a lot about your character. 🌟\n\nHere's something important: What values are absolutely non-negotiable for you in a partner? Think about what makes you feel truly understood and respected.`;
    } else if (userMessageCount === 3) {
      aiResponse = `Your values are so important - they're the foundation of lasting relationships! 💪\n\nLet's talk about lifestyle: Are you more of a homebody who loves cozy nights in, or an adventurer who's always planning the next exciting experience?`;
    } else if (userMessageCount === 4) {
      aiResponse = `Perfect! I'm getting a great sense of your lifestyle preferences. 🏡✈️\n\nNow for something deeper: How do you prefer to communicate when you're stressed or going through challenges? This reveals so much about compatibility!`;
    } else if (userMessageCount === 5) {
      aiResponse = `Your communication style says so much about you! Great relationships thrive on understanding these patterns. 🗣️💕\n\nLet's explore your social energy: Do you recharge by spending time with lots of people, or do you prefer intimate gatherings with close friends?`;
    } else if (userMessageCount === 6) {
      aiResponse = `Fascinating! Social compatibility is so crucial for long-term happiness. 👥✨\n\nOne more deep question: What's your approach to personal growth and learning? Are you someone who loves trying new things, or do you prefer mastering what you already enjoy?`;
    } else if (userMessageCount >= 7) {
      aiResponse = `Wow! I'm getting such a rich picture of who you are! 🎨✨\n\nBased on our conversation, I can see you're someone who values ${['authenticity', 'adventure', 'stability', 'creativity', 'independence', 'connection'][Math.floor(Math.random() * 6)]} and ${['meaningful conversations', 'shared experiences', 'personal space', 'emotional support', 'intellectual stimulation', 'fun adventures'][Math.floor(Math.random() * 6)]}.\n\nYou've shared enough for me to start finding amazing matches for you! 🎯💕 Your Discover feature is now unlocked - you're ready to meet some incredible people who align with your personality and values!`;
    } else {
      // Fallback responses
      const responses = [
        `That's really insightful! Tell me more about what drives your decisions in relationships.`,
        `I can see you're thoughtful about this. What's been your experience with dating so far?`,
        `Interesting perspective! How important is shared humor to you in a relationship?`,
        `That reveals a lot about your character! What role does family play in your ideal relationship?`,
        `Great point! How do you balance independence with being in a committed relationship?`
      ];
      aiResponse = responses[Math.floor(Math.random() * responses.length)];
    }

    // Update conversation depth and AI analysis status
    const conversationDepth = userMessageCount + 1;
    const aiAnalysisComplete = conversationDepth >= 8;

    const updatedProfile = {
      ...userProfile,
      conversationDepth,
      aiAnalysisComplete,
      updated_at: new Date().toISOString()
    };

    await kv.set(`user:${user.id}`, updatedProfile);

    // Update chat history
    const newChatHistory = [
      ...chatHistory,
      { role: 'user', content: message, timestamp: Date.now() },
      { role: 'assistant', content: aiResponse, timestamp: Date.now() + 1 }
    ];

    return c.json({
      chatHistory: newChatHistory,
      conversationDepth,
      aiAnalysisComplete
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Save chat endpoint
app.post("/make-server-4644327c/save-chat", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { chatHistory } = await c.req.json();

    // Store chat history
    await kv.set(`chat:${user.id}`, {
      userId: user.id,
      chatHistory: chatHistory || [],
      updated_at: new Date().toISOString()
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Save chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Reset chat endpoint
app.post("/make-server-4644327c/reset-chat", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Clear chat history
    await kv.set(`chat:${user.id}`, {
      userId: user.id,
      chatHistory: [],
      updated_at: new Date().toISOString()
    });

    // Reset conversation depth and AI analysis
    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile) {
      const updatedProfile = {
        ...userProfile,
        conversationDepth: 0,
        aiAnalysisComplete: false,
        updated_at: new Date().toISOString()
      };
      await kv.set(`user:${user.id}`, updatedProfile);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Reset chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get personality analysis
app.get("/make-server-4644327c/personality", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Generate personality analysis based on conversation depth
    const depth = userProfile.conversationDepth || 0;
    const personality = {
      openness: Math.min(60 + depth * 5, 95),
      conscientiousness: Math.min(50 + depth * 6, 90),
      extraversion: Math.min(45 + depth * 7, 85),
      agreeableness: Math.min(70 + depth * 4, 95),
      neuroticism: Math.max(30 - depth * 3, 5)
    };

    const insights = [
      "You show strong emotional intelligence",
      "Your communication style is thoughtful and engaging",
      "You value meaningful connections over surface-level interactions",
      "You have a balanced approach to independence and partnership",
      "Your values suggest you'd thrive with someone who shares your depth"
    ];

    return c.json({
      personality,
      insights: insights.slice(0, Math.min(depth, 5)),
      conversationDepth: depth,
      aiAnalysisComplete: userProfile.aiAnalysisComplete || false
    });
  } catch (error) {
    console.error('Personality analysis error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Force unlock endpoint (for testing)
app.post("/make-server-4644327c/force-unlock", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Force unlock by setting conversation depth to 8 and analysis complete
    const updatedProfile = {
      ...userProfile,
      conversationDepth: 8,
      aiAnalysisComplete: true,
      updated_at: new Date().toISOString()
    };

    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({
      success: true,
      message: 'Discover feature unlocked for testing'
    });
  } catch (error) {
    console.error('Force unlock error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Fix broken photo references for users
app.post("/make-server-4644327c/fix-broken-photos", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all users and check for broken photo references
    const allUsers = await kv.getByPrefix('user:');
    let fixedCount = 0;

    for (const userProfile of allUsers) {
      if (userProfile && userProfile.photos && userProfile.photos.length > 0) {
        let hasChanges = false;
        const validPhotos = [];

        for (const photo of userProfile.photos) {
          // Skip data URLs and HTTP URLs (they're valid)
          if (photo.startsWith('data:') || photo.startsWith('http')) {
            validPhotos.push(photo);
            continue;
          }

          // Check if file exists by trying to create a signed URL
          try {
            const { data: urlData, error: urlError } = await supabase.storage
              .from('make-4644327c-photos')
              .createSignedUrl(photo, 60);

            if (urlData && urlData.signedUrl && !urlError) {
              validPhotos.push(photo); // File exists, keep it
            } else {
              console.log(`Removing broken photo reference for user ${userProfile.name}: ${photo} (${urlError?.message || 'File not found'})`);
              hasChanges = true;
            }
          } catch (storageError) {
            console.log(`Removing broken photo reference for user ${userProfile.name}: ${photo} (${storageError.message})`);
            hasChanges = true;
          }
        }

        // Update user if we removed broken photos
        if (hasChanges) {
          const updatedProfile = {
            ...userProfile,
            photos: validPhotos,
            profileComplete: validPhotos.length >= 3,
            updated_at: new Date().toISOString()
          };

          await kv.set(`user:${userProfile.id}`, updatedProfile);
          fixedCount++;
          console.log(`Fixed photo references for user: ${userProfile.name}`);
        }
      }
    }

    return c.json({
      success: true,
      message: `Fixed photo references for ${fixedCount} users`,
      fixedCount
    });
  } catch (error) {
    console.error('Fix broken photos error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Debug endpoint to check if user exists by email
app.get("/make-server-4644327c/debug-user/:email", async (c) => {
  try {
    const email = c.req.param('email');

    const allUsers = await kv.getByPrefix('user:');
    const userWithEmail = allUsers.find(user => user && user.email === email);

    if (userWithEmail) {
      return c.json({
        exists: true,
        userId: userWithEmail.id,
        name: userWithEmail.name,
        profileComplete: userWithEmail.profileComplete,
        photosCount: userWithEmail.photos ? userWithEmail.photos.length : 0,
        created: userWithEmail.created_at
      });
    } else {
      return c.json({
        exists: false,
        message: 'User not found in database'
      });
    }
  } catch (error) {
    console.error('Debug user exists error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Extract the actual endpoint (like /signup, /health, /profile)
  const pathParts = url.pathname.split('/').filter(Boolean);
  const endpoint = pathParts.length > 0 ? '/' + pathParts[pathParts.length - 1] : '/';

  // Special case for photo URLs which have ID params like /photo/123-abc.jpg
  if (url.pathname.includes('/photo/')) {
    const photoId = url.pathname.split('/photo/').pop();
    url.pathname = `/make-server-4644327c/photo/${photoId}`;
  } else if (url.pathname.includes('/debug-user/')) {
    const email = url.pathname.split('/debug-user/').pop();
    url.pathname = `/make-server-4644327c/debug-user/${email}`;
  } else {
    // For standard endpoints, attach the expected prefix so Hono router matches
    url.pathname = `/make-server-4644327c${endpoint}`;
  }

  const newReq = new Request(url.toString(), req);
  return await app.fetch(newReq);
});