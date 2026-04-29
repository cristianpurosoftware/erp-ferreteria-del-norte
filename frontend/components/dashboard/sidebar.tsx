"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ScanLine,
  ShoppingCart,
  Package,
  Warehouse,
  DollarSign,
  Users,
  BarChart3,
  UserCog,
  Building2,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  ShoppingBag,
  FileText,
  FileMinus,
  FilePlus,
  Banknote,
  Shield,
  Plug,
  MapPin,
  Route as RouteIcon,
  Tag,
  Tags,
  Ruler,
  CreditCard,
  Vault,
  Palette,
  Percent,
  Truck,
  Send,
  ClipboardList,
  Receipt,
  Landmark,
  Undo2,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/login/actions";

export interface NavLeaf {
  title: string;
  icon: LucideIcon;
  href: string;
  /**
   * When present, the leaf only renders if the session includes this permission.
   * Leaves without a permission field are always visible.
   */
  permission?: string;
  /**
   * When true, active state requires an exact pathname match — subroutes
   * don't keep this leaf highlighted. Useful when a parent path also has
   * sibling subroutes (e.g. `/comprobantes` vs `/comprobantes/remitos`).
   */
  exact?: boolean;
}

export interface NavBranch {
  title: string;
  icon: LucideIcon;
  children: NavLeaf[];
}

export type NavItem = NavLeaf | NavBranch;

export function isBranch(item: NavItem): item is NavBranch {
  return "children" in item;
}

