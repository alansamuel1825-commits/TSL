"use client";
import { getUserProfile } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEmailLogin(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  setLoading(true);
  setError("");

  try {
  await signInWithEmail(email, password);

  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Authentication failed.");
  }

  const profile = await getUserProfile(currentUser.uid);

  router.push(profile ? "/dashboard" : "/onboarding");
} catch (error: unknown) {
    console.error("Email sign-in error:", error);

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    if (
      code === "auth/invalid-credential" ||
      code === "auth/user-not-found" ||
      code === "auth/wrong-password"
    ) {
      setError(
        "The email/password combination isn't correct. If you created the account with Google, use Continue with Google instead.",
      );
    } else if (code === "auth/too-many-requests") {
      setError(
        "Too many attempts. Please wait a little and try again.",
      );
    } else if (code === "auth/invalid-email") {
      setError("Please enter a valid email address.");
    } else {
      setError(
        `Sign-in failed${code ? ` (${code})` : ""}. Please try again.`,
      );
    }
  } finally {
    setLoading(false);
  }
}

  async function handleGoogleLogin() {
  setLoading(true);
  setError("");

  try {
  const credential = await signInWithGoogle();

  const profile = await getUserProfile(
    credential.user.uid,
  );

  router.push(
    profile ? "/dashboard" : "/onboarding",
  );
} catch (error: unknown) {
    console.error("Google sign-in error:", error);

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    if (code === "auth/popup-closed-by-user") {
      setError("The Google sign-in window was closed.");
    } else if (code === "auth/popup-blocked") {
      setError(
        "Your browser blocked the Google sign-in window. Please allow pop-ups for this site.",
      );
    } else if (
      code === "auth/account-exists-with-different-credential"
    ) {
      setError(
        "An account already exists with this email using another sign-in method.",
      );
    } else {
      setError(
        `Google sign-in failed${code ? ` (${code})` : ""}. Please try again.`,
      );
    }
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-md">

        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 font-bold text-white">
            T
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Welcome back
          </h1>

          <p className="mt-2 text-slate-600">
            Sign in to TSL Alumni Connect
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-medium transition hover:bg-slate-50 disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-wider text-slate-400">
              or
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form
            onSubmit={handleEmailLogin}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                placeholder="Your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to TSL Alumni Connect?{" "}
            <a
              href="/signup"
              className="font-medium text-slate-900 hover:underline"
            >
              Create an account
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}