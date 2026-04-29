import { cookies } from "next/headers";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { getCompany, getBranches } from "@/lib/actions/settings";
import { getCurrentUser } from "@/lib/actions/team";
import { PermissionsProvider } from "@/hooks/use-permissions";
import { safe } from "@/lib/safe";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [company, branchesResult, user, cookieStore] = await Promise.all([
    safe(getCompany(), null),
    safe(getBranches({ limit: 50 }), { items: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } }),
    safe(getCurrentUser(), null),
    cookies(),
  ]);
  const permissions = (user as { permissions?: string[] } | null)?.permissions ?? [];

  const companyName = company?.nombre_comercial || company?.razon_social || "ERP";
  const branches = branchesResult.items;
  const userName = user ? `${user.first_name} ${user.last_name}` : "Usuario";
  const userInitials = user
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    : "U";

  const savedWidth = cookieStore.get("sidebar:width")?.value;
  const savedOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <PermissionsProvider permissions={permissions}>
    <SidebarProvider
      className="bg-sidebar"
      defaultOpen={savedOpen}
      defaultWidth={savedWidth}
    >
      <CommandPaletteProvider>
        <DashboardSidebar
          companyName={companyName}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          userName={userName}
          userInitials={userInitials}
          userRole={user?.role?.name}
        />
        <div className="h-svh overflow-hidden lg:p-2 w-full">
          <div className="lg:border lg:rounded-md overflow-hidden flex flex-col h-full w-full bg-background">
            <DashboardHeader />
            <main className="w-full flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
        <CommandPalette />
      </CommandPaletteProvider>
    </SidebarProvider>
    </PermissionsProvider>
  );
}
