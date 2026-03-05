import { getSupabaseClient } from './supabase/client';

const supabase = getSupabaseClient();

export interface SessionInfo {
  session: any;
  isValid: boolean;
  needsRefresh: boolean;
}

export async function validateAndRefreshSession(currentSession: any): Promise<SessionInfo> {
  if (!currentSession) {
    return { session: null, isValid: false, needsRefresh: false };
  }

  const now = Date.now() / 1000;
  const expiresAt = currentSession.expires_at;
  
  // Check if token is expired or expires soon (within 2 minutes)
  if (expiresAt && expiresAt < now + 120) {
    console.log('Token expired or expiring soon, refreshing...');
    
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        return { session: currentSession, isValid: false, needsRefresh: true };
      }
      
      if (newSession) {
        console.log('Session refreshed successfully');
        return { session: newSession, isValid: true, needsRefresh: false };
      }
    } catch (refreshError) {
      console.error('Session refresh error:', refreshError);
      return { session: currentSession, isValid: false, needsRefresh: true };
    }
  }
  
  // Session is still valid
  return { session: currentSession, isValid: true, needsRefresh: false };
}

export async function makeAuthenticatedRequest(
  url: string, 
  options: RequestInit = {}, 
  session: any
): Promise<Response> {
  // Check network connectivity first
  if (!navigator.onLine) {
    throw new Error('Device is offline');
  }

  const { session: validSession, isValid } = await validateAndRefreshSession(session);
  
  if (!isValid || !validSession) {
    throw new Error('Unable to authenticate request - session invalid');
  }
  
  // Prepare headers - only set Content-Type if it's not FormData
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${validSession.access_token}`,
    ...options.headers
  };
  
  // Don't set Content-Type for FormData - let browser set it with boundary
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // If still unauthorized after token refresh, the session is truly invalid
    if (response.status === 401) {
      console.warn('Request still unauthorized after token validation');
      // Could trigger a re-login flow here
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Convert fetch errors to more readable messages
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error - please check your internet connection');
    }
    
    throw error;
  }
}

export default {
  validateAndRefreshSession,
  makeAuthenticatedRequest
};