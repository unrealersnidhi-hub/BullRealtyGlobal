import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Globe, Eye, EyeOff, ArrowLeft, ShieldCheck } from "lucide-react";
import { useSessionManagement } from "@/hooks/useSessionManagement";
import loginHero from "@/assets/login-hero.jpg";

const TESTIMONIALS = [
  {
    quote: "Bull Star Realty helped me find my dream property in Dubai Marina. The team's expertise and dedication made the entire process seamless.",
    name: "Rahul Sharma",
    role: "Property Investor",
    company: "International Real Estate",
  },
  {
    quote: "Their CRM system and follow-up process is world-class. I've never experienced such professional service in real estate.",
    name: "Sarah Al-Rashid",
    role: "Homeowner",
    company: "Dubai Hills Estate",
  },
  {
    quote: "From Varanasi to Dubai — Bull Realty Global's cross-border expertise gave me confidence to invest internationally.",
    name: "Amit Verma",
    role: "NRI Investor",
    company: "Global Property Holdings",
  },
];

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState<"dubai" | "india">("dubai");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  
  // 2FA state
  const [step, setStep] = useState<"login" | "otp">("login");
  const [otpCode, setOtpCode] = useState("");
  const [otpUserId, setOtpUserId] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  const navigate = useNavigate();
  const { createSession, endSession } = useSessionManagement();

  useEffect(() => {
    const clearStaleAuth = async () => {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (/^sb-.*-auth-token$/.test(key)) localStorage.removeItem(key);
        }
        await endSession();
      } catch {
        // Ignore cleanup failures
      } finally {
        setIsPreparing(false);
      }
    };
    clearStaleAuth();
  }, [endSession]);

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const sendOtp = async (userId: string, userEmail: string) => {
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { action: "send", user_id: userId, email: userEmail },
    });
    if (error) throw new Error("Failed to send verification code");
    return data;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreparing || isLoading) return;
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.id) throw new Error("Login succeeded but session could not be established");

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (roleError) throw roleError;

      const userRoles = roles?.map(r => r.role) || [];
      if (userRoles.length === 0) {
        await supabase.auth.signOut();
        toast.error("Access denied. No role assigned. Please contact your administrator.");
        return;
      }

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (
        existingProfile?.country &&
        existingProfile.country !== country &&
        !userRoles.includes("super_admin")
      ) {
        await supabase.auth.signOut();
        const correctZone = existingProfile.country === "dubai" ? "🇦🇪 Dubai" : "🇮🇳 India";
        toast.error(`You belong to the ${correctZone} branch. Please select the correct branch and try again.`);
        setCountry(existingProfile.country as "dubai" | "india");
        return;
      }

      await supabase
        .from("profiles")
        .upsert({
          user_id: session.user.id,
          email: session.user.email,
          country: country,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      // Send OTP for 2FA
      setOtpUserId(session.user.id);
      setOtpEmail(session.user.email || normalizedEmail);
      setPendingRoles(userRoles);
      
      await sendOtp(session.user.id, session.user.email || normalizedEmail);
      
      setStep("otp");
      toast.success("Verification code sent to your email");
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : "Authentication failed";
      const friendly =
        raw.includes("Invalid login credentials") ? "Invalid email or password" :
        raw.includes("Email not confirmed") ? "Please confirm your email before signing in" :
        raw;
      toast.error(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "verify", user_id: otpUserId, otp_code: otpCode },
      });

      if (error || !data?.success) {
        toast.error(data?.error || "Invalid verification code");
        setIsVerifying(false);
        return;
      }

      // OTP verified — create session and navigate
      const sessionToken = await createSession(otpUserId, country);
      if (!sessionToken) {
        console.warn("Session tracking could not be initialized");
      }

      toast.success("Welcome back!");

      let dashboardPath = "/user/dashboard";
      if (pendingRoles.includes("super_admin") || pendingRoles.includes("admin")) {
        dashboardPath = "/admin/dashboard";
      } else if (pendingRoles.includes("mis")) {
        dashboardPath = "/mis/dashboard";
      } else if (pendingRoles.includes("telesales")) {
        dashboardPath = "/telesales/dashboard";
      } else if (pendingRoles.includes("manager")) {
        dashboardPath = "/manager/dashboard";
      } else if (pendingRoles.includes("hr")) {
        dashboardPath = "/hr/dashboard";
      } else if (pendingRoles.includes("blog_writer")) {
        dashboardPath = "/admin/blog";
      }

      const fullUrl = `${window.location.origin}${dashboardPath}`;
      const popupWidth = Math.min(1400, window.screen.availWidth - 100);
      const popupHeight = Math.min(900, window.screen.availHeight - 100);
      const left = Math.round((window.screen.availWidth - popupWidth) / 2);
      const top = Math.round((window.screen.availHeight - popupHeight) / 2);
      const popup = window.open(
        fullUrl,
        "BullStarCRM",
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
      );

      if (popup) {
        setTimeout(() => {
          window.close();
          navigate(dashboardPath);
        }, 1000);
      } else {
        navigate(dashboardPath);
      }
    } catch (error) {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      await sendOtp(otpUserId, otpEmail);
      setOtpCode("");
      toast.success("New verification code sent");
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  const currentTestimonial = TESTIMONIALS[testimonialIndex];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-0 bg-background">
        <div className="w-full max-w-[420px]">
          {step === "login" ? (
            <>
              {/* Logo / Brand */}
              <div className="mb-10">
                <h1 className="text-2xl font-bold tracking-tight">Welcome back!</h1>
                <p className="text-muted-foreground mt-1">
                  Please enter your details to sign in.
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                {/* Branch Selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Select Branch
                  </Label>
                  <Select value={country} onValueChange={(v: "dubai" | "india") => setCountry(v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dubai">
                        <span className="flex items-center gap-2">🇦🇪 Dubai (UAE)</span>
                      </SelectItem>
                      <SelectItem value="india">
                        <span className="flex items-center gap-2">🇮🇳 India</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-lg"
                  disabled={isPreparing || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : isPreparing ? (
                    "Preparing..."
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* OTP Verification Step */}
              <div className="mb-10">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Two-Factor Verification</h1>
                <p className="text-muted-foreground mt-1">
                  Enter the 6-digit code sent to <strong>{otpEmail}</strong>
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  size="lg"
                  className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-lg"
                  disabled={isVerifying || otpCode.length !== 6}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-primary hover:underline disabled:opacity-50"
                  >
                    {isResending ? "Sending..." : "Resend code"}
                  </button>
                  <button
                    onClick={() => {
                      setStep("login");
                      setOtpCode("");
                      supabase.auth.signOut();
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Back to login
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Code expires in 5 minutes. Check your spam folder if you don't see it.
                </p>
              </div>
            </>
          )}

          {/* Back Link */}
          <div className="text-center mt-8">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {country === "india" ? "Bull Realty Global" : "Bull Star Realty"}
            </a>
          </div>
        </div>
      </div>

      {/* Right Side — Hero Image + Testimonial (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden rounded-l-3xl">
        <img
          src={loginHero}
          alt="Luxury property"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Testimonial card at bottom */}
        <div className="absolute bottom-8 left-8 right-8">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-white transition-all duration-500">
            <p className="text-sm lg:text-base leading-relaxed mb-4 opacity-90">
              "{currentTestimonial.quote}"
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{currentTestimonial.name}</p>
                <p className="text-xs opacity-70">{currentTestimonial.role}</p>
                <p className="text-xs opacity-50">{currentTestimonial.company}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTestimonialIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={() => setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
