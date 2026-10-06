"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "@/lib/firebase/client";
import {
  DEFAULT_USER_PREFERENCES,
  getUserPreferences,
  saveUserPreferences,
  type ThemePreference,
  type UserPreferenceValues,
} from "@/lib/firebase/firestore";

const STORAGE_KEY =
  "tsl-alumni-preferences-v1";

type PreferencesContextValue = {
  preferences:
    UserPreferenceValues;

  resolvedTheme:
    "light" | "dark";

  loadingPreferences: boolean;
  savingPreferences: boolean;

  updatePreferences: (
    updates:
      Partial<UserPreferenceValues>,
  ) => void;

  savePreferences: () =>
    Promise<void>;

  resetPreferences: () =>
    void;
};

const PreferencesContext =
  createContext<
    PreferencesContextValue
    | null
  >(null);

function normalizePreferences(
  value:
    Partial<UserPreferenceValues>
    | null
    | undefined
): UserPreferenceValues {
  const theme:
    ThemePreference =
      value?.theme === "light" ||
      value?.theme === "dark" ||
      value?.theme === "system"
        ? value.theme
        : "system";

  const textSize =
    value?.textSize === "large"
      ? "large"
      : "default";

  return {
    theme,
    textSize,
    highContrast:
      value?.highContrast === true,
    reduceMotion:
      value?.reduceMotion === true,
  };
}

function getSystemTheme():
  "light" | "dark" {
  if (
    typeof window !==
    "undefined" &&
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches
  ) {
    return "dark";
  }

  return "light";
}

function applyPreferencesToDocument(
  values:
    UserPreferenceValues
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  const resolvedTheme =
    values.theme === "system"
      ? getSystemTheme()
      : values.theme;

  const root =
    document.documentElement;

  root.dataset.theme =
    resolvedTheme;

  root.dataset.textSize =
    values.textSize;

  root.dataset.contrast =
    values.highContrast
      ? "high"
      : "normal";

  root.dataset.reduceMotion =
    values.reduceMotion
      ? "true"
      : "false";

  root.style.colorScheme =
    resolvedTheme;
}

export function PreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    preferences,
    setPreferences,
  ] =
    useState<UserPreferenceValues>(
      DEFAULT_USER_PREFERENCES
    );

  const [
    resolvedTheme,
    setResolvedTheme,
  ] = useState<
    "light" | "dark"
  >("light");

  const [
    loadingPreferences,
    setLoadingPreferences,
  ] = useState(true);

  const [
    savingPreferences,
    setSavingPreferences,
  ] = useState(false);

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY
        );

      if (raw) {
        const parsed =
          JSON.parse(raw);

        setPreferences(
          normalizePreferences(
            parsed
          )
        );
      }
    } catch (error) {
      console.warn(
        "[TSL Alumni] Could not read local display preferences.",
        error
      );
    } finally {
      setLoadingPreferences(
        false
      );
    }
  }, []);

  useEffect(() => {
    applyPreferencesToDocument(
      preferences
    );

    const resolved =
      preferences.theme ===
      "system"
        ? getSystemTheme()
        : preferences.theme;

    setResolvedTheme(resolved);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          preferences
        )
      );
    } catch (error) {
      console.warn(
        "[TSL Alumni] Could not save local display preferences.",
        error
      );
    }

    if (
      preferences.theme !==
      "system"
    ) {
      return;
    }

    const media =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const handleChange = () => {
      const next =
        media.matches
          ? "dark"
          : "light";

      setResolvedTheme(next);

      document.documentElement
        .dataset.theme = next;

      document.documentElement
        .style.colorScheme =
          next;
    };

    media.addEventListener(
      "change",
      handleChange
    );

    return () => {
      media.removeEventListener(
        "change",
        handleChange
      );
    };
  }, [preferences]);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (
            !user ||
            !user.emailVerified
          ) {
            return;
          }

          try {
            const remote =
              await getUserPreferences(
                user.uid
              );

            if (remote) {
              setPreferences(
                normalizePreferences(
                  remote
                )
              );
            }
          } catch (error) {
            console.warn(
              "[TSL Alumni] Could not load cloud display preferences.",
              error
            );
          }
        }
      );

    return unsubscribe;
  }, []);

  const updatePreferences =
    useCallback(
      (
        updates:
          Partial<UserPreferenceValues>
      ) => {
        setPreferences(
          (current) =>
            normalizePreferences({
              ...current,
              ...updates,
            })
        );
      },
      []
    );

  const savePreferences =
    useCallback(
      async () => {
        const user =
          auth.currentUser;

        if (
          !user ||
          !user.emailVerified
        ) {
          throw new Error(
            "Sign in with a verified account before saving preferences."
          );
        }

        setSavingPreferences(
          true
        );

        try {
          await saveUserPreferences(
            user.uid,
            preferences
          );
        } finally {
          setSavingPreferences(
            false
          );
        }
      },
      [preferences]
    );

  const resetPreferences =
    useCallback(() => {
      setPreferences(
        DEFAULT_USER_PREFERENCES
      );
    }, []);

  const value =
    useMemo(
      () => ({
        preferences,
        resolvedTheme,
        loadingPreferences,
        savingPreferences,
        updatePreferences,
        savePreferences,
        resetPreferences,
      }),
      [
        preferences,
        resolvedTheme,
        loadingPreferences,
        savingPreferences,
        updatePreferences,
        savePreferences,
        resetPreferences,
      ]
    );

  return (
    <PreferencesContext.Provider
      value={value}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences():
  PreferencesContextValue {
  const context =
    useContext(
      PreferencesContext
    );

  if (!context) {
    throw new Error(
      "usePreferences must be used inside PreferencesProvider."
    );
  }

  return context;
}
