"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Truck,
  Package,
  Clock,
  CheckCircle2,
  X,
  Search,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getTodayFormatted } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";

const moduleNames: Record<string, { label: string }> = {
  "/dashboard": { label: "Dashboard" },
  "/pedidos": { label: "Pedidos" },
  "/catalogo": { label: "Catálogo" },
  "/stock": { label: "Stock / Inventario" },
  "/cobranzas": { label: "Cobranzas" },
  "/compras": { label: "Compras" },
  "/comprobantes": { label: "Comprobantes" },
  "/caja": { label: "Caja" },
  "/logistica": { label: "Logística" },
  "/clientes": { label: "Clientes" },
  "/reportes": { label: "Reportes" },
  "/equipo": { label: "Equipo" },
  "/configuracion": { label: "Configuración" },
  "/auditoria": { label: "Auditoría" },
  "/integraciones": { label: "Integraciones" },
};

function getModuleLabel(pathname: string): string {
  if (moduleNames[pathname]) return moduleNames[pathname].label;
  const base = "/" + pathname.split("/")[1];
  if (moduleNames[base]) return moduleNames[base].label;
  return "Dashboard";
}

interface Notification {
  id: string;
  tipo: "alerta" | "pedido" | "cobranza" | "logistica" | "stock";
  titulo: string;
  descripcion: string;
  tiempo: string;
  leida: boolean;
  href?: string;
}

const notificacionesIniciales: Notification[] = [
  {
    id: "notif1",
    tipo: "alerta",
    titulo: "Stock critico: Fernet Branca 750ml",
    descripcion: "Quedan 12 unidades. Minimo configurado: 20. Contactar a Fratelli Branca.",
    tiempo: "Hace 15 min",
    leida: false,
    href: "/stock",
  },
  {
    id: "notif2",
    tipo: "pedido",
    titulo: "3 pedidos sin confirmar hace +2hs",
    descripcion: "Pedidos #10045, #10052, #10058 esperan confirmacion desde las 7:30.",
    tiempo: "Hace 2 hs",
    leida: false,
    href: "/pedidos",
  },
  {
    id: "notif3",
    tipo: "cobranza",
    titulo: "Hotel Riviera supero los 60 dias de deuda",
    descripcion: "Saldo: $890.000. Sin respuesta a llamadas. Evaluar accion legal.",
    tiempo: "Hace 3 hs",
    leida: false,
    href: "/cobranzas",
  },
  {
    id: "notif4",
    tipo: "logistica",
    titulo: "Miguel Torres confirmo 2 entregas",
    descripcion: "Autoservicio Familiar (09:15) y Mayorista Central (10:20) entregados correctamente.",
    tiempo: "Hace 45 min",
    leida: true,
    href: "/logistica",
  },
  {
    id: "notif5",
    tipo: "stock",
    titulo: "Sin stock: Arroz Gallo Oro 1kg",
    descripcion: "Producto agotado. 3 pedidos pendientes incluyen este producto.",
    tiempo: "Hace 1 hs",
    leida: false,
    href: "/stock",
  },
  {
    id: "notif6",
    tipo: "pedido",
    titulo: "Nuevo pedido desde portal",
    descripcion: "Restaurante Don Julio realizo pedido #10054 por $234.640 via portal de clientes.",
    tiempo: "Hace 30 min",
    leida: true,
    href: "/pedidos",
  },
  {
    id: "notif7",
    tipo: "cobranza",
    titulo: "Pago recibido: Kiosco 24hs",
    descripcion: "$45.000 via MercadoPago. Cuenta al dia.",
    tiempo: "Hace 20 min",
    leida: true,
    href: "/cobranzas",
  },
];

const tipoConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  alerta: { icon: AlertTriangle, color: "text-red-500 dark:text-red-400", bg: "bg-red-500/10 dark:bg-red-500/15" },
  pedido: { icon: ShoppingCart, color: "text-p3 dark:text-p2", bg: "bg-p3/15 dark:bg-p3/20" },
  cobranza: { icon: DollarSign, color: "text-p3 dark:text-p2", bg: "bg-p2/20 dark:bg-p2/15" },
  logistica: { icon: Truck, color: "text-p3 dark:text-p2", bg: "bg-p3/15 dark:bg-p3/20" },
  stock: { icon: Package, color: "text-p3 dark:text-p2", bg: "bg-p2/15 dark:bg-p2/10" },
};

