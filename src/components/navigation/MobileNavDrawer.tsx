"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./AppSidebar";
import styles from "./navigation.module.css";

export const MOBILE_NAV_DRAWER_ID = "mobile-navigation-drawer";

interface MobileNavHeaderProps {
  isOpen: boolean;
  onOpen: () => void;
}

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavHeader({ isOpen, onOpen }: MobileNavHeaderProps) {
  return (
    <header className={styles.mobileHeader}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpen}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls={MOBILE_NAV_DRAWER_ID}
      >
        Menu
      </Button>
      <Link href="/tts" className={styles.mobileHeaderBrand}>MiniMax Studio</Link>
      <span className={styles.mobileHeaderSpacer} aria-hidden="true" />
    </header>
  );
}

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.mobileDrawerRoot} data-testid="mobile-nav-drawer">
      <button type="button" className={styles.mobileDrawerOverlay} onClick={onClose} aria-label="Close navigation menu" />
      <div
        id={MOBILE_NAV_DRAWER_ID}
        className={styles.mobileDrawerPanel}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
      >
        <div className={styles.mobileDrawerHeader}>
          <span className={styles.mobileDrawerTitle}>Navigation</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close navigation menu">
            Close
          </Button>
        </div>
        <AppSidebar variant="mobile" onNavigate={onClose} />
      </div>
    </div>
  );
}
