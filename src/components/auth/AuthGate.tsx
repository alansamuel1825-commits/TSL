"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/lib/auth/useAuth";
import {
  ensureOwnPublicProfile,
  getUserProfile,
} from "@/lib/firebase/firestore";

const PUBLIC_ROUTES =
  new Set([
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/verify-email",
    "/privacy",
    "/guidelines",
    "/terms",
    "/help",
  ]);

export default function AuthGate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } =
    useAuth();

  const [checkingProfile, setCheckingProfile] =
    useState(false);
  const [ready, setReady] =
    useState(false);

  const isPublic =
    PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      if (loading) {
        return;
      }

      if (isPublic) {
        if (!cancelled) {
          setReady(true);
          setCheckingProfile(false);
        }
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      if (
        user.email &&
        !user.emailVerified
      ) {
        router.replace(
          "/verify-email",
        );
        return;
      }

      /*
       * Onboarding is the one protected route that is allowed
       * before a platform user document exists.
       */
      if (pathname === "/onboarding") {
        if (!cancelled) {
          setReady(true);
          setCheckingProfile(false);
        }
        return;
      }

      setCheckingProfile(true);
      setReady(false);

      try {
        const profile =
          await getUserProfile(user.uid);

        if (!profile) {
          router.replace(
            "/onboarding",
          );
          return;
        }

        /*
         * Compatibility/self-healing step for accounts created
         * before publicProfiles existed.
         */
        await ensureOwnPublicProfile(
          profile,
        );

        if (!cancelled) {
          setReady(true);
        }
      } catch (error) {
        console.error(
          "Account access check failed:",
          error,
        );

        if (!cancelled) {
          setReady(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingProfile(false);
        }
      }
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loading,
    isPublic,
    pathname,
    router,
  ]);

  if (isPublic) {
    return children;
  }

  if (
    loading ||
    checkingProfile ||
    !ready
  ) {
    return (
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#fbfcff] px-5">
        <p className="text-sm text-slate-500">
          Loading Alumni Connect...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (
    user.email &&
    !user.emailVerified
  ) {
    return null;
  }

  return children;
}
