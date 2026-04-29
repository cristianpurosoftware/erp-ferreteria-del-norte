import type { LucideIcon } from "lucide-react";
import {
  Users,
  Package,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  FileText,
  UserCog,
  Send,
  Circle,
} from "lucide-react";

export const ENTITY_ICONS: Record<string, LucideIcon> = {
  customer: Users,
  product: Package,
  supplier: ShoppingBag,
  order: ShoppingCart,
  invoice: Receipt,
  "supplier-invoice": FileText,
  user: UserCog,
  shipment: Send,
};

export function getEntityIcon(type: string): LucideIcon {
  return ENTITY_ICONS[type] ?? Circle;
}
