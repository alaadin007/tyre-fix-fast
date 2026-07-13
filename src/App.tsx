import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
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
import AdminAIInstructionsPage from "./pages/admin/AdminAIInstructionsPage.tsx";
import TechnicianAIInstructionsPage from "./pages/admin/TechnicianAIInstructionsPage.tsx";
import CommandCenter from "./pages/admin/CommandCenter.tsx";
import ReportsPage from "./pages/admin/ReportsPage.tsx";
import SettingsPage from "./pages/admin/SettingsPage.tsx";
import Dash2 from "./pages/Dash2.tsx";
import Blog from "./pages/Blog.tsx";
import FlatTyreLondon from "./pages/blog/FlatTyreLondon.tsx";
import RunFlatTyresUk from "./pages/blog/RunFlatTyresUk.tsx";
import TpmsWarningLight from "./pages/blog/TpmsWarningLight.tsx";
import CanIDriveOnAFlatTyreUk from "./pages/blog/CanIDriveOnAFlatTyreUk.tsx";
import TyreBlowoutOnMotorwayWhatToDo from "./pages/blog/TyreBlowoutOnMotorwayWhatToDo.tsx";
import SlowPunctureUkGuide from "./pages/blog/SlowPunctureUkGuide.tsx";
import LockingWheelNutLostUk from "./pages/blog/LockingWheelNutLostUk.tsx";
import CrackedAlloyFromPothole from "./pages/blog/CrackedAlloyFromPothole.tsx";
import MobileTyreFittingLondon from "./pages/blog/MobileTyreFittingLondon.tsx";
import MobileTyreFittingManchester from "./pages/blog/MobileTyreFittingManchester.tsx";
import MobileTyreFittingBirmingham from "./pages/blog/MobileTyreFittingBirmingham.tsx";
import TwentyFourHourTyreChangeLondon from "./pages/blog/TwentyFourHourTyreChangeLondon.tsx";
import MobileTyreFitterM25 from "./pages/blog/MobileTyreFitterM25.tsx";
import UkTyreLegalTreadDepth from "./pages/blog/UkTyreLegalTreadDepth.tsx";
import TyreAgeWhenToReplace from "./pages/blog/TyreAgeWhenToReplace.tsx";
import TyrePressureGuideUk from "./pages/blog/TyrePressureGuideUk.tsx";
import WheelAlignmentUkGuide from "./pages/blog/WheelAlignmentUkGuide.tsx";
import TyreSidewallDamageGuide from "./pages/blog/TyreSidewallDamageGuide.tsx";
import NailInTyreWhatToDo from "./pages/blog/NailInTyreWhatToDo.tsx";
import TyreBulgeSidewallDanger from "./pages/blog/TyreBulgeSidewallDanger.tsx";
import MobileTyreFitterVsGarage from "./pages/blog/MobileTyreFitterVsGarage.tsx";
import RunFlatVsStandardTyres from "./pages/blog/RunFlatVsStandardTyres.tsx";
import BudgetVsPremiumTyresUk from "./pages/blog/BudgetVsPremiumTyresUk.tsx";
import AllSeasonVsWinterTyresUk from "./pages/blog/AllSeasonVsWinterTyresUk.tsx";
import PotholeDamageClaimUk from "./pages/blog/PotholeDamageClaimUk.tsx";

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
        <Route path="/admin" element={<Navigate to="/admin/dashboard/jobs" replace />} />
        <Route path="/admin/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="technicians" element={<TechniciansPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="ai-settings" element={<AISettingsPage />} />
          <Route path="admin-ai-instructions" element={<AdminAIInstructionsPage />} />
          <Route path="technician-ai-instructions" element={<TechnicianAIInstructionsPage />} />
          <Route path="command" element={<CommandCenter />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/confirmed" element={<Confirmed />} />
        <Route path="/technician/login" element={<TechnicianLogin />} />
        <Route path="/technician/onboarding" element={<TechnicianOnboarding />} />
        <Route path="/technician" element={<TechnicianDashboard />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/console" element={<Navigate to="/admin/dashboard/jobs" replace />} />
        <Route path="/p/:code" element={<ShortLinkRedirect />} />
        <Route path="/dash2" element={<Dash2 />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/flat-tyre-london" element={<FlatTyreLondon />} />
        <Route path="/blog/run-flat-tyres-uk-guide" element={<RunFlatTyresUk />} />
        <Route path="/blog/tpms-warning-light" element={<TpmsWarningLight />} />
        <Route path="/blog/can-i-drive-on-a-flat-tyre-uk" element={<CanIDriveOnAFlatTyreUk />} />
        <Route path="/blog/tyre-blowout-on-motorway-what-to-do" element={<TyreBlowoutOnMotorwayWhatToDo />} />
        <Route path="/blog/slow-puncture-uk-guide" element={<SlowPunctureUkGuide />} />
        <Route path="/blog/locking-wheel-nut-lost-uk" element={<LockingWheelNutLostUk />} />
        <Route path="/blog/cracked-alloy-from-pothole" element={<CrackedAlloyFromPothole />} />
        <Route path="/blog/mobile-tyre-fitting-london" element={<MobileTyreFittingLondon />} />
        <Route path="/blog/mobile-tyre-fitting-manchester" element={<MobileTyreFittingManchester />} />
        <Route path="/blog/mobile-tyre-fitting-birmingham" element={<MobileTyreFittingBirmingham />} />
        <Route path="/blog/twenty-four-hour-tyre-change-london" element={<TwentyFourHourTyreChangeLondon />} />
        <Route path="/blog/mobile-tyre-fitter-m25" element={<MobileTyreFitterM25 />} />
        <Route path="/blog/uk-tyre-legal-tread-depth" element={<UkTyreLegalTreadDepth />} />
        <Route path="/blog/tyre-age-when-to-replace" element={<TyreAgeWhenToReplace />} />
        <Route path="/blog/tyre-pressure-guide-uk" element={<TyrePressureGuideUk />} />
        <Route path="/blog/wheel-alignment-uk-guide" element={<WheelAlignmentUkGuide />} />
        <Route path="/blog/tyre-sidewall-damage-guide" element={<TyreSidewallDamageGuide />} />
        <Route path="/blog/nail-in-tyre-what-to-do" element={<NailInTyreWhatToDo />} />
        <Route path="/blog/tyre-bulge-sidewall-danger" element={<TyreBulgeSidewallDanger />} />
        <Route path="/blog/mobile-tyre-fitter-vs-garage" element={<MobileTyreFitterVsGarage />} />
        <Route path="/blog/run-flat-vs-standard-tyres" element={<RunFlatVsStandardTyres />} />
        <Route path="/blog/budget-vs-premium-tyres-uk" element={<BudgetVsPremiumTyresUk />} />
        <Route path="/blog/all-season-vs-winter-tyres-uk" element={<AllSeasonVsWinterTyresUk />} />
        <Route path="/blog/pothole-damage-claim-uk" element={<PotholeDamageClaimUk />} />
        <Route path="/blog/mobile-tyre-fitting-birmingham" element={<MobileTyreFittingBirmingham />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
