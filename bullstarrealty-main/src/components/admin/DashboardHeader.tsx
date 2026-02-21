import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  userEmail?: string;
  userName?: string;
  roleBadge: string;
  onLogout: () => void;
}

export const DashboardHeader = ({
  title,
  subtitle,
  userEmail,
  userName,
  roleBadge,
  onLogout,
}: DashboardHeaderProps) => {
  return (
    <header className="bg-background border-b border-border sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shrink-0 shadow-lg shadow-gold/10">
            <Sparkles className="w-5 h-5 text-charcoal" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold truncate">
              <span className="text-gold-gradient">{title}</span>
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground truncate">
                {userName || userEmail || subtitle}
              </p>
              <Badge variant="secondary" className="text-xs shrink-0">
                {roleBadge}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout} className="shrink-0">
          <LogOut className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
};