export interface NavGroup {
  key: string;
  label: string;
  defaultOpen: boolean;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "operaciones",
    label: "Operaciones",
    defaultOpen: true,
    items: [
      { title: "Mostrador", icon: ScanLine, href: "/pos" },
      { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { title: "Pedidos", icon: ShoppingCart, href: "/pedidos" },
      { title: "Catálogo", icon: Package, href: "/catalogo" },
      {
        title: "Stock",
        icon: Warehouse,
        children: [
          { title: "Niveles", icon: BarChart3, href: "/stock/niveles" },
          { title: "Lotes", icon: Package, href: "/stock/lotes" },
          { title: "Ubicaciones", icon: MapPin, href: "/stock/ubicaciones" },
          { title: "Vencimientos", icon: Receipt, href: "/stock/vencimientos" },
          { title: "Movimientos", icon: Send, href: "/stock/movimientos" },
        ],
      },
      { title: "Caja", icon: Banknote, href: "/caja" },
    ],
  },
  {
    key: "comercial",
    label: "Comercial",
    defaultOpen: false,
    items: [
      { title: "Clientes", icon: Users, href: "/clientes" },
      {
        title: "Territorio",
        icon: MapPin,
        children: [
          { title: "Zonas", icon: MapPin, href: "/comercial/zonas" },
          { title: "Rutas", icon: RouteIcon, href: "/comercial/rutas" },
        ],
      },
      {
        title: "Incentivos",
        icon: Tag,
        children: [
          { title: "Promociones", icon: Tag, href: "/comercial/promociones" },
          { title: "Comisiones", icon: Percent, href: "/comercial/comisiones" },
        ],
      },
    ],
  },
  {
    key: "logistica",
    label: "Logística",
    defaultOpen: false,
    items: [
      { title: "Picking", icon: ClipboardList, href: "/logistica/picking" },
      { title: "Envíos", icon: Send, href: "/logistica/envios" },
      { title: "Hojas de ruta", icon: Receipt, href: "/logistica/hojas-de-ruta" },
      {
        title: "Flota",
        icon: Truck,
        children: [
          { title: "Vehículos", icon: Truck, href: "/logistica/vehiculos" },
          { title: "Choferes", icon: UserCog, href: "/logistica/choferes" },
        ],
      },
      {
        title: "Inversa",
        icon: Undo2,
        children: [
          { title: "Devoluciones", icon: Package, href: "/logistica/devoluciones" },
          { title: "Conteos", icon: Warehouse, href: "/logistica/conteos" },
        ],
      },
    ],
  },
  {
    key: "administracion",
    label: "Administración",
    defaultOpen: false,
    items: [
      {
        title: "Cobranzas",
        icon: DollarSign,
        children: [
          { title: "Cuentas corrientes", icon: Users, href: "/cobranzas/cuentas-corrientes" },
          { title: "Pagos registrados", icon: Banknote, href: "/cobranzas/pagos-registrados" },
        ],
      },
      {
        title: "Compras",
        icon: ShoppingBag,
        children: [
          { title: "Órdenes de compra", icon: ShoppingCart, href: "/compras" },
          { title: "Remitos", icon: Receipt, href: "/compras/remitos-proveedor" },
          { title: "Facturas", icon: FileText, href: "/compras/facturas" },
          { title: "Reclamos", icon: ClipboardList, href: "/compras/reclamos" },
        ],
      },
      {
        title: "Comprobantes",
        icon: FileText,
        children: [
          { title: "Facturas", icon: FileText, href: "/comprobantes", exact: true },
          { title: "Remitos", icon: Receipt, href: "/comprobantes/remitos" },
          { title: "Notas de crédito", icon: FileMinus, href: "/comprobantes/notas-credito" },
          { title: "Notas de débito", icon: FilePlus, href: "/comprobantes/notas-debito" },
          { title: "Autorizaciones fiscales", icon: Shield, href: "/fiscal/autorizaciones" },
        ],
      },
    ],
  },
  {
    key: "tesoreria",
    label: "Tesorería",
    defaultOpen: false,
    items: [
      { title: "Cuentas bancarias", icon: Landmark, href: "/tesoreria/cuentas-bancarias" },
      { title: "Cheques", icon: Banknote, href: "/tesoreria/cheques" },
      { title: "Conciliación", icon: Receipt, href: "/tesoreria/conciliacion" },
      { title: "Retenciones", icon: Receipt, href: "/tesoreria/retenciones" },
      {
        title: "Pagos",
        icon: Send,
        children: [
          { title: "Órdenes de pago", icon: DollarSign, href: "/tesoreria/ordenes-pago" },
          { title: "Batches de pago", icon: FileText, href: "/tesoreria/batches" },
          { title: "Rendiciones", icon: FileText, href: "/tesoreria/rendiciones" },
        ],
      },
    ],
  },
  {
    key: "gestion",
    label: "Gestión",
    defaultOpen: false,
    items: [
      {
        title: "Reportes",
        icon: BarChart3,
        children: [
          { title: "Ventas", icon: DollarSign, href: "/reportes/ventas" },
          { title: "Rentabilidad", icon: Percent, href: "/reportes/rentabilidad" },
          { title: "Cobranzas", icon: Receipt, href: "/reportes/cobranzas" },
          { title: "Stock", icon: Warehouse, href: "/reportes/stock" },
          { title: "Avanzados", icon: BarChart3, href: "/reportes/avanzados" },
        ],
      },
      {
        title: "Equipo",
        icon: UserCog,
        children: [
          { title: "Usuarios", icon: Users, href: "/equipo/usuarios" },
          { title: "Roles", icon: Shield, href: "/equipo/roles" },
          { title: "Actividad", icon: ClipboardList, href: "/equipo/actividad" },
        ],
      },
      {
        title: "Configuración",
        icon: Settings,
        children: [
          { title: "Empresa", icon: Building2, href: "/configuracion/empresa" },
          { title: "Sucursales", icon: MapPin, href: "/configuracion/sucursales" },
          { title: "Depósitos", icon: Warehouse, href: "/configuracion/depositos" },
          { title: "Categorías", icon: Tags, href: "/configuracion/categorias" },
          { title: "Marcas", icon: Palette, href: "/configuracion/marcas" },
          { title: "Unidades", icon: Ruler, href: "/configuracion/unidades" },
          { title: "Impuestos", icon: Percent, href: "/configuracion/impuestos" },
          { title: "Tipos de comprobante", icon: FileText, href: "/configuracion/tipos-comprobante" },
          { title: "Condiciones de pago", icon: CreditCard, href: "/configuracion/condiciones-pago" },
          { title: "Métodos de pago", icon: CreditCard, href: "/configuracion/metodos-pago" },
          { title: "Cajas", icon: Vault, href: "/configuracion/cajas" },
          { title: "Listas de precio", icon: DollarSign, href: "/configuracion/listas-precio" },
          { title: "Jurisdicciones", icon: Landmark, href: "/configuracion/jurisdicciones" },
        ],
      },
      { title: "Auditoría", icon: Shield, href: "/auditoria" },
      { title: "Integraciones", icon: Plug, href: "/integraciones" },
    ],
  },
  {
    key: "soporte",
    label: "Soporte",
    defaultOpen: false,
    items: [
      { title: "Tickets", icon: LifeBuoy, href: "/soporte", permission: "support_tickets:view" },
    ],
  },
];


interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
  companyName?: string;
  branches?: Array<{ id: string; name: string }>;
  userName?: string;
  userInitials?: string;
  userRole?: string;
}

function isLeafActive(
  pathname: string,
  currentSearch: URLSearchParams,
  href: string,
  exact = false
): boolean {
  const [path, query] = href.split("?");
  const pathMatch = exact
    ? pathname === path
    : pathname === path || pathname.startsWith(path + "/");
  if (!pathMatch) return false;
  if (!query) {
    // Leaf without ?tab — active only when URL also has no tab param.
    // Prevents the "parent" (e.g. /cobranzas) from highlighting when a child
    // (?tab=pagos-registrados) is selected.
    return !currentSearch.has("tab");
  }
  const params = new URLSearchParams(query);
  for (const [key, value] of params) {
    if (currentSearch.get(key) !== value) return false;
  }
  return true;
}

function branchHasActive(
  pathname: string,
  currentSearch: URLSearchParams,
  branch: NavBranch
): boolean {
  return branch.children.some((leaf) =>
    isLeafActive(pathname, currentSearch, leaf.href, leaf.exact)
  );
}

function groupHasActive(
  pathname: string,
  currentSearch: URLSearchParams,
  group: NavGroup
): boolean {
  return group.items.some((item) =>
    isBranch(item)
      ? branchHasActive(pathname, currentSearch, item)
      : isLeafActive(pathname, currentSearch, item.href)
  );
}

function usePersistedCollapsible(
  storageKey: string,
  defaultOpen: boolean,
  autoOpen: boolean
) {
  const [open, setOpen] = useState<boolean>(defaultOpen || autoOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null) {
      if (stored === "0" && autoOpen) setOpen(true);
      else setOpen(stored === "1");
    } else if (autoOpen) {
      setOpen(true);
    }
  }, [storageKey, autoOpen]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      }
      return next;
    });
  };

  return { open, toggle };
}

