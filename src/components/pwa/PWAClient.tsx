"use client";

import {
  useEffect,
  useState,
} from "react";

interface BeforeInstallPromptEvent
  extends Event {
  prompt:
    () => Promise<void>;

  userChoice:
    Promise<{
      outcome:
        | "accepted"
        | "dismissed";
      platform: string;
    }>;
}

export default function PWAClient() {
  const [
    online,
    setOnline,
  ] = useState(true);

  const [
    installPrompt,
    setInstallPrompt,
  ] =
    useState<
      BeforeInstallPromptEvent | null
    >(null);

  const [
    updateWorker,
    setUpdateWorker,
  ] =
    useState<
      ServiceWorker | null
    >(null);

  const [
    installing,
    setInstalling,
  ] = useState(false);

  useEffect(() => {
    setOnline(
      navigator.onLine
    );

    const handleOnline =
      () => setOnline(true);

    const handleOffline =
      () => setOnline(false);

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  useEffect(() => {
    const handler = (
      event: Event
    ) => {
      event.preventDefault();

      setInstallPrompt(
        event as
          BeforeInstallPromptEvent
      );
    };

    window.addEventListener(
      "beforeinstallprompt",
      handler
    );

    const installed =
      () => {
        setInstallPrompt(
          null
        );
      };

    window.addEventListener(
      "appinstalled",
      installed
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler
      );

      window.removeEventListener(
        "appinstalled",
        installed
      );
    };
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "production" ||
      !(
        "serviceWorker" in
        navigator
      )
    ) {
      return;
    }

    let mounted = true;

    const register =
      async () => {
        try {
          const registration =
            await navigator.serviceWorker.register(
              "/sw.js",
              {
                scope: "/",
                updateViaCache:
                  "none",
              }
            );

          if (!mounted) {
            return;
          }

          if (
            registration.waiting
          ) {
            setUpdateWorker(
              registration.waiting
            );
          }

          registration.addEventListener(
            "updatefound",
            () => {
              const worker =
                registration.installing;

              if (!worker) {
                return;
              }

              worker.addEventListener(
                "statechange",
                () => {
                  if (
                    worker.state ===
                      "installed" &&
                    navigator
                      .serviceWorker
                      .controller
                  ) {
                    setUpdateWorker(
                      worker
                    );
                  }
                }
              );
            }
          );

          await registration.update();
        } catch (error) {
          console.warn(
            "[TSL Alumni] Service worker registration failed.",
            error
          );
        }
      };

    const reloadOnUpdate =
      () => {
        window.location.reload();
      };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      reloadOnUpdate
    );

    register();

    return () => {
      mounted = false;

      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        reloadOnUpdate
      );
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    setInstalling(true);

    try {
      await installPrompt.prompt();

      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(
        null
      );

      setInstalling(false);
    }
  }

  function applyUpdate() {
    if (!updateWorker) {
      return;
    }

    updateWorker.postMessage({
      type:
        "SKIP_WAITING",
    });
  }

  const standalone =
    typeof window !==
      "undefined" &&
    (
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      (
        "standalone" in
          navigator &&
        (
          navigator as
            Navigator & {
              standalone?: boolean;
            }
        ).standalone === true
      )
    );

  return (
    <>
      {!online && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-4 z-[100] mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg"
        >
          <span className="font-medium">
            You&apos;re offline. Private Alumni Connect data stays network-first.
          </span>

          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500"
            aria-hidden="true"
          />
        </div>
      )}

      {online &&
        updateWorker && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-4 z-[100] mx-auto flex w-[calc(100%-2rem)] max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-lg"
        >
          <span className="font-medium">
            A newer version of Alumni Connect is ready.
          </span>

          <button
            type="button"
            onClick={
              applyUpdate
            }
            className="rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-800"
          >
            Update
          </button>
        </div>
      )}

      {online &&
        !updateWorker &&
        installPrompt &&
        !standalone && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:inset-x-auto sm:right-4 sm:mx-0"
        >
          <p className="text-sm font-semibold text-slate-950">
            Install Alumni Connect
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Add it to this device for quicker access and a standalone app experience.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={
                installApp
              }
              disabled={
                installing
              }
              className="rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {installing
                ? "Opening..."
                : "Install"}
            </button>

            <button
              type="button"
              onClick={() =>
                setInstallPrompt(
                  null
                )
              }
              className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
