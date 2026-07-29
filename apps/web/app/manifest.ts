import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const applicationRoot = `${basePath}/`;
  return {
    id: applicationRoot,
    name: "PF1e Character Builder",
    short_name: "PF1e Builder",
    description: "Build and manage Pathfinder First Edition characters.",
    start_url: applicationRoot,
    scope: applicationRoot,
    display: "standalone",
    orientation: "any",
    background_color: "#f4f0e7",
    theme_color: "#7f1d1d",
    categories: ["games", "utilities"],
    icons: [
      {
        src: `${basePath}/icons/pf1e-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/icons/pf1e-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/icons/pf1e-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
