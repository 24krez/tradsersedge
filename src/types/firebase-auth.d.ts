declare module 'firebase/auth' {
  import { FirebaseApp } from 'firebase/app';

  export * from '@firebase/auth';

  export type ReactNativeAsyncStorage = {
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
    setItem(key: string, value: string): Promise<void>;
  };

  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
  export function initializeAuth(app: FirebaseApp, deps?: Dependencies): Auth;
}
