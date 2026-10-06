const CACHE_NAME =
  "tsl-alumni-shell-v1";

const OFFLINE_URL =
  "/offline";

const SAFE_PUBLIC_ASSETS =
  new Set([
    "/pwa-192.png",
    "/pwa-512.png",
    "/pwa-maskable-512.png",
    "/apple-touch-icon.png",
    "/the-study-logo.png",
    "/the-study-campus.webp",
  ]);

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/pwa-192.png",
  "/pwa-512.png",
  "/pwa-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          cache.addAll(
            PRECACHE_URLS
          )
        )
    );
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      Promise.all([
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter(
                  (key) =>
                    key !==
                    CACHE_NAME
                )
                .map(
                  (key) =>
                    caches.delete(
                      key
                    )
                )
            )
          ),
        self.clients.claim(),
      ])
    );
  }
);

self.addEventListener(
  "message",
  (event) => {
    if (
      event.data?.type ===
      "SKIP_WAITING"
    ) {
      self.skipWaiting();
    }
  }
);

function shouldCacheAsset(
  request,
  url
) {
  if (
    request.method !==
      "GET" ||
    url.origin !==
      self.location.origin
  ) {
    return false;
  }

  /*
   * Next.js build assets are versioned and safe to cache.
   */
  if (
    url.pathname.startsWith(
      "/_next/static/"
    )
  ) {
    return true;
  }

  /*
   * Cache only explicitly public school/app assets.
   * Do NOT cache /_next/image or arbitrary images because those
   * could later proxy user/profile/project media.
   */
  return SAFE_PUBLIC_ASSETS.has(
    url.pathname
  );
}

self.addEventListener(
  "fetch",
  (event) => {
    const request =
      event.request;

    const url =
      new URL(
        request.url
      );

    /*
     * Navigation is intentionally NETWORK FIRST.
     *
     * We never cache authenticated page HTML such as messages,
     * mentorship, settings, notifications or admin screens.
     * If the network is unavailable, the user receives the
     * dedicated offline page instead of stale private content.
     */
    if (
      request.mode ===
      "navigate"
    ) {
      event.respondWith(
        fetch(request).catch(
          async () =>
            (
              await caches.match(
                OFFLINE_URL
              )
            ) ||
            Response.error()
        )
      );

      return;
    }

    /*
     * Firebase/Auth/Firestore requests go to other origins and
     * are never cached by this service worker.
     */
    if (
      !shouldCacheAsset(
        request,
        url
      )
    ) {
      return;
    }

    event.respondWith(
      caches.match(
        request
      ).then(
        (cached) => {
          const network =
            fetch(request)
              .then(
                (response) => {
                  if (
                    response.ok
                  ) {
                    const copy =
                      response.clone();

                    caches
                      .open(
                        CACHE_NAME
                      )
                      .then(
                        (cache) =>
                          cache.put(
                            request,
                            copy
                          )
                      );
                  }

                  return response;
                }
              )
              .catch(
                () =>
                  cached ||
                  Response.error()
              );

          return (
            cached ||
            network
          );
        }
      )
    );
  }
);
