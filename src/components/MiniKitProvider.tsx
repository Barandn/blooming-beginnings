/**
 * MiniKit Provider Component
 * Initializes the MiniKit SDK for World App integration
 *
 * IMPORTANT: This provider MUST wrap the app for World App features to work.
 * Without MiniKit.install(), verification and payments will not function.
 */

import { ReactNode, useEffect, useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { WORLD_APP_ID } from '@/config/worldApp';

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
        // Install the MiniKit SDK with App ID (required for Wallet Auth)
        const { success } = MiniKit.install(WORLD_APP_ID);
        console.log('[MiniKit] install success:', success, 'appId:', `${WORLD_APP_ID.slice(0, 10)}...`);

        if (!success) {
          console.warn('[MiniKit] install reported success=false; wallet auth may be unavailable');
        }

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
