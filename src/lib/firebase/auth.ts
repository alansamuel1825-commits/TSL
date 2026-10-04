import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import { auth } from "./client";

const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const credential =
    await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );

  /*
   * Account creation and email delivery are two separate
   * network operations. If the verification email fails
   * to send, the account still exists, so we do not turn
   * that partial success into a misleading "account failed"
   * message. The verification page always offers Resend.
   */
  if (!credential.user.emailVerified) {
    try {
      await sendEmailVerification(
        credential.user,
      );
    } catch (error) {
      console.error(
        "Initial verification email could not be sent:",
        error,
      );
    }
  }

  return credential.user;
}

export async function signInWithEmail(
  email: string,
  password: string,
) {
  return signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
}

export async function signInWithGoogle() {
  return signInWithPopup(
    auth,
    googleProvider,
  );
}

export async function resendVerificationEmail():
  Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You need to be signed in to resend verification.",
    );
  }

  await reload(user);

  if (user.emailVerified) {
    return;
  }

  await sendEmailVerification(user);
}

export async function refreshCurrentUser():
  Promise<User | null> {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  await reload(user);

  return auth.currentUser;
}

export async function resetPassword(
  email: string,
): Promise<void> {
  await sendPasswordResetEmail(
    auth,
    email.trim(),
  );
}

export async function logOut():
  Promise<void> {
  await signOut(auth);
}
