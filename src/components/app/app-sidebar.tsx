import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookOpen, Boxes, LayoutDashboard, Link2, Plug, Settings, TrendingUp } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";

const groups = [
  { label: "Vue d'ensemble", items: [
    { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  ] },
  { label: "Analytique", items: [
    { to: "/analytique", label: "Analytique", icon: BarChart3 },
    { to: "/evolution", label: "Évolution", icon: TrendingUp },
  ] },
  { label: "Gestion", items: [
    { to: "/saas", label: "SaaS", icon: Boxes },
    { to: "/affiliation", label: "Affiliation", icon: Link2 },
    { to: "/integrations", label: "Intégrations", icon: Plug },
  ] },
  { label: "Ressources", items: [
    { to: "/documentation", label: "Documentation", icon: BookOpen },
  ] },
] as const;

const btn = "h-10 gap-3 rounded-lg px-3 text-[0.925rem] [&>svg]:size-[1.15rem] data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium";

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile } = useSidebar();
  const close = () => setOpenMobile(false);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <Logo className="group-data-[collapsible=icon]:[&>span]:hidden" />
      </SidebarHeader>
      <SidebarSeparator className="mx-0" />
      <SidebarContent className="gap-2 px-2 py-4">
        {groups.map((g) => (
          <SidebarGroup key={g.label} className="py-1">
            <SidebarGroupLabel className="mb-1 px-3 text-[0.7rem] font-semibold tracking-wider uppercase">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {g.items.map((i) => (
                  <SidebarMenuItem key={i.to}>
                    <SidebarMenuButton asChild isActive={path.startsWith(i.to)} tooltip={i.label} className={btn}>
                      <Link to={i.to} onClick={close}>
                        <i.icon />
                        <span>{i.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator className="mx-0" />
      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={path.startsWith("/parametres")} tooltip="Paramètres" className={btn}>
              <Link to="/parametres" onClick={close}>
                <Settings />
                <span>Paramètres</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
