import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cookie, Settings, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COOKIE_CONSENT_KEY = "bsr_cookie_consent";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      const parsed = JSON.parse(stored) as CookiePreferences;
      setPreferences(parsed);
      // Trigger analytics initialization if consent was given
      if (parsed.analytics || parsed.marketing) {
        window.dispatchEvent(new CustomEvent("cookie-consent-given", { detail: parsed }));
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-given", { detail: prefs }));
  };

  const acceptAll = () => {
    savePreferences({ necessary: true, analytics: true, marketing: true });
  };

  const rejectNonEssential = () => {
    savePreferences({ necessary: true, analytics: false, marketing: false });
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {/* Cookie Banner */}
      {showBanner && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-4 duration-300">
          <Card className="max-w-4xl mx-auto p-4 md:p-6 shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Cookie className="w-5 h-5 text-[hsl(var(--gold))]" />
                  <h3 className="font-semibold">We value your privacy</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  We use cookies to enhance your browsing experience, serve personalized ads or content, 
                  and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="flex-1 md:flex-none">
                  <Settings className="w-4 h-4 mr-2" />
                  Customize
                </Button>
                <Button variant="outline" size="sm" onClick={rejectNonEssential} className="flex-1 md:flex-none">
                  Reject All
                </Button>
                <Button 
                  size="sm" 
                  onClick={acceptAll}
                  className="flex-1 md:flex-none bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--charcoal))]"
                >
                  Accept All
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-[hsl(var(--gold))]" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. You can enable or disable different types of cookies below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Necessary Cookies */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <Label className="font-medium">Necessary Cookies</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Required for the website to function properly. Cannot be disabled.
                </p>
              </div>
              <Switch checked={true} disabled className="ml-4" />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <Label className="font-medium">Analytics Cookies</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Help us understand how visitors interact with our website.
                </p>
              </div>
              <Switch 
                checked={preferences.analytics} 
                onCheckedChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
                className="ml-4"
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <Label className="font-medium">Marketing Cookies</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Used to track visitors across websites for advertising purposes.
                </p>
              </div>
              <Switch 
                checked={preferences.marketing} 
                onCheckedChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
                className="ml-4"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--charcoal))]"
              onClick={saveCustomPreferences}
            >
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export function to check consent status
export function getCookieConsent(): CookiePreferences | null {
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!stored) return null;
  return JSON.parse(stored) as CookiePreferences;
}

// Export function to check if specific consent was given
export function hasConsentFor(type: keyof CookiePreferences): boolean {
  const consent = getCookieConsent();
  return consent ? consent[type] : false;
}
