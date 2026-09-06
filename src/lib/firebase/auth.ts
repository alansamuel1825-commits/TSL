import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth } from "./client";

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export async function signUpWithEmail(
  email: string,
  password: string,
) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user);
  }

  return credential.user;
}

export async function signInWithEmail(
  email: string,
  password: string,
) {
  return await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
}

export async function signInWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logOut() {
  await signOut(auth);
}