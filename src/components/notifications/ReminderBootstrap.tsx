"use client";

import {
  useEffect,
} from "react";

import {
  useAuth,
} from "@/lib/auth/useAuth";

import {
  materializeDueContentReminders,
} from "@/lib/firebase/firestore";

export default function ReminderBootstrap() {
  const {
    user,
    loading,
  } = useAuth();

  useEffect(() => {
    if (
      loading ||
      !user
    ) {
      return;
    }

    const uid =
      user.uid;

    let cancelled =
      false;

    async function check() {
      if (
        cancelled ||
        !navigator.onLine
      ) {
        return;
      }

      try {
        await materializeDueContentReminders(
          uid
        );
      } catch (error) {
        console.warn(
          "[TSL Alumni] Reminder check failed.",
          error
        );
      }
    }

    const onVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          check();
        }
      };

    const onOnline =
      () => {
        check();
      };

    check();

    const interval =
      window.setInterval(
        check,
        5 * 60 * 1000
      );

    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    window.addEventListener(
      "online",
      onOnline
    );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval
      );

      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );

      window.removeEventListener(
        "online",
        onOnline
      );
    };
  }, [
    user,
    loading,
  ]);

  return null;
}
