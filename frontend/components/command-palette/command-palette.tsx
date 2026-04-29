"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCommandPalette } from "./command-palette-provider";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getFlatNavItems } from "@/lib/command-palette/nav-items";
import { COMMAND_ACTIONS } from "@/lib/command-palette/actions";
import { getEntityIcon } from "@/lib/command-palette/entity-icons";
import { searchEntities, type SearchGroup } from "@/lib/actions/search";

type Mode = "all" | "nav" | "actions" | "entities";

function parseMode(raw: string): { mode: Mode; query: string } {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith(">")) return { mode: "actions", query: trimmed.slice(1).trimStart() };
  if (trimmed.startsWith("@")) return { mode: "nav", query: trimmed.slice(1).trimStart() };
  if (trimmed.startsWith("#")) return { mode: "entities", query: trimmed.slice(1).trimStart() };
  return { mode: "all", query: trimmed };
}

export function CommandPalette() {
  const router = useRouter();
  const { open, setOpen } = useCommandPalette();
  const [raw, setRaw] = React.useState("");
  const [remoteGroups, setRemoteGroups] = React.useState<SearchGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const lastRequestId = React.useRef(0);

  const { mode, query } = parseMode(raw);
  const q = query.toLowerCase();

  const navItems = React.useMemo(() => getFlatNavItems(), []);

  React.useEffect(() => {
    if (!open) {
      setRaw("");
      setRemoteGroups([]);
      setLoading(false);
    }
  }, [open]);

  const filteredNav = React.useMemo(() => {
    if (mode === "actions" || mode === "entities") return [];
    if (!q) return navItems.slice(0, 8);
    return navItems.filter((item) => item.keywords.includes(q)).slice(0, 12);
  }, [navItems, q, mode]);

  const filteredActions = React.useMemo(() => {
    if (mode === "nav" || mode === "entities") return [];
    if (!q) return mode === "actions" ? COMMAND_ACTIONS : COMMAND_ACTIONS.slice(0, 5);
    return COMMAND_ACTIONS.filter((a) => a.keywords.includes(q));
  }, [q, mode]);

  const fetchRemote = useDebouncedCallback(async (value: string) => {
    const requestId = ++lastRequestId.current;
    try {
      const res = await searchEntities(value, { limit: 5 });
      if (requestId !== lastRequestId.current) return;
      setRemoteGroups(res.groups);
    } catch {
      if (requestId !== lastRequestId.current) return;
      setRemoteGroups([]);
    } finally {
      if (requestId === lastRequestId.current) setLoading(false);
    }
  }, 150);

  React.useEffect(() => {
    if (mode === "actions" || mode === "nav") {
      setRemoteGroups([]);
      setLoading(false);
      return;
    }
    if (query.length < 2) {
      setRemoteGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchRemote(query);
  }, [query, mode, fetchRemote]);

  const runHref = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen]
  );

  const placeholder =
    mode === "actions"
      ? "Buscar acciones..."
      : mode === "nav"
      ? "Ir a..."
      : mode === "entities"
      ? "Buscar clientes, pedidos, productos..."
      : "Buscar o ejecutar una acción...  (> acciones · @ navegar · # buscar)";

  const hasAnything =
    filteredNav.length > 0 ||
    filteredActions.length > 0 ||
    remoteGroups.some((g) => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogHeader className="sr-only">
        <DialogTitle>Paleta de comandos</DialogTitle>
        <DialogDescription>
          Busca entidades, navega entre módulos o ejecuta acciones.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0">
        <Command
          shouldFilter={false}
          className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput
        placeholder={placeholder}
        value={raw}
        onValueChange={setRaw}
      />
      <CommandList>
        {!hasAnything && !loading && (
          <CommandEmpty>
            {query.length === 0
              ? "Escribí algo para empezar..."
              : "Sin resultados."}
          </CommandEmpty>
        )}

        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Buscando...
          </div>
        )}

        {filteredActions.length > 0 && (
          <CommandGroup heading="Acciones">
            {filteredActions.map((action) => (
              <CommandItem
                key={action.id}
                value={action.id}
                onSelect={() => runHref(action.href)}
              >
                <action.icon className="text-primary" />
                <span>{action.title}</span>
                <CommandShortcut>{action.section}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredActions.length > 0 && filteredNav.length > 0 && <CommandSeparator />}

        {filteredNav.length > 0 && (
          <CommandGroup heading="Navegación">
            {filteredNav.map((item) => (
              <CommandItem
                key={item.href}
                value={item.href}
                onSelect={() => runHref(item.href)}
              >
                <item.icon />
                <span>{item.title}</span>
                <CommandShortcut>{item.breadcrumb}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {remoteGroups.map((group, idx) => {
          if (group.items.length === 0) return null;
          const Icon = getEntityIcon(group.type);
          const showSeparator =
            idx === 0 && (filteredNav.length > 0 || filteredActions.length > 0);
          return (
            <React.Fragment key={group.type}>
              {showSeparator && <CommandSeparator />}
              <CommandGroup heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={`${group.type}:${item.id}`}
                    value={`${group.type}:${item.id}`}
                    onSelect={() => runHref(item.href)}
                  >
                    <Icon />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          );
        })}
        </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
