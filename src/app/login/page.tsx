"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import {
  getUserProfile,
} from "@/lib/firebase/firestore";

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.92V7.49H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.51l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
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

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  async function routeAfterAuth(
    uid: string,
  ) {
    const profile =
      await getUserProfile(uid);

    router.push(
      profile
        ? "/dashboard"
        : "/onboarding",
    );
  }

  async function handleEmailLogin(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const credential =
        await signInWithEmail(
          email,
          password,
        );

      if (
        !credential.user.emailVerified
      ) {
        router.push(
          "/verify-email",
        );
        return;
      }

      await routeAfterAuth(
        credential.user.uid,
      );
    } catch (error: unknown) {
      console.error(
        "Email sign-in error:",
        error,
      );

      const code =
        getErrorCode(error);

      if (
        code ===
          "auth/invalid-credential" ||
        code ===
          "auth/user-not-found" ||
        code ===
          "auth/wrong-password"
      ) {
        setError(
          "The email or password is not correct. If you created your account with Google, use Continue with Google.",
        );
      } else if (
        code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many sign-in attempts. Please wait a little before trying again.",
        );
      } else if (
        code ===
        "auth/invalid-email"
      ) {
        setError(
          "Please enter a valid email address.",
        );
      } else if (
        code ===
        "auth/network-request-failed"
      ) {
        setError(
          "We could not reach the sign-in service. Check your connection and try again.",
        );
      } else if (
        code ===
        "auth/user-disabled"
      ) {
        setError(
          "This account is currently unavailable. Please contact the school administrator.",
        );
      } else {
        setError(
          "Sign-in could not be completed. Please try again.",
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
      const credential =
        await signInWithGoogle();

      /*
       * Google accounts normally arrive as verified.
       * Keeping this check makes the flow correct for
       * any unusual provider/account state.
       */
      if (
        credential.user.email &&
        !credential.user.emailVerified
      ) {
        router.push(
          "/verify-email",
        );
        return;
      }

      await routeAfterAuth(
        credential.user.uid,
      );
    } catch (error: unknown) {
      console.error(
        "Google sign-in error:",
        error,
      );

      const code =
        getErrorCode(error);

      if (
        code ===
        "auth/popup-closed-by-user"
      ) {
        setError(
          "The Google sign-in window was closed before sign-in finished.",
        );
      } else if (
        code ===
        "auth/popup-blocked"
      ) {
        setError(
          "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.",
        );
      } else if (
        code ===
        "auth/account-exists-with-different-credential"
      ) {
        setError(
          "An account already exists with this email using another sign-in method.",
        );
      } else if (
        code ===
        "auth/network-request-failed"
      ) {
        setError(
          "We could not reach Google sign-in. Check your connection and try again.",
        );
      } else {
        setError(
          "Google sign-in could not be completed. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-124px)] max-w-7xl overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-[0_32px_100px_-58px_rgba(15,23,42,0.38)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[720px] overflow-hidden lg:block">
          <Image
            src="/the-study-campus.webp"
            alt="The Study L'école Internationale campus"
            fill
            priority
            sizes="55vw"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/18 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/25 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-10 xl:p-12">
            <div className="max-w-xl">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white/95 shadow-lg ring-1 ring-white/70 backdrop-blur">
                <Image
                  src="/the-study-logo.png"
                  alt="The Study L'école Internationale logo"
                  fill
                  sizes="64px"
                  className="object-contain p-1.5"
                />
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                The Study L&apos;école Internationale
              </p>

              <h1 className="mt-3 max-w-lg text-4xl font-semibold tracking-[-0.035em] text-white xl:text-5xl">
                One community, across every generation.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-8 text-white/80">
                Sign in to discover verified alumni, seek mentorship, ask questions, and continue meaningful conversations within The Study community.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="lg:hidden">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                <Image
                  src="/the-study-logo.png"
                  alt="The Study L'école Internationale logo"
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                />
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                The Study L&apos;école Internationale
              </p>
            </div>

            <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 lg:block">
              Alumni Connect
            </p>

            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950">
              Welcome back.
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Sign in to continue to your community.
            </p>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={
                handleGoogleLogin
              }
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GoogleIcon />
              {loading
                ? "Please wait..."
                : "Continue with Google"}
            </button>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                or continue with email
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form
              onSubmit={
                handleEmailLogin
              }
              className="space-y-5"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">
                  Email
                </span>

                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-800">
                    Password
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    className="text-xs font-semibold text-blue-700 transition hover:text-blue-800"
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="Enter your password"
                />
              </label>

              <div className="-mt-1 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_-16px_rgba(29,78,216,0.75)] transition hover:-translate-y-0.5 hover:bg-blue-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Signing in..."
                  : "Sign in"}
                {!loading && (
                  <ArrowRight />
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <p className="text-center text-sm text-slate-500">
                New to Alumni Connect?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
                >
                  Create an account
                </Link>
              </p>

              <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                Alumni profiles are verified by the school before they receive verified-alumni access.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
