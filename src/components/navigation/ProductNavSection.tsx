"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductNavSection as ProductNavSectionConfig } from "./nav-config";
import { isNavItemActive, matchesPath } from "./nav-config";
import styles from "./navigation.module.css";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface ProductNavSectionProps {
  section: ProductNavSectionConfig;
  pathname: string;
  markCurrent?: boolean;
  onNavigate?: () => void;
}

export function ProductNavSection({ section, pathname, markCurrent = true, onNavigate }: ProductNavSectionProps) {
  const isAreaActive = matchesPath(pathname, section.matchPaths);
  const isLandingActive = pathname === section.href;
  const hasGroups = section.groups.length > 0;
  const [isExpanded, setIsExpanded] = useState(isAreaActive);
  const groupsId = `product-nav-${section.id}-items`;

  useEffect(() => {
    setIsExpanded(isAreaActive);
  }, [isAreaActive]);

  return (
    <section
      aria-label={`${section.label} navigation`}
      className={cx(styles.productSection, styles[section.id], isAreaActive && styles.productSectionActive)}
      data-active={isAreaActive ? "true" : "false"}
      data-section={section.id}
    >
      {hasGroups ? (
        <button
          type="button"
          className={styles.productHeaderButton}
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          aria-controls={groupsId}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${section.label} navigation`}
        >
          <span className={styles.productInitials} aria-hidden="true">{section.shortLabel}</span>
          <span className={styles.productHeaderText}>
            <span className={styles.productTitle}>{section.label}</span>
            <span className={styles.productDescription}>{section.description}</span>
          </span>
          <span className={styles.productDisclosureIcon} aria-hidden="true" />
        </button>
      ) : (
        <Link
          href={section.href}
          className={styles.productHeaderLink}
          onClick={onNavigate}
          aria-current={markCurrent && isLandingActive ? "page" : undefined}
        >
          <span className={styles.productInitials} aria-hidden="true">{section.shortLabel}</span>
          <span className={styles.productHeaderText}>
            <span className={styles.productTitle}>{section.label}</span>
            <span className={styles.productDescription}>{section.description}</span>
          </span>
        </Link>
      )}

      {hasGroups && isExpanded && (
        <div id={groupsId} className={styles.productGroups}>
          {section.groups.map((group) => (
            <div key={group.label} className={styles.productGroup}>
              <div className={styles.productGroupLabel}>{group.label}</div>
              <div className={styles.productLinks}>
                {group.items.map((item) => {
                  const isActive = isNavItemActive(pathname, item);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(styles.navItemLink, isActive && styles.navItemLinkActive)}
                      onClick={onNavigate}
                      aria-current={markCurrent && isActive ? "page" : undefined}
                      data-active={isActive ? "true" : "false"}
                    >
                      <span className={styles.navItemText}>{item.label}</span>
                      {item.description && <span className={styles.navItemDescription}>{item.description}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
