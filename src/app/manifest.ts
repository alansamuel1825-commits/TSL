import type {
  MetadataRoute,
} from "next";

export default function manifest():
  MetadataRoute.Manifest {
  return {
    name:
      "The Study Alumni Connect",
    short_name:
      "TSL Alumni",
    description:
      "The Study L'école Internationale's private alumni and student community for mentorship, projects, resources and school-approved opportunities.",
    start_url:
      "/dashboard",
    scope: "/",
    display:
      "standalone",
    background_color:
      "#fbfcff",
    theme_color:
      "#0f172a",
    lang: "en",
    categories: [
      "education",
      "social",
      "productivity",
    ],
    prefer_related_applications:
      false,
    icons: [
      {
        src:
          "/pwa-192.png",
        sizes:
          "192x192",
        type:
          "image/png",
        purpose:
          "any",
      },
      {
        src:
          "/pwa-512.png",
        sizes:
          "512x512",
        type:
          "image/png",
        purpose:
          "any",
      },
      {
        src:
          "/pwa-maskable-512.png",
        sizes:
          "512x512",
        type:
          "image/png",
        purpose:
          "maskable",
      },
    ],
    shortcuts: [
      {
        name:
          "Alumni",
        short_name:
          "Alumni",
        description:
          "Explore verified TSL alumni.",
        url: "/alumni",
        icons: [
          {
            src:
              "/pwa-192.png",
            sizes:
              "192x192",
            type:
              "image/png",
          },
        ],
      },
      {
        name:
          "Projects",
        short_name:
          "Projects",
        description:
          "Browse TSL community projects.",
        url: "/projects",
        icons: [
          {
            src:
              "/pwa-192.png",
            sizes:
              "192x192",
            type:
              "image/png",
          },
        ],
      },
      {
        name:
          "Community Hub",
        short_name:
          "Hub",
        description:
          "Open resources, opportunities and events.",
        url: "/hub",
        icons: [
          {
            src:
              "/pwa-192.png",
            sizes:
              "192x192",
            type:
              "image/png",
          },
        ],
      },
      {
        name:
          "Notifications",
        short_name:
          "Alerts",
        description:
          "View your Alumni Connect notifications.",
        url:
          "/notifications",
        icons: [
          {
            src:
              "/pwa-192.png",
            sizes:
              "192x192",
            type:
              "image/png",
          },
        ],
      },
    ],
  };
}
