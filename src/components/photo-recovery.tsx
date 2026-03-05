import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { RefreshCw, Search, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { makeAuthenticatedRequest } from '../utils/session-helper';

interface PhotoRecoveryProps {
  session: any;
  onPhotosRecovered?: (photos: string[]) => void;
}

export function PhotoRecovery({ session, onPhotosRecovered }: PhotoRecoveryProps) {
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [recoveryResult, setRecoveryResult] = useState<any>(null);

  const checkProfile = async () => {
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(
        `https://${projectId}.supabase.co/functions/v1/make-server-4644327c/debug-profile`,
        { method: 'GET' },
        session
      );

      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data);
      } else {
        throw new Error('Failed to check profile');
      }
    } catch (error) {
      console.error('Profile check error:', error);
      alert('Failed to check profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const restorePhotos = async () => {
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(
        `https://${projectId}.supabase.co/functions/v1/make-server-4644327c/restore-photos`,
        { method: 'POST' },
        session
      );

      if (response.ok) {
        const data = await response.json();
        setRecoveryResult(data);
        
        if (data.foundPhotos && data.foundPhotos.length > 0 && onPhotosRecovered) {
          onPhotosRecovered(data.profile?.photos || []);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore photos');
      }
    } catch (error) {
      console.error('Photo recovery error:', error);
      alert('Failed to restore photos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle>Photo Recovery</CardTitle>
        <p className="text-sm text-muted-foreground">
          Try to recover your missing photos
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Button 
            onClick={checkProfile}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Check Profile Status
              </>
            )}
          </Button>

          <Button 
            onClick={restorePhotos}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Attempt Photo Recovery
              </>
            )}
          </Button>
        </div>

        {debugInfo && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <h4 className="font-medium mb-2">Profile Status:</h4>
            <div className="space-y-1">
              <p>User ID: {debugInfo.userId}</p>
              <p>Photos in Profile: {debugInfo.currentProfile?.photos?.length || 0}</p>
              <p>Profile Complete: {debugInfo.currentProfile?.profileComplete ? 'Yes' : 'No'}</p>
              {debugInfo.currentProfile?.photos?.length > 0 && (
                <div>
                  <p>Photo files:</p>
                  <ul className="text-xs text-gray-600 ml-2">
                    {debugInfo.currentProfile.photos.slice(0, 3).map((photo: string, idx: number) => (
                      <li key={idx}>• {photo.substring(0, 30)}...</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {recoveryResult && (
          <div className={`rounded-lg p-3 text-sm ${
            recoveryResult.foundPhotos?.length > 0 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-orange-50 border border-orange-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {recoveryResult.foundPhotos?.length > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-600" />
              )}
              <h4 className="font-medium">Recovery Result</h4>
            </div>
            <p>{recoveryResult.message}</p>
            {recoveryResult.foundPhotos?.length > 0 && (
              <p className="text-xs mt-1">
                Total photos now: {recoveryResult.totalPhotos}
              </p>
            )}
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            This tool attempts to find and restore photos that may have been disconnected from your profile.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}