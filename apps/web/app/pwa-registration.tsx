"use client";

import { useEffect, useRef, useState } from "react";

export function PwaRegistration() {
  const [waitingWorker, setWaitingWorker] =
    useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const refreshing = useRef(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const showUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
        setDismissed(false);
      }
    };

    let removeFocusListener = () => {};
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          showUpdate(registration);
          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) {
              return;
            }
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed") {
                showUpdate(registration);
              }
            });
          });

          const checkForUpdate = () => registration.update().catch(() => {});
          window.addEventListener("focus", checkForUpdate);
          removeFocusListener = () =>
            window.removeEventListener("focus", checkForUpdate);
        })
        .catch((error: unknown) => {
          console.error("Unable to enable offline mode.", error);
        });
    };

    const refreshOnActivation = () => {
      if (refreshing.current) {
        return;
      }
      refreshing.current = true;
      window.location.reload();
    };

    window.addEventListener("load", register);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      refreshOnActivation,
    );
    return () => {
      window.removeEventListener("load", register);
      removeFocusListener();
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        refreshOnActivation,
      );
    };
  }, []);

  if (!waitingWorker || dismissed) {
    return null;
  }

  const applyUpdate = () => {
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <aside className="pwa-update" role="status" aria-live="polite">
      <div>
        <strong>Builder update available</strong>
        <span>
          Save or export your character, then update when you are ready.
        </span>
      </div>
      <div className="pwa-update__actions">
        <button type="button" onClick={() => setDismissed(true)}>
          Later
        </button>
        <button type="button" onClick={applyUpdate}>
          Update now
        </button>
      </div>
    </aside>
  );
}