function BranchMenuItem({
  branch,
  groupKey,
  pathname,
  currentSearch,
}: {
  branch: NavBranch;
  groupKey: string;
  pathname: string;
  currentSearch: URLSearchParams;
}) {
  const hasActive = branchHasActive(pathname, currentSearch, branch);
  const storageKey = `sidebar:branch:${groupKey}:${branch.title}:open`;
  const { open, toggle } = usePersistedCollapsible(storageKey, false, hasActive);

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={toggle}
          isActive={hasActive && !open}
          className="h-8"
          tooltip={branch.title}
        >
          <branch.icon
            className={cn(
              "size-4 shrink-0",
              hasActive ? "text-primary" : "text-p2"
            )}
          />
          <span className="text-[13px] truncate flex-1 text-left">
            {branch.title}
          </span>
          {open ? (
            <ChevronDown className="size-3 shrink-0 text-sidebar-foreground/50" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-sidebar-foreground/50" />
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
      {open && (
        <SidebarMenuSub>
          {branch.children.map((leaf) => {
            const active = isLeafActive(pathname, currentSearch, leaf.href, leaf.exact);
            return (
              <SidebarMenuSubItem key={leaf.href}>
                <SidebarMenuSubButton asChild isActive={active}>
                  <Link href={leaf.href}>
                    <leaf.icon
                      className={cn(
                        "size-3.5 shrink-0",
                        active ? "text-primary" : "text-p2"
                      )}
                    />
                    <span className="text-[13px] truncate">{leaf.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      )}
    </>
  );
}

function LeafMenuItem({
  leaf,
  pathname,
  currentSearch,
}: {
  leaf: NavLeaf;
  pathname: string;
  currentSearch: URLSearchParams;
}) {
  const active = isLeafActive(pathname, currentSearch, leaf.href, leaf.exact);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        className="h-8"
        tooltip={leaf.title}
      >
        <Link href={leaf.href}>
          <leaf.icon
            className={cn(
              "size-4 shrink-0",
              active ? "text-primary" : "text-p2"
            )}
          />
          <span className="text-[13px] truncate">{leaf.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapsibleNavGroup({
  group,
  pathname,
  currentSearch,
}: {
  group: NavGroup;
  pathname: string;
  currentSearch: URLSearchParams;
}) {
  const hasActive = groupHasActive(pathname, currentSearch, group);
  const storageKey = `sidebar:group:${group.key}:open`;
  const { open, toggle } = usePersistedCollapsible(
    storageKey,
    group.defaultOpen,
    hasActive
  );

  if (group.items.length === 0) return null;

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel
        asChild
        className="text-[11px] text-sidebar-foreground/60 px-2 mb-0.5 cursor-pointer select-none hover:text-sidebar-foreground hover:bg-sidebar-accent/40 rounded-md transition-colors"
      >
        <button
          type="button"
          onClick={toggle}
          className="w-full flex items-center gap-1 justify-between"
        >
          <span className="flex items-center gap-1">
            {open ? (
              <ChevronDown className="size-3 shrink-0" />
            ) : (
              <ChevronRight className="size-3 shrink-0" />
            )}
            {group.label}
          </span>
          {!open && hasActive && (
            <span className="size-1.5 rounded-full bg-primary" />
          )}
        </button>
      </SidebarGroupLabel>
      {open && (
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item) =>
              isBranch(item) ? (
                <BranchMenuItem
                  key={item.title}
                  branch={item}
                  groupKey={group.key}
                  pathname={pathname}
                  currentSearch={currentSearch}
                />
              ) : (
                <LeafMenuItem
                  key={item.href}
                  leaf={item}
                  pathname={pathname}
                  currentSearch={currentSearch}
                />
              )
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}

export function DashboardSidebar({
  companyName = "ERP",
  branches = [],
  userName = "Usuario",
  userInitials = "U",
  userRole = "Admin",
  ...props
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParamsRaw = useSearchParams();
  const currentSearch = new URLSearchParams(searchParamsRaw?.toString() ?? "");
  const currentBranch = branches[0]?.name ?? "Sin sucursal";

  const { can } = usePermissions();
  const canRender = (leaf: NavLeaf) => !leaf.permission || can(leaf.permission);
  const visibleGroups = NAV_GROUPS
    .map((g) => ({
      ...g,
      items: g.items
        .map((item): NavItem | null => {
          if (isBranch(item)) {
            const children = item.children.filter(canRender);
            return children.length > 0 ? { ...item, children } : null;
          }
          return canRender(item) ? item : null;
        })
        .filter((x): x is NavItem => x !== null),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="!border-r-0" {...props}>
      {/* Header — company + branch selector */}
      <SidebarHeader className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 outline-none min-w-0 w-full rounded-md px-1.5 py-1 -mx-1.5 hover:bg-sidebar-accent transition-colors">
            <div className="size-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground shrink-0">
              <Building2 className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
              <p className="text-[13px] font-semibold text-sidebar-foreground truncate leading-tight">
                {companyName}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate leading-tight">
                {currentBranch}
              </p>
            </div>
            <ChevronDown className="size-3 text-sidebar-foreground/40 shrink-0 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Sucursales
            </DropdownMenuLabel>
            {branches.length > 0 ? (
              branches.map((b) => (
                <DropdownMenuItem key={b.id}>
                  <Building2 className="size-3.5 mr-2 text-primary" />
                  {b.name}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>Sin sucursales</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracion">
                <Settings className="size-3.5 mr-2" />
                Configuración
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 overflow-x-hidden">
        {visibleGroups.map((group, idx) => (
          <div key={group.key}>
            {idx > 0 && <SidebarSeparator />}
            <CollapsibleNavGroup
              group={group}
              pathname={pathname}
              currentSearch={currentSearch}
            />
          </div>
        ))}
      </SidebarContent>

      {/* Footer — user */}
      <SidebarFooter className="px-3 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-p3 text-primary-foreground font-bold text-[10px]">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="text-[13px] font-medium truncate text-sidebar-foreground leading-tight">
              {userName}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 capitalize leading-tight">
              {userRole}
            </p>
          </div>
          <form action={logoutAction} className="group-data-[collapsible=icon]:hidden">
            <button
              type="submit"
              title="Cerrar sesión"
              className="size-6 flex items-center justify-center rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="size-3.5" />
            </button>
          </form>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
