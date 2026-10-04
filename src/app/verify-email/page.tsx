"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  logOut,
  refreshCurrentUser,
  resendVerificationEmail,
} from "@/lib/firebase/auth";
import {
  getUserProfile,
} from "@/lib/firebase/firestore";
import {
  useAuth,
} from "@/lib/auth/useAuth";

function MailCheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-7 w-7"
    >
      <path d="M4 6h16v12H4Z" />
      <path d="m5 8 7 5 7-5" />
      <path d="m16 17 2 2 4-4" />
    </svg>
  );
}

function getErrorCode(
  error: unknown,
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    return String(
      (error as {
        code?: unknown;
      }).code ?? "",
    );
  }

  return "";
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading } =
    useAuth();

  const [checking, setChecking] =
    useState(false);
  const [resending, setResending] =
    useState(false);
  const [signingOut, setSigningOut] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  useEffect(() => {
    if (loading) return;

    if (
      user?.emailVerified
    ) {
      void finishVerifiedFlow(
        user.uid,
      );
    }
  // We intentionally react only to auth-state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  async function finishVerifiedFlow(
    uid: string,
  ) {
    try {
      const profile =
        await getUserProfile(uid);

      router.replace(
        profile
          ? "/dashboard"
          : "/onboarding",
      );
    } catch (error) {
      console.error(
        "Post-verification routing error:",
        error,
      );

      router.replace(
        "/onboarding",
      );
    }
  }

  async function handleCheck() {
    setChecking(true);
    setError("");
    setMessage("");

    try {
      const refreshed =
        await refreshCurrentUser();

      if (!refreshed) {
        setError(
          "Your sign-in session has ended. Please sign in again.",
        );
        return;
      }

      if (
        !refreshed.emailVerified
      ) {
        setMessage(
          "Your email is not verified yet. Open the verification link in your inbox, then try again.",
        );
        return;
      }

      setMessage(
        "Email verified. Taking you to Alumni Connect...",
      );

      await finishVerifiedFlow(
        refreshed.uid,
      );
    } catch (error: unknown) {
      console.error(
        "Email verification check error:",
        error,
      );

      const code =
        getErrorCode(error);

      if (
        code ===
        "auth/network-request-failed"
      ) {
        setError(
          "We could not check your verification status. Check your connection and try again.",
        );
      } else {
        setError(
          "We could not check your verification status right now.",
        );
      }
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setMessage("");

    try {
      await resendVerificationEmail();

      setMessage(
        "Verification email sent. Check your inbox and spam folder.",
      );
    } catch (error: unknown) {
      console.error(
        "Verification resend error:",
        error,
      );

      const code =
        getErrorCode(error);

      if (
        code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many verification emails were requested. Please wait before trying again.",
        );
      } else if (
        code ===
        "auth/network-request-failed"
      ) {
        setError(
          "We could not send the email. Check your connection and try again.",
        );
      } else {
        setError(
          "We could not resend the verification email right now.",
        );
      }
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError("");

    try {
      await logOut();
      router.replace(
        "/login",
      );
    } catch (error) {
      console.error(
        "Sign-out error:",
        error,
      );

      setError(
        "We could not sign you out right now.",
      );
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#fbfcff] px-5">
        <p className="text-sm text-slate-500">
          Checking your account...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#fbfcff] px-5 py-10">
        <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-950">
            Sign in to verify your email
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Your verification status is linked to your signed-in account.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#fbfcff] px-5 py-10 sm:px-6">
      <div className="w-full max-w-xl rounded-[2.25rem] border border-slate-200 bg-white p-7 shadow-[0_28px_90px_-55px_rgba(15,23,42,0.32)] sm:p-10">
        <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <Image
            src="/the-study-logo.png"
            alt="The Study L'école Internationale logo"
            fill
            sizes="56px"
            className="object-contain p-1"
          />
        </div>

        <div className="mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <MailCheckIcon />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          Email verification
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
          Verify your email.
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-600">
          We use email verification to confirm access to your account before you continue with an email-and-password sign-in.
        </p>

        {user.email && (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.13em] text-slate-400">
              Signed in as
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-800">
              {user.email}
            </p>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5 text-sm leading-6 text-blue-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={
              handleCheck
            }
            disabled={
              checking ||
              resending
            }
            className="rounded-2xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking
              ? "Checking..."
              : "I've verified my email"}
          </button>

          <button
            type="button"
            onClick={
              handleResend
            }
            disabled={
              resending ||
              checking
            }
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending
              ? "Sending..."
              : "Resend email"}
          </button>
        </div>

        <p className="mt-5 text-xs leading-6 text-slate-400">
          If you do not see the email, check spam or junk folders and confirm that the address above is correct.
        </p>

        <div className="mt-7 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={
              handleSignOut
            }
            disabled={
              signingOut
            }
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950 disabled:opacity-50"
          >
            {signingOut
              ? "Signing out..."
              : "Use a different account"}
          </button>
        </div>
      </div>
    </main>
  );
}
