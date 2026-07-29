"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function CharacterWorkspace({
  sidebarOpen,
  onSidebarOpen,
  onSidebarClose,
  sidebar,
  children
}: {
  sidebarOpen: boolean;
  onSidebarOpen: () => void;
  onSidebarClose: () => void;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSidebarClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onSidebarClose, sidebarOpen]);

  return <div className="character-workspace">
    <button
      type="button"
      className="sidebar-drawer-trigger"
      aria-controls="character-creation-sidebar"
      aria-expanded={sidebarOpen}
      onClick={onSidebarOpen}
    >
      <span aria-hidden="true">☰</span>
      Character &amp; levels
    </button>
    {sidebarOpen && <button type="button" className="sidebar-scrim" aria-label="Close character progression" onClick={onSidebarClose} />}
    <aside id="character-creation-sidebar" className={sidebarOpen ? "character-sidebar is-open" : "character-sidebar"} aria-label="Character creation and progression">
      <div className="sidebar-mobile-heading">
        <strong>Character &amp; levels</strong>
        <button ref={closeButton} type="button" onClick={onSidebarClose}>Close</button>
      </div>
      {sidebar}
    </aside>
    <div className="character-main-workspace">{children}</div>
  </div>;
}
