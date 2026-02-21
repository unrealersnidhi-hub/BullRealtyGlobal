import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadStatusBadge, type LeadStatus } from "@/components/leads/LeadStatusBadge";
import { ClickToCallButton } from "@/components/leads/ClickToCallButton";
import { Eye, MessageCircle, Bot, Globe, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  message?: string | null;
  source: string | null;
  status: LeadStatus;
  created_at: string;
  assigned_to: string | null;
  assigned_at?: string | null;
  country: 'dubai' | 'india' | null;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles?: string[];
}

interface LeadsTableProps {
  leads: Lead[];
  teamMembers: TeamMember[];
  onAssignLead: (leadId: string, assignedTo: string | null) => void;
  onViewLead: (lead: Lead) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export const LeadsTable = ({
  leads,
  teamMembers,
  onAssignLead,
  onViewLead,
  selectedIds = [],
  onSelectionChange,
}: LeadsTableProps) => {
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < leads.length;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(leads.map((l) => l.id));
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (leads.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No leads found</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Leads will appear here when visitors submit forms on your website.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/50">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {onSelectionChange && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = someSelected;
                    }}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Country</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Assigned To</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedIds.includes(lead.id) ? "bg-primary/5" : ""
                }`}
                onClick={() => onViewLead(lead)}
              >
                {onSelectionChange && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="font-medium">{lead.full_name}</div>
                  {lead.interest && (
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {lead.interest}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm text-[hsl(var(--gold))] hover:underline block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-xs text-muted-foreground hover:text-foreground block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.phone}
                        </a>
                        <div onClick={(e) => e.stopPropagation()}>
                          <ClickToCallButton customerPhone={lead.phone} leadId={lead.id} />
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {lead.country === 'dubai' && '🇦🇪 Dubai'}
                    {lead.country === 'india' && '🇮🇳 India'}
                    {!lead.country && <span className="text-muted-foreground">—</span>}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {lead.source === "whatsapp" && (
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    )}
                    {lead.source === "ai-chatbot" && (
                      <Bot className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
                    )}
                    {(lead.source === "website" || lead.source === "contact-page" || !lead.source) && (
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs capitalize">
                      {(lead.source || "website").replace("-", " ")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <LeadStatusBadge status={lead.status} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={lead.assigned_to || "unassigned"}
                    onValueChange={(value) =>
                      onAssignLead(lead.id, value === "unassigned" ? null : value)
                    }
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="Assign..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <span className="text-muted-foreground">Unassigned</span>
                      </SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fullName || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    <div className="font-medium">{format(new Date(lead.created_at), "MMM d, yyyy")}</div>
                    <div className="text-muted-foreground">{format(new Date(lead.created_at), "h:mm a")}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-[hsl(var(--gold))]/10 hover:text-[hsl(var(--gold))]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewLead(lead);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
