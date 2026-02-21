import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Target, TrendingUp, Phone, DollarSign, Settings,
  Loader2, Trophy, Medal, Award,
} from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles?: string[];
}

interface SalesTarget {
  id: string;
  user_id: string;
  target_type: string;
  target_value: number;
  achieved_value: number;
  month: number;
  year: number;
}

interface SalesTargetBoardProps {
  teamMembers: TeamMember[];
  isAdmin?: boolean;
}

const TARGET_TYPES = [
  { value: "revenue", label: "Revenue Target", icon: DollarSign, unit: "AED" },
  { value: "conversions", label: "Conversions", icon: TrendingUp, unit: "" },
  { value: "calls", label: "Calls", icon: Phone, unit: "" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const SalesTargetBoard = ({ teamMembers, isAdmin = false }: SalesTargetBoardProps) => {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetOpen, setIsSetOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formUserId, setFormUserId] = useState("");
  const [formType, setFormType] = useState("revenue");
  const [formValue, setFormValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Show ALL team members
  const salesTeam = teamMembers;

  useEffect(() => {
    fetchTargets();
  }, [selectedMonth, selectedYear]);

  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase
        .from("sales_targets")
        .select("*")
        .eq("month", selectedMonth)
        .eq("year", selectedYear);

      if (error) throw error;
      setTargets(data || []);
    } catch (error) {
      console.error("Error fetching targets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetTarget = async () => {
    if (!formUserId || !formType || !formValue) {
      toast.error("All fields are required");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from("sales_targets")
        .upsert({
          user_id: formUserId,
          target_type: formType,
          target_value: parseFloat(formValue),
          period: "monthly",
          month: selectedMonth,
          year: selectedYear,
          created_by: session?.user?.id,
        }, { onConflict: "user_id,target_type,period,month,year" });

      if (error) throw error;

      toast.success("Target set successfully");
      setIsSetOpen(false);
      setFormValue("");
      fetchTargets();
    } catch (error: any) {
      console.error("Error setting target:", error);
      toast.error("Failed to set target");
    } finally {
      setIsSaving(false);
    }
  };

  const getTargetForUser = (userId: string, type: string) => {
    return targets.find(t => t.user_id === userId && t.target_type === type);
  };

  const getProgressPercent = (target: SalesTarget | undefined) => {
    if (!target || target.target_value === 0) return 0;
    return Math.min(100, Math.round((target.achieved_value / target.target_value) * 100));
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">#{index + 1}</span>;
  };

  // Rank team by total achievement across all target types
  const rankedTeam = [...salesTeam].map(member => {
    const revenueTarget = getTargetForUser(member.id, "revenue");
    const conversionsTarget = getTargetForUser(member.id, "conversions");
    const callsTarget = getTargetForUser(member.id, "calls");
    const avgProgress = (
      getProgressPercent(revenueTarget) +
      getProgressPercent(conversionsTarget) +
      getProgressPercent(callsTarget)
    ) / 3;
    return { ...member, avgProgress, revenueTarget, conversionsTarget, callsTarget };
  }).sort((a, b) => b.avgProgress - a.avgProgress);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-[hsl(var(--gold))]" />
          <h2 className="text-lg font-semibold">Sales Target Board</h2>
        </div>
        <div className="flex items-center gap-3">
          <Select value={`${selectedMonth}`} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={`${i + 1}`}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={`${selectedYear}`} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[90px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={`${y}`}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={isSetOpen} onOpenChange={setIsSetOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9">
                  <Settings className="w-4 h-4 mr-2" /> Set Target
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-[hsl(var(--gold))]" />
                    Set Sales Target
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Team Member</Label>
                    <Select value={formUserId} onValueChange={setFormUserId}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        {salesTeam.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.fullName || m.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Type</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TARGET_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Value</Label>
                    <Input
                      type="number"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      placeholder={formType === "revenue" ? "e.g. 500000" : "e.g. 20"}
                    />
                  </div>
                  <Button onClick={handleSetTarget} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                    Save Target
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Performance Leaderboard */}
      {isLoading ? (
        <Card><CardContent className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></CardContent></Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {rankedTeam.map((member, index) => (
              <Card key={member.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {getRankIcon(index)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.fullName || member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.roles?.join(", ")}</p>
                    </div>
                    <Badge variant={member.avgProgress >= 100 ? "default" : "outline"} className={member.avgProgress >= 100 ? "bg-emerald-500" : ""}>
                      {Math.round(member.avgProgress)}% avg
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TARGET_TYPES.map(type => {
                      const target = getTargetForUser(member.id, type.value);
                      const progress = getProgressPercent(target);
                      return (
                        <div key={type.value} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <type.icon className="w-3 h-3" /> {type.label}
                            </span>
                            <span className="font-medium">
                              {target ? `${target.achieved_value}/${target.target_value}` : "No target"}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
            {rankedTeam.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No team members found
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
