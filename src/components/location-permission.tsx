import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MapPin, Shield, Users, Heart, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { 
  getCurrentPosition, 
  checkLocationPermission, 
  getStoredLocation, 
  storeLocation,
  clearStoredLocation,
  type UserLocation,
  type LocationPermissionState 
} from '../utils/location';

interface LocationPermissionProps {
  onLocationUpdate: (location: UserLocation | null) => void;
  onSkip?: () => void;
  showSkipOption?: boolean;
}

export function LocationPermission({ onLocationUpdate, onSkip, showSkipOption = true }: LocationPermissionProps) {
  const [permissionState, setPermissionState] = useState<LocationPermissionState>({
    status: 'unknown'
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkCurrentState();
  }, []);

  const checkCurrentState = async () => {
    setChecking(true);
    
    try {
      // First check if we have a stored location
      const storedLocation = getStoredLocation();
      if (storedLocation) {
        setPermissionState({
          status: 'granted',
          location: storedLocation
        });
        onLocationUpdate(storedLocation);
        setChecking(false);
        return;
      }

      // Check permission status
      const status = await checkLocationPermission();
      setPermissionState({ status });
    } catch (error) {
      setPermissionState({
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setChecking(false);
    }
  };

  const requestLocation = async () => {
    setLoading(true);
    setPermissionState(prev => ({ ...prev, error: undefined }));

    try {
      const location = await getCurrentPosition();
      
      // Store location
      storeLocation(location);
      
      setPermissionState({
        status: 'granted',
        location
      });
      
      onLocationUpdate(location);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      
      setPermissionState({
        status: error.message.includes('denied') ? 'denied' : 'unknown',
        error: errorMessage
      });
      
      onLocationUpdate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    clearStoredLocation();
    checkCurrentState();
  };

  const handleSkip = () => {
    onLocationUpdate(null);
    if (onSkip) onSkip();
  };

  if (checking) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="text-center py-8">
          <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking location settings...</p>
        </CardContent>
      </Card>
    );
  }

  // If location is already granted and we have it
  if (permissionState.status === 'granted' && permissionState.location) {
    return (
      <Card className="max-w-md mx-auto border-green-200">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Location Access Granted</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">
              {permissionState.location.city 
                ? `${permissionState.location.city}${permissionState.location.country ? `, ${permissionState.location.country}` : ''}`
                : 'Location detected'
              }
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            We'll show you people nearby and display distances accurately
          </p>
          <Button onClick={handleRetry} variant="outline" size="sm">
            Update Location
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-pink-600" />
        </div>
        <CardTitle className="gradient-text">Enable Location Access</CardTitle>
        <p className="text-sm text-muted-foreground">
          Help us find perfect matches near you
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Benefits */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Discover Nearby Matches</p>
              <p className="text-xs text-muted-foreground">Find people in your area</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Accurate Distances</p>
              <p className="text-xs text-muted-foreground">See exact distance to matches</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Privacy Protected</p>
              <p className="text-xs text-muted-foreground">Location stored securely on device</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {permissionState.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">{permissionState.error}</p>
            </div>
            
            {permissionState.status === 'denied' && (
              <div className="mt-2 text-xs text-red-600">
                <p>To enable location:</p>
                <p>1. Click the location icon in your browser's address bar</p>
                <p>2. Select "Allow" for location access</p>
                <p>3. Refresh this page</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          <Button 
            onClick={requestLocation}
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Getting Location...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Enable Location
              </>
            )}
          </Button>
          
          {showSkipOption && (
            <Button 
              onClick={handleSkip}
              variant="outline" 
              className="w-full"
              disabled={loading}
            >
              Skip for Now
            </Button>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {permissionState.status === 'denied' 
              ? 'Location access was denied. You can still use the app, but distances won\'t be accurate.'
              : 'Your exact location is never shared with other users.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}