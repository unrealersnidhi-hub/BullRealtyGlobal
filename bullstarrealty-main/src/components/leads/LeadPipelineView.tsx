import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Eye, Phone, Mail } from "lucide-react";
import { type LeadStatus, LeadStatusBadge } from "./LeadStatusBadge";
import { format } from "date-fns";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  message?: string | null;
  status: LeadStatus;
  created_at: string;
  assigned_to: string | null;
  assigned_at?: string | null;
  source: string | null;
  country: 'dubai' | 'india' | null;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
}

interface LeadPipelineViewProps {
  leads: Lead[];
  teamMembers: TeamMember[];
  onViewLead: (lead: Lead) => void;
}

const PIPELINE_STAGES: { key: LeadStatus; label: string; color: string }[] = [
  { key: "new", label: "New", color: "border-t-blue-500" },
  { key: "warm", label: "Warm", color: "border-t-orange-500" },
  { key: "hot", label: "Hot", color: "border-t-red-500" },
  { key: "converted", label: "Converted", color: "border-t-emerald-500" },
  { key: "cold", label: "Cold", color: "border-t-slate-400" },
  { key: "not_interested", label: "Lost", color: "border-t-gray-400" },
];

export const LeadPipelineView = ({ leads, teamMembers, onViewLead }: LeadPipelineViewProps) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.status === stage.key);
        return (
          <div
            key={stage.key}
            className="min-w-[260px] max-w-[300px] flex-1 flex flex-col"
          >
            <Card className={`border-t-4 ${stage.color} mb-2`}>
              <div className="p-3 flex items-center justify-between">
                <span className="text-sm font-semibold">{stage.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {stageLeads.length}
                </Badge>
              </div>
            </Card>

            <ScrollArea className="flex-1 max-h-[60vh]">
              <div className="space-y-2">
                {stageLeads.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No leads
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const assignee = teamMembers.find((m) => m.id === lead.assigned_to);
                    return (
                      <Card
                        key={lead.id}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => onViewLead(lead)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{lead.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {lead.interest || lead.email}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewLead(lead);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          )}
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="w-3 h-3" />
                          </a>
                          {lead.source && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              {lead.source.replace("-", " ")}
                            </Badge>
                          )}
                          {lead.country && (
                            <span className="text-[10px]">
                              {lead.country === "dubai" ? "🇦🇪" : "🇮🇳"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(lead.created_at), "MMM d")}
                          </span>
                          {assignee && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                              → {assignee.fullName || assignee.email}
                            </span>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};