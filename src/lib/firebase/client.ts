import {
  getApp,
  getApps,
  initializeApp,
} from "firebase/app";

import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";

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


// ------------------------------------------------------------
// FIREBASE APP CHECK
// ------------------------------------------------------------
//
// Production / real Firebase:
//   Uses reCAPTCHA Enterprise through Firebase App Check.
//
// Local Firebase emulator mode:
//   App Check is skipped.
//
// Local development against REAL Firebase:
//   Set NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG=true.
//   Firebase will print a debug token in the browser console.
//   Register that token in Firebase Console > App Check.
//   NEVER commit or share that debug token.
// ------------------------------------------------------------

declare global {
  var __TSL_FIREBASE_APPCHECK_INSTANCE__:
    | AppCheck
    | undefined;

  var __TSL_FIREBASE_EMULATORS_CONNECTED__:
    | boolean
    | undefined;

  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?:
      | boolean
      | string;
  }
}


const appCheckSiteKey =
  process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;


function initializeTSLAppCheck():
  AppCheck | null {
  if (
    typeof window === "undefined" ||
    useEmulators ||
    !appCheckSiteKey
  ) {
    return null;
  }

  if (
    globalThis.__TSL_FIREBASE_APPCHECK_INSTANCE__
  ) {
    return globalThis
      .__TSL_FIREBASE_APPCHECK_INSTANCE__;
  }

  const useDebugProvider =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG === "true";

  if (useDebugProvider) {
    window.FIREBASE_APPCHECK_DEBUG_TOKEN =
      true;
  }

  const instance =
    initializeAppCheck(app, {
      provider:
        new ReCaptchaEnterpriseProvider(
          appCheckSiteKey
        ),

      isTokenAutoRefreshEnabled:
        true,
    });

  globalThis.__TSL_FIREBASE_APPCHECK_INSTANCE__ =
    instance;

  console.info(
    "[TSL Alumni] Firebase App Check initialized."
  );

  return instance;
}


export const appCheck =
  initializeTSLAppCheck();


if (
  typeof window !== "undefined" &&
  !useEmulators &&
  process.env.NODE_ENV === "production" &&
  !appCheckSiteKey
) {
  console.warn(
    "[TSL Alumni] App Check site key is not configured."
  );
}


// ------------------------------------------------------------
// FIREBASE SERVICES
// ------------------------------------------------------------
//
// App Check is initialized BEFORE Auth and Firestore references
// are created.
// ------------------------------------------------------------

export const auth =
  getAuth(app);

export const db =
  getFirestore(app);


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
