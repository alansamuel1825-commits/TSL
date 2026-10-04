import {
  getApp,
  getApps,
  initializeApp,
} from "firebase/app";

import {
  connectAuthEmulator,
  getAuth,
} from "firebase/auth";

import {
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore";


const useEmulators =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";


const productionFirebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,

  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,

  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


const emulatorFirebaseConfig = {
  apiKey: "demo-api-key",

  authDomain:
    "demo-tsl-alumni.firebaseapp.com",

  projectId:
    "demo-tsl-alumni",

  storageBucket:
    "demo-tsl-alumni.appspot.com",

  messagingSenderId:
    "000000000000",

  appId:
    "1:000000000000:web:demo",
};


const firebaseConfig =
  useEmulators
    ? emulatorFirebaseConfig
    : productionFirebaseConfig;


const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);


export const auth = getAuth(app);

export const db = getFirestore(app);


// ------------------------------------------------------------
// LOCAL FIREBASE EMULATORS
// ------------------------------------------------------------
//
// These connections are allowed ONLY when:
//
// 1. Next.js is running in development mode
// 2. NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
//
// Production builds therefore continue using real Firebase.
// ------------------------------------------------------------

declare global {
  var __TSL_FIREBASE_EMULATORS_CONNECTED__:
    | boolean
    | undefined;
}


if (
  typeof window !== "undefined" &&
  useEmulators &&
  !globalThis.__TSL_FIREBASE_EMULATORS_CONNECTED__
) {
  connectAuthEmulator(
    auth,
    "http://127.0.0.1:9099",
    {
      disableWarnings: true,
    }
  );

  connectFirestoreEmulator(
    db,
    "127.0.0.1",
    8080
  );

  globalThis.__TSL_FIREBASE_EMULATORS_CONNECTED__ =
    true;

  console.info(
    "[TSL Alumni] Firebase emulator mode enabled."
  );
}


export default app;