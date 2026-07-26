import "./styles.css";
import "./skill-allocation.css";
import "./character-actions.css";
import "./class-options.css";
import "./domain-details.css";
import "./domain-slots.css";
import "./channel-energy.css";
import "./equipment-panel.css";
import "./install-app.css";
import "./trait-choices.css";
import "./character-library.css";
import type { Metadata, Viewport } from "next";
import { InstallApp } from "./install-app";
import { PwaRegistration } from "./pwa-registration";

export const metadata: Metadata = {
  title: "PF1e Character Builder",
  description: "Build and manage Pathfinder First Edition characters.",
  applicationName: "PF1e Character Builder",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/pf1e-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pf1e-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#7f1d1d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#character-builder-main">Skip to character builder</a>
        <PwaRegistration />
        <InstallApp />
        {children}
      </body>
    </html>
  );
}