export function DashboardHeader() {
  const pathname = usePathname();
  const moduleLabel = getModuleLabel(pathname);
  const [notificaciones, setNotificaciones] = useState(notificacionesIniciales);
  const { setOpen: setCommandOpen } = useCommandPalette();
  const [shortcutLabel, setShortcutLabel] = useState("⌘K");
  useEffect(() => {
    if (typeof navigator !== "undefined" && !/Mac|iPhone|iPad/.test(navigator.platform)) {
      setShortcutLabel("Ctrl+K");
    }
  }, []);

  const sinLeer = notificaciones.filter((n) => !n.leida).length;

  const marcarLeida = (id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const marcarTodasLeidas = () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  const eliminar = (id: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-card sticky top-0 z-10 w-full shrink-0">
      <div className="flex items-center gap-3 shrink-0">
        <SidebarTrigger className="-ml-2" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{moduleLabel}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="hidden sm:flex items-center gap-2 flex-1 max-w-md h-8 px-3 rounded-md border bg-background/40 hover:bg-background hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
        title={`Buscar (${shortcutLabel})`}
      >
        <Search className="size-3.5 shrink-0" />
        <span className="text-sm truncate">Buscar o ejecutar acción...</span>
        <span className="ml-auto flex items-center gap-0.5 shrink-0">
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border bg-muted text-muted-foreground">
            {shortcutLabel}
          </kbd>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="sm:hidden size-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
        title="Buscar"
      >
        <Search className="size-4" />
      </button>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {getTodayFormatted()}
        </span>

        {/* Notificaciones */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 relative">
              <Bell className="size-4" />
              {sinLeer > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-semibold shadow-sm">
                  {sinLeer}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[380px] p-0 overflow-hidden"
            sideOffset={8}
          >
            {/* Header del panel */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Notificaciones</h3>
                {sinLeer > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-600 text-white leading-none">
                    {sinLeer}
                  </span>
                )}
              </div>
              {sinLeer > 0 && (
                <button
                  onClick={marcarTodasLeidas}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Marcar todas leidas
                </button>
              )}
            </div>

            {/* Lista de notificaciones */}
            <div className="max-h-[420px] overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <CheckCircle2 className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin notificaciones</p>
                </div>
              ) : (
                notificaciones.map((notif) => {
                  const config = tipoConfig[notif.tipo];
                  const Icon = config.icon;

                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        "group relative flex gap-3 px-4 py-3 border-b border-border/50 transition-colors",
                        !notif.leida
                          ? "bg-primary/[0.03] dark:bg-primary/[0.04]"
                          : "hover:bg-muted/40"
                      )}
                    >
                      {/* Dot de no leida */}
                      {!notif.leida && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
                      )}

                      {/* Icono */}
                      <div className={cn(
                        "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        config.bg
                      )}>
                        <Icon className={cn("size-4", config.color)} />
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        {notif.href ? (
                          <Link
                            href={notif.href}
                            onClick={() => marcarLeida(notif.id)}
                            className="block"
                          >
                            <p className={cn(
                              "text-sm leading-snug",
                              !notif.leida ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                            )}>
                              {notif.titulo}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {notif.descripcion}
                            </p>
                          </Link>
                        ) : (
                          <>
                            <p className={cn(
                              "text-sm leading-snug",
                              !notif.leida ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                            )}>
                              {notif.titulo}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {notif.descripcion}
                            </p>
                          </>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            {notif.tiempo}
                          </span>
                        </div>
                      </div>

                      {/* Acciones hover */}
                      <div className="flex items-start gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.leida && (
                          <button
                            onClick={() => marcarLeida(notif.id)}
                            className="size-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Marcar como leida"
                          >
                            <CheckCircle2 className="size-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => eliminar(notif.id)}
                          className="size-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Eliminar"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
        <Avatar className="size-8">
          <AvatarFallback className="bg-p3 text-white font-bold text-xs">CM</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
