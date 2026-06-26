import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import tyreflyLogo from "@/assets/tyrefly-logo.png";
import { X } from "lucide-react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  CreditCard,
  Activity,
  Map,
  Radio,
  LogOut,
  Sparkles,
  Bot,
  Wrench,
  BarChart3,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Overview", url: "/admin/dashboard", icon: LayoutDashboard, end: true },
  { title: "Command Center", url: "/admin/dashboard/command", icon: Radio },
  { title: "Jobs", url: "/admin/dashboard/jobs", icon: Briefcase },
  { title: "Quotes", url: "/admin/dashboard/quotes", icon: FileText },
  { title: "Payments", url: "/admin/dashboard/payments", icon: CreditCard },
  { title: "Technicians", url: "/admin/dashboard/technicians", icon: Users },
  { title: "Activity", url: "/admin/dashboard/activity", icon: Activity },
  { title: "Reports", url: "/admin/dashboard/reports", icon: BarChart3 },
  { title: "AI Instructions (Customer)", url: "/admin/dashboard/ai-settings", icon: Sparkles },
  { title: "AI Instructions (Admin)", url: "/admin/dashboard/admin-ai-instructions", icon: Bot },
  { title: "AI Instructions (Technician)", url: "/admin/dashboard/technician-ai-instructions", icon: Wrench },
  { title: "Settings", url: "/admin/dashboard/settings", icon: Settings },
];

function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };
  return (
    <Sidebar
      collapsible="offcanvas"
      className="bg-background border-r border-border"
      style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
    >
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src={tyreflyLogo} alt="TyreFly" className="h-6 w-6 object-contain" />
          <span className="font-bold text-white text-sm">Tyre Fly</span>
        </div>
        <button
          type="button"
          onClick={() => setOpenMobile(false)}
          className="md:hidden text-white/60 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </SidebarHeader>

      <SidebarContent>
        <div className="px-3 py-4">
          {!collapsed && (
            <div>
              <div className="text-xs text-muted-foreground">Admin Dashboard</div>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      onClick={closeOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 ${isActive ? "bg-primary/15 text-primary" : "hover:bg-muted/40"}`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin" onClick={closeOnMobile} className="flex items-center gap-2 hover:bg-muted/40">
                    <Map className="h-4 w-4" />
                    {!collapsed && <span>Live Console</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) navigate("/admin/login", { replace: true });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) {
        toast.error("Admin role required");
        if (!cancelled) navigate("/admin/login", { replace: true });
        return;
      }
      if (!cancelled) setAuthChecked(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate("/admin/login", { replace: true });
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="dark">
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border/60 bg-background/80 px-2 backdrop-blur sm:px-3">
              <SidebarTrigger />
              <div className="ml-2 hidden text-sm font-medium text-muted-foreground sm:block">Admin</div>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/admin/login");
                  }}
                >
                  <LogOut className="mr-1 h-4 w-4" /> Sign out
                </Button>
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
