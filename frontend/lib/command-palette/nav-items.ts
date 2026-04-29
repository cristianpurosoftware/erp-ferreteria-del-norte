import type { LucideIcon } from "lucide-react";
import { NAV_GROUPS, isBranch } from "@/components/dashboard/sidebar";

export interface FlatNavItem {
  title: string;
  breadcrumb: string;
  href: string;
  icon: LucideIcon;
  keywords: string;
}

export function getFlatNavItems(): FlatNavItem[] {
  const items: FlatNavItem[] = [];

  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isBranch(item)) {
        for (const leaf of item.children) {
          items.push({
            title: leaf.title,
            breadcrumb: `${group.label} › ${item.title}`,
            href: leaf.href,
            icon: leaf.icon,
            keywords: `${group.label} ${item.title} ${leaf.title}`.toLowerCase(),
          });
        }
      } else {
        items.push({
          title: item.title,
          breadcrumb: group.label,
          href: item.href,
          icon: item.icon,
          keywords: `${group.label} ${item.title}`.toLowerCase(),
        });
      }
    }
  }

  return items;
}
