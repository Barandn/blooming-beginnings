/**
 * MiniKit Provider Component
 * Initializes the MiniKit SDK for World App integration
 *
 * IMPORTANT: This provider MUST wrap the app for World App features to work.
 * Without MiniKit.install(), verification and payments will not function.
 */

import { ReactNode, useEffect, useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

interface MiniKitProviderProps {
  children: ReactNode;
}

export function MiniKitProvider({ children }: MiniKitProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Install MiniKit SDK - this is REQUIRED for World App integration
    // MiniKit.install() sets up the bridge between the mini app and World App
    const initMiniKit = async () => {
      try {
        // Install the MiniKit SDK with App ID
        // App ID is REQUIRED for wallet auth to work properly in World App
        const appId = import.meta.env.VITE_WORLD_APP_ID as string | undefined;
        
        console.log('[MiniKit] Initializing with appId:', appId ? `${appId.slice(0, 10)}...` : 'MISSING');
        
        if (appId) {
          MiniKit.install(appId as `app_${string}`);
          console.log('[MiniKit] SDK installed with App ID');
        } else {
          MiniKit.install();
          console.warn('[MiniKit] WARNING: Missing VITE_WORLD_APP_ID - wallet auth WILL FAIL in World App');
        }

        // Safe check for isInstalled
        const installed = (() => {
          try {
            return MiniKit.isInstalled();
          } catch {
            return false;
          }
        })();
        
        console.log('[MiniKit] isInstalled:', installed);
      } catch (error) {
        console.error('[MiniKit] Failed to install SDK:', error);
      } finally {
        setIsReady(true);
      }
    };

    initMiniKit();
  }, []);

  // Render children immediately - MiniKit initialization is async
  // but we don't need to block rendering
  return <>{children}</>;
}

export default MiniKitProvider;
