import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import AdminLogin from "./pages/AdminLogin";
import AdminShell from "./admin/AdminShell";
import Overview from "./admin/Overview";
import UsersTab from "./admin/UsersTab";
import VerificationsTab from "./admin/VerificationsTab";
import GiftsTab from "./admin/GiftsTab";
import PlansTab from "./admin/PlansTab";
import WithdrawalsTab from "./admin/WithdrawalsTab";
import SettingsTab from "./admin/SettingsTab";
import AuditTab from "./admin/AuditTab";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Stats from "./components/Stats";
import Testimonials from "./components/Testimonials";
import AppShowcase from "./components/AppShowcase";
import CTABanner from "./components/CTABanner";
import Footer from "./components/Footer";
import SocialSidebar from "./components/SocialSidebar";

/** Smooth-scrolls to the element whose id matches the URL hash whenever
 *  the hash changes. Handles the Navbar's "/" + "#features" handoff —
 *  when we navigate from a non-landing page, the hash lands in
 *  location.hash and we scroll once the section mounts. */
function HashScroller() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace(/^#/, "");
    // Defer to next frame so the target section has mounted
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);
  return null;
}

function LandingPage() {
  return (
    <>
      <Navbar />
      <SocialSidebar />
      <HeroSection />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <AppShowcase />
      <CTABanner />
      <Footer />
    </>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0b0b18] flex items-center justify-center text-white">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0b0b18] flex items-center justify-center text-white">Loading…</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function SignupRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0b0b18] flex items-center justify-center text-white">Loading…</div>;
  if (user && profile?.is_complete) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HashScroller />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/signup" element={<SignupRoute><Signup /></SignupRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Admin console — gated by its own JWT (adminClient/admin_token).
              AdminShell handles the auth check + redirects to /admin/login if missing. */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index                  element={<Overview />} />
            <Route path="users"            element={<UsersTab />} />
            <Route path="verifications"    element={<VerificationsTab />} />
            <Route path="gifts"            element={<GiftsTab />} />
            <Route path="plans"            element={<PlansTab />} />
            <Route path="withdrawals"      element={<WithdrawalsTab />} />
            <Route path="settings"         element={<SettingsTab />} />
            <Route path="audit"            element={<AuditTab />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
