"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearAppAccessKey } from "@/components/shared/AppKeyGate";
import { Button } from "@/components/ui/button";
import { ProductNavSection } from "./ProductNavSection";
import { PRODUCT_NAV_SECTIONS } from "./nav-config";
import styles from "./navigation.module.css";

interface AppSidebarProps {
  markCurrent?: boolean;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
}

export function AppSidebar({ markCurrent = true, onNavigate, variant = "desktop" }: AppSidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    clearAppAccessKey();
    window.location.href = "/login";
  };

  return (
    <aside className={`${styles.sidebar} ${variant === "mobile" ? styles.sidebarMobile : styles.sidebarDesktop}`}>
      <div className={styles.sidebarBrandBlock}>
        <Link href="/tts" className={styles.brandLink} onClick={onNavigate}>
          <span className={styles.brandMark} aria-hidden="true">M</span>
          <span>
            <span className={styles.brandTitle}>MiniMax Studio</span>
            <span className={styles.brandSubtitle}>Speech, image, and music generation</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Product areas" className={styles.productNav}>
        {PRODUCT_NAV_SECTIONS.map((section) => (
          <ProductNavSection
            key={section.id}
            section={section}
            pathname={pathname}
            markCurrent={markCurrent}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.accountCard}>
          <span className={styles.accountKicker}>Workspace</span>
          <span className={styles.accountTitle}>Authenticated session</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} width="100%">
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
