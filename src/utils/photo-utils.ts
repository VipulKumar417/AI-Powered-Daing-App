import { projectId, publicAnonKey } from './supabase/info';

// Cache for photo URLs to avoid repeated requests
const photoUrlCache: Record<string, string> = {};

export async function getPhotoUrl(fileName: string): Promise<string | null> {
  // Check cache first
  if (photoUrlCache[fileName]) {
    return photoUrlCache[fileName];
  }

  try {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4644327c/photo/${fileName}`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.url) {
        // Cache the URL
        photoUrlCache[fileName] = data.url;
        return data.url;
      }
    }
  } catch (error) {
    console.error('Failed to get photo URL:', error);
  }

  return null;
}

export async function getPhotoUrls(fileNames: string[]): Promise<string[]> {
  const urls: string[] = [];
  
  for (const fileName of fileNames) {
    const url = await getPhotoUrl(fileName);
    if (url) {
      urls.push(url);
    }
  }
  
  return urls;
}

export function clearPhotoCache() {
  Object.keys(photoUrlCache).forEach(key => delete photoUrlCache[key]);
}