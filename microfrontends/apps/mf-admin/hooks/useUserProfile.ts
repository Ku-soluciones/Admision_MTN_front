/**
 * User Profile Hook - Gateway Integration
 * Manages user profile data with the new gateway service
 */

import { useState, useEffect, useCallback } from 'react';
import profileService, { type UserProfile, type UpdateProfileRequest } from '../services/profileService';
import { useAuth } from '../context/AuthContext';

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  updatePreferences: (preferences: UserProfile['preferences']) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<void>;
  getActivityLog: (params?: { from?: string; to?: string; limit?: number }) => Promise<any[]>;
  getSessions: () => Promise<any[]>;
  revokeSession: (sessionId: string) => Promise<void>;
}

export const useUserProfile = (): UseUserProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get profile with roles from JWT token
      const userProfile = await profileService.getCurrentUser();
      setProfile(userProfile);
      
      console.log('✅ Profile loaded from gateway:', {
        id: userProfile.id,
        role: userProfile.role,
        permissions: userProfile.permissions?.length || 0
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
      console.error('❌ Profile loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedProfile = await profileService.updateProfile(data);
      setProfile(updatedProfile);
      
      console.log('✅ Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      console.error('❌ Profile update error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (preferences: UserProfile['preferences']) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedProfile = await profileService.updatePreferences(preferences);
      setProfile(updatedProfile);
      
      console.log('✅ Preferences updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences');
      console.error('❌ Preferences update error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await profileService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword: newPassword
      });
      
      console.log('✅ Password changed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
      console.error('❌ Password change error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadProfilePicture = useCallback(async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await profileService.uploadProfilePicture(file);
      
      // Refresh profile to get updated picture URL
      await refreshProfile();
      
      console.log('✅ Profile picture uploaded successfully:', result.profilePictureUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture');
      console.error('❌ Profile picture upload error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshProfile]);

  const getActivityLog = useCallback(async (params?: { from?: string; to?: string; limit?: number }) => {
    try {
      const activityLog = await profileService.getActivityLog(params);
      console.log('📊 Activity log retrieved:', activityLog.length, 'entries');
      return activityLog;
    } catch (err: any) {
      console.error('❌ Failed to get activity log:', err);
      throw err;
    }
  }, []);

  const getSessions = useCallback(async () => {
    try {
      const sessions = await profileService.getSessions();
      console.log('🔐 Active sessions retrieved:', sessions.length);
      return sessions;
    } catch (err: any) {
      console.error('❌ Failed to get sessions:', err);
      throw err;
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    try {
      await profileService.revokeSession(sessionId);
      console.log('✅ Session revoked successfully:', sessionId);
    } catch (err: any) {
      console.error('❌ Failed to revoke session:', err);
      throw err;
    }
  }, []);

  // Load profile on mount and auth changes
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Auto-refresh profile every 5 minutes if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshProfile();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
    updatePreferences,
    changePassword,
    uploadProfilePicture,
    getActivityLog,
    getSessions,
    revokeSession
  };
};

export default useUserProfile;