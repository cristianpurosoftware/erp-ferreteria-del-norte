import type { LucideIcon } from "lucide-react";
import {
  Plus,
  UserPlus,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  FileText,
  FileMinus,
  FilePlus,
  MapPin,
  Tag,
  Users,
} from "lucide-react";

export interface CommandAction {
  id: string;
  title: string;
  section: string;
  icon: LucideIcon;
  href: string;
  keywords: string;
}

// v1 strategy: actions navigate with `?new=1`. Each list page is expected
// to open its create-drawer when it sees this query param. This keeps the
// palette decoupled from each form's internal state.
export const COMMAND_ACTIONS: CommandAction[] = [
  {
    id: "new-customer",
    title: "Nuevo cliente",
    section: "Crear",
    icon: UserPlus,
    href: "/clientes?new=1",
    keywords: "nuevo cliente crear customer alta",
  },
  {
    id: "new-order",
    title: "Nuevo pedido",
    section: "Crear",
    icon: ShoppingCart,
    href: "/pedidos?new=1",
    keywords: "nuevo pedido crear order venta",
  },
  {
    id: "new-product",
    title: "Nuevo producto",
    section: "Crear",
    icon: Package,
    href: "/catalogo?new=1",
    keywords: "nuevo producto alta catalogo sku",
  },
  {
    id: "new-supplier",
    title: "Nuevo proveedor",
    section: "Crear",
    icon: Plus,
    href: "/compras/proveedores?new=1",
    keywords: "nuevo proveedor alta supplier",
  },
  {
    id: "new-purchase",
    title: "Nueva orden de compra",
    section: "Crear",
    icon: Plus,
    href: "/compras?new=1",
    keywords: "nueva orden compra purchase po",
  },
  {
    id: "new-shipment",
    title: "Nuevo envío",
    section: "Crear",
    icon: Truck,
    href: "/logistica/envios?new=1",
    keywords: "nuevo envio shipment despacho",
  },
  {
    id: "new-invoice",
    title: "Nueva factura",
    section: "Crear",
    icon: Receipt,
    href: "/comprobantes?new=1",
    keywords: "nueva factura invoice comprobante",
  },
  {
    id: "new-delivery-note",
    title: "Nuevo remito",
    section: "Crear",
    icon: FileText,
    href: "/comprobantes/remitos?new=1",
    keywords: "nuevo remito delivery note",
  },
  {
    id: "new-credit-note",
    title: "Nueva nota de crédito",
    section: "Crear",
    icon: FileMinus,
    href: "/comprobantes/notas-credito?new=1",
    keywords: "nueva nota credito credit note devolucion",
  },
  {
    id: "new-debit-note",
    title: "Nueva nota de débito",
    section: "Crear",
    icon: FilePlus,
    href: "/comprobantes/notas-debito?new=1",
    keywords: "nueva nota debito debit note ajuste",
  },
  {
    id: "new-sales-zone",
    title: "Nueva zona de venta",
    section: "Crear",
    icon: MapPin,
    href: "/comercial/zonas?new=1",
    keywords: "nueva zona venta sales zone",
  },
  {
    id: "new-promotion",
    title: "Nueva promoción",
    section: "Crear",
    icon: Tag,
    href: "/comercial/promociones?new=1",
    keywords: "nueva promocion promotion descuento",
  },
  {
    id: "new-user",
    title: "Nuevo usuario",
    section: "Crear",
    icon: Users,
    href: "/equipo?tab=usuarios&new=1",
    keywords: "nuevo usuario alta user equipo",
  },
];
