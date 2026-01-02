/**
 * Profile Hook
 * Fetches and caches user profile data including token balance
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserProfile, isAuthenticated, type UserProfileResponse } from '@/lib/minikit/api';

interface UseProfileResult {
  profile: UserProfileResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated()) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getUserProfile();

      if (result.status === 'success' && result.data) {
        setProfile(result.data);
      } else {
        setError(result.error || 'Failed to fetch profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and when auth changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
  };
}

export default useProfile;
