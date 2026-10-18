import { initializeApp } from 'firebase/app'
import {
  getAuth,
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const env = import.meta.env
export const useEmulators = env.VITE_USE_EMULATORS === 'true'
export const ownerUid = useEmulators ? 'galpi-owner' : env.VITE_OWNER_UID
const config = useEmulators
  ? {
      apiKey: 'demo-api-key',
      authDomain: 'demo-galpi.firebaseapp.com',
      projectId: 'demo-galpi',
      storageBucket: 'demo-galpi.appspot.com',
      appId: 'demo-galpi',
    }
  : {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    }
export const configured =
  Object.values(config).every(Boolean) &&
  !!ownerUid &&
  !/replace|your-project/i.test(Object.values(config).join(' ') + ownerUid)
// An unconfigured checkout renders setup guidance without contacting Firebase.
export const firebaseApp = configured ? initializeApp(config) : null
export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const db = firebaseApp ? getFirestore(firebaseApp) : null
export const storage = firebaseApp ? getStorage(firebaseApp) : null
if (storage) {
  storage.maxOperationRetryTime = 15000
  storage.maxUploadRetryTime = 30000
}
if (useEmulators && auth && db && storage) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
export const authReady = auth
  ? setPersistence(auth, browserLocalPersistence)
  : Promise.resolve()
