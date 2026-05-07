import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import JobStatus from "./pages/JobStatus.tsx";
// Admin page replaced by Console
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

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/areas" element={<AreasIndex />} />
            <Route path="/areas/:slug" element={<AreaPage />} />
            <Route path="/job/:id" element={<JobStatus />} />
            <Route path="/admin" element={<Console />} />
            <Route path="/confirmed" element={<Confirmed />} />
            <Route path="/technician/login" element={<TechnicianLogin />} />
            <Route path="/technician/onboarding" element={<TechnicianOnboarding />} />
            <Route path="/technician" element={<TechnicianDashboard />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/console" element={<Console />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
