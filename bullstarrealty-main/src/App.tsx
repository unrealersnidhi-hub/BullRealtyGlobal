import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CookieConsent } from "./components/CookieConsent";
import { AnalyticsScripts } from "./components/AnalyticsScripts";

// Eagerly load public pages
import Index from "./pages/Index";

// Lazy load everything else
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const ManagerDashboard = lazy(() => import("./pages/user/ManagerDashboard"));
const TelesalesDashboard = lazy(() => import("./pages/user/TelesalesDashboard"));
const MISDashboard = lazy(() => import("./pages/user/MISDashboard"));
const HRDashboard = lazy(() => import("./pages/user/HRDashboard"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/blog" element={<AdminBlog />} />
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/telesales/dashboard" element={<TelesalesDashboard />} />
            <Route path="/mis/dashboard" element={<MISDashboard />} />
            <Route path="/hr/dashboard" element={<HRDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <CookieConsent />
        <AnalyticsScripts />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
