import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import JobStatus from "./pages/JobStatus.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import Confirmed from "./pages/Confirmed.tsx";
import NotFound from "./pages/NotFound.tsx";
import TechnicianLogin from "./pages/TechnicianLogin.tsx";
import TechnicianOnboarding from "./pages/TechnicianOnboarding.tsx";
import TechnicianDashboard from "./pages/TechnicianDashboard.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Console from "./pages/Console.tsx";
import AreasIndex from "./pages/AreasIndex.tsx";
import AreaPage from "./pages/AreaPage.tsx";
import ShortLinkRedirect from "./pages/ShortLinkRedirect.tsx";
import DashboardLayout from "./pages/admin/DashboardLayout.tsx";
import Overview from "./pages/admin/Overview.tsx";
import JobsPage from "./pages/admin/JobsPage.tsx";
import QuotesPage from "./pages/admin/QuotesPage.tsx";
import PaymentsPage from "./pages/admin/PaymentsPage.tsx";
import TechniciansPage from "./pages/admin/TechniciansPage.tsx";
import ActivityPage from "./pages/admin/ActivityPage.tsx";
import AISettingsPage from "./pages/admin/AISettingsPage.tsx";
import CommandCenter from "./pages/admin/CommandCenter.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/areas" element={<AreasIndex />} />
        <Route path="/areas/:slug" element={<AreaPage />} />
        <Route path="/job/:id" element={<JobStatus />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Console />} />
        <Route path="/admin/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="technicians" element={<TechniciansPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="ai-settings" element={<AISettingsPage />} />
        </Route>
        <Route path="/confirmed" element={<Confirmed />} />
        <Route path="/technician/login" element={<TechnicianLogin />} />
        <Route path="/technician/onboarding" element={<TechnicianOnboarding />} />
        <Route path="/technician" element={<TechnicianDashboard />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/console" element={<Console />} />
        <Route path="/p/:code" element={<ShortLinkRedirect />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
