"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

import {
  resetPassword,
} from "@/lib/firebase/auth";

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path d="m4 7 8 6 8-6" />
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

export default function ForgotPasswordPage() {
  const [email, setEmail] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [sent, setSent] =
    useState(false);
  const [error, setError] =
    useState("");

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      setError(
        "Please enter your email address.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      await resetPassword(
        cleanEmail,
      );

      setSent(true);
    } catch (error: unknown) {
      console.error(
        "Password reset error:",
        error,
      );

      const code =
        getErrorCode(error);

      /*
       * Avoid disclosing whether an email is registered.
       * Older Firebase configurations may still return
       * auth/user-not-found.
       */
      if (
        code ===
        "auth/user-not-found"
      ) {
        setSent(true);
      } else if (
        code ===
        "auth/invalid-email"
      ) {
        setError(
          "Please enter a valid email address.",
        );
      } else if (
        code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many requests were made. Please wait a little and try again.",
        );
      } else if (
        code ===
        "auth/network-request-failed"
      ) {
        setError(
          "We could not reach the account service. Check your connection and try again.",
        );
      } else {
        setError(
          "We could not send the reset email right now. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#fbfcff] px-5 py-10 sm:px-6">
      <div className="w-full max-w-lg rounded-[2.25rem] border border-slate-200 bg-white p-7 shadow-[0_28px_90px_-55px_rgba(15,23,42,0.32)] sm:p-10">
        <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <Image
            src="/the-study-logo.png"
            alt="The Study L'école Internationale logo"
            fill
            sizes="56px"
            className="object-contain p-1"
          />
        </div>

        <div className="mt-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <MailIcon />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          Account recovery
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
          Reset your password.
        </h1>

        {!sent ? (
          <>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Enter the email used for your Alumni Connect account. If the account supports password sign-in, Firebase will send password-reset instructions.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={
                handleSubmit
              }
              className="mt-7 space-y-5"
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
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
                  placeholder="you@example.com"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-700 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Sending..."
                  : "Send reset email"}
              </button>
            </form>
          </>
        ) : (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
          >
            <p className="text-sm font-semibold text-emerald-800">
              Check your email
            </p>

            <p className="mt-2 text-sm leading-7 text-emerald-700">
              If an eligible account exists for that address, password-reset instructions have been sent. Check your spam folder as well.
            </p>
          </div>
        )}

        <div className="mt-8 border-t border-slate-200 pt-6">
          <Link
            href="/login"
            className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
