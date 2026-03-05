// Location utilities for geolocation and distance calculations

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timestamp: number;
}

export interface LocationPermissionState {
  status: 'granted' | 'denied' | 'prompt' | 'unknown';
  location?: UserLocation;
  error?: string;
}

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number, 
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

// Format distance for display
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  } else {
    return `${Math.round(distanceKm)} km away`;
  }
}

// Get current position with proper error handling
export function getCurrentPosition(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Try to get city/country info using reverse geocoding
          const locationInfo = await reverseGeocode(latitude, longitude);
          
          resolve({
            latitude,
            longitude,
            city: locationInfo.city,
            country: locationInfo.country,
            timestamp: Date.now()
          });
        } catch (geocodeError) {
          // If reverse geocoding fails, still return the coordinates
          resolve({
            latitude,
            longitude,
            timestamp: Date.now()
          });
        }
      },
      (error) => {
        let errorMessage = 'Unknown location error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      options
    );
  });
}

// Check geolocation permission status
export async function checkLocationPermission(): Promise<PermissionState> {
  if (!navigator.permissions) {
    return 'prompt'; // Assume prompt if permissions API not available
  }
  
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  } catch (error) {
    console.warn('Could not check location permission:', error);
    return 'prompt';
  }
}

// Simple reverse geocoding using a free service
async function reverseGeocode(lat: number, lon: number): Promise<{ city?: string; country?: string }> {
  try {
    // Using OpenStreetMap Nominatim service (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Sanjog Dating App'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    const address = data.address || {};
    
    return {
      city: address.city || address.town || address.village || address.county,
      country: address.country
    };
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return {};
  }
}

// Get stored location from localStorage
export function getStoredLocation(): UserLocation | null {
  try {
    const stored = localStorage.getItem('user_location');
    if (stored) {
      const location = JSON.parse(stored);
      // Check if location is recent (within 24 hours)
      if (Date.now() - location.timestamp < 24 * 60 * 60 * 1000) {
        return location;
      }
    }
  } catch (error) {
    console.warn('Could not retrieve stored location:', error);
  }
  return null;
}

// Store location in localStorage
export function storeLocation(location: UserLocation): void {
  try {
    localStorage.setItem('user_location', JSON.stringify(location));
  } catch (error) {
    console.warn('Could not store location:', error);
  }
}

// Clear stored location
export function clearStoredLocation(): void {
  try {
    localStorage.removeItem('user_location');
  } catch (error) {
    console.warn('Could not clear stored location:', error);
  }
}