import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { X, Camera, Upload, Loader2, Sparkles } from 'lucide-react';

interface PhotoUploadProps {
  photos?: string[];
  onPhotosUpdate?: (photos: string[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
  session?: any;
  // Legacy props for compatibility
  userProfile?: any;
  onProfileUpdate?: (profile: any) => void;
  onComplete?: () => void;
}

export function PhotoUpload({
  photos = [],
  onPhotosUpdate,
  maxPhotos = 6,
  minPhotos = 3,
  session,
  userProfile,
  onProfileUpdate,
  onComplete
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set());
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle both direct photos prop and userProfile.photos
  const photosFromProps = Array.isArray(photos) ? photos : [];
  const photosFromProfile = userProfile?.photos && Array.isArray(userProfile.photos) ? userProfile.photos : [];
  const safePhotos = photosFromProps.length > 0 ? photosFromProps : photosFromProfile;

  // Load photo URLs when photos change — data URLs and http URLs are used directly
  React.useEffect(() => {
    const newUrls: Record<string, string> = {};
    for (const photo of safePhotos) {
      if (!photoUrls[photo]) {
        if (photo.startsWith('data:') || photo.startsWith('http')) {
          newUrls[photo] = photo;
        }
      }
    }
    if (Object.keys(newUrls).length > 0) {
      setPhotoUrls(prev => ({ ...prev, ...newUrls }));
    }
  }, [safePhotos]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    uploadPhoto(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper: read a File as a resized data URL (max 800px wide to save space)
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadPhoto = async (file: File) => {
    if (safePhotos.length >= maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Convert the file to a data URL (resized) — no network call needed
      const dataUrl = await fileToDataUrl(file);

      const updatedPhotos = [...safePhotos, dataUrl];

      // Handle both callback styles
      if (onPhotosUpdate) {
        onPhotosUpdate(updatedPhotos);
      } else if (onProfileUpdate && userProfile) {
        onProfileUpdate({ ...userProfile, photos: updatedPhotos, profileComplete: updatedPhotos.length >= minPhotos });
      }

      // Cache the URL immediately
      setPhotoUrls(prev => ({ ...prev, [dataUrl]: dataUrl }));
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = (photoFileName: string) => {
    const updatedPhotos = safePhotos.filter((photo: string) => photo !== photoFileName);

    // Handle both callback styles
    if (onPhotosUpdate) {
      onPhotosUpdate(updatedPhotos);
    } else if (onProfileUpdate && userProfile) {
      onProfileUpdate({ ...userProfile, photos: updatedPhotos });
    }

    // Remove from URLs cache
    setPhotoUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[photoFileName];
      return newUrls;
    });
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-pink-500" />
          <span className="font-medium">Profile Photos</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm px-2 py-1 rounded-full ${safePhotos.length >= minPhotos
            ? 'bg-green-100 text-green-700'
            : 'bg-orange-100 text-orange-700'
            }`}>
            {safePhotos.length}/{minPhotos} minimum
          </span>
          {safePhotos.length >= minPhotos && (
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Great! Your profile is ready. You can add up to {maxPhotos} photos total.
      </p>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: maxPhotos }).map((_, index) => {
          const photo = safePhotos[index];
          const isLoading = photo && loadingPhotos.has(photo);
          const photoUrl = photo ? photoUrls[photo] : null;

          return (
            <div key={index} className="relative">
              {photo ? (
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                  {isLoading || !photoUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
                      <Camera className="w-8 h-8 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Loading...</span>
                    </div>
                  ) : (
                    <img
                      src={photoUrl}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {index === 0 && (
                    <div className="absolute bottom-2 left-2 bg-black text-white text-xs px-2 py-1 rounded">
                      Main
                    </div>
                  )}
                  <button
                    onClick={() => deletePhoto(photo)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={openFileSelector}
                  disabled={uploading}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-pink-400 hover:bg-pink-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload Guidelines */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1">
          <span>•</span>
          <span>Upload high-quality photos that show your face clearly.</span>
        </div>
        <div className="flex items-center gap-1">
          <span>•</span>
          <span>Accepted formats: JPEG, PNG, WebP (max 5MB each)</span>
        </div>
        <div className="flex items-center gap-1">
          <span>•</span>
          <span>Your first photo will be your main profile picture</span>
        </div>
      </div>




      {/* Continue Button */}
      {safePhotos.length >= minPhotos && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={() => {
              if (onComplete) {
                onComplete();
              } else {
                // Mark profile as complete if using legacy interface
                if (onProfileUpdate && userProfile) {
                  onProfileUpdate({ ...userProfile, profileComplete: true });
                }
              }
            }}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Continue to Sanjog
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Your profile is ready! Start discovering amazing matches.
          </p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}