import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Users, UserCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { LeadStatusBadge, type LeadStatus } from "@/components/leads/LeadStatusBadge";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  status: LeadStatus;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  country: 'dubai' | 'india' | null;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  country?: 'dubai' | 'india' | null;
}

interface TeamLeadAssignmentProps {
  leads: Lead[];
  teamMembers: TeamMember[];
  onLeadUpdate: (updatedLead: Lead) => void;
  onLeadClick: (leadId: string) => void;
}

export const TeamLeadAssignment = ({
  leads,
  teamMembers,
  onLeadUpdate,
  onLeadClick,
}: TeamLeadAssignmentProps) => {
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [filterMember, setFilterMember] = useState("all");

  const salesTeam = teamMembers.filter(
    (m) => m.roles.includes("user") || m.roles.includes("telesales")
  );

  const handleAssignLead = async (leadId: string, assignedTo: string | null) => {
    setAssigningLeadId(leadId);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: assignedTo })
        .eq("id", leadId);

      if (error) throw error;

      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        onLeadUpdate({ ...lead, assigned_to: assignedTo });
      }

      const member = salesTeam.find((m) => m.id === assignedTo);
      toast.success(
        assignedTo
          ? `Lead assigned to ${member?.fullName || member?.email}`
          : "Lead unassigned"
      );
    } catch (error) {
      console.error("Error assigning lead:", error);
      toast.error("Failed to assign lead");
    } finally {
      setAssigningLeadId(null);
    }
  };

  // Group leads by team member
  const memberLeadCounts = salesTeam.map((member) => {
    const memberLeads = leads.filter((l) => l.assigned_to === member.id);
    return {
      ...member,
      totalLeads: memberLeads.length,
      hotLeads: memberLeads.filter((l) => l.status === "hot").length,
      warmLeads: memberLeads.filter((l) => l.status === "warm").length,
      coldLeads: memberLeads.filter((l) => l.status === "cold").length,
      converted: memberLeads.filter((l) => l.status === "converted").length,
    };
  });

  const unassignedLeads = leads.filter((l) => !l.assigned_to);

  const filteredLeads =
    filterMember === "all"
      ? leads
      : filterMember === "unassigned"
      ? unassignedLeads
      : leads.filter((l) => l.assigned_to === filterMember);

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-[hsl(var(--gold))]" />
            Sales Team Overview
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Team Member</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Hot</TableHead>
              <TableHead className="text-center">Warm</TableHead>
              <TableHead className="text-center">Cold</TableHead>
              <TableHead className="text-center">Converted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberLeadCounts.map((member) => (
              <TableRow
                key={member.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setFilterMember(member.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{member.fullName || member.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.roles.join(", ")}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium">{member.totalLeads}</TableCell>
                <TableCell className="text-center text-red-500">{member.hotLeads}</TableCell>
                <TableCell className="text-center text-orange-500">{member.warmLeads}</TableCell>
                <TableCell className="text-center text-blue-500">{member.coldLeads}</TableCell>
                <TableCell className="text-center text-emerald-500">{member.converted}</TableCell>
              </TableRow>
            ))}
            <TableRow
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setFilterMember("unassigned")}
            >
              <TableCell>
                <div className="font-medium text-amber-500">Unassigned</div>
              </TableCell>
              <TableCell className="text-center font-medium">{unassignedLeads.length}</TableCell>
              <TableCell className="text-center">-</TableCell>
              <TableCell className="text-center">-</TableCell>
              <TableCell className="text-center">-</TableCell>
              <TableCell className="text-center">-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* Lead Assignment Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[hsl(var(--gold))]" />
            {filterMember === "all"
              ? "All Leads"
              : filterMember === "unassigned"
              ? "Unassigned Leads"
              : `Leads for ${salesTeam.find((m) => m.id === filterMember)?.fullName || "Team Member"}`}
            <Badge variant="secondary" className="ml-2">{filteredLeads.length}</Badge>
          </h3>
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {salesTeam.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.fullName || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No leads found for this filter
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assign To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.slice(0, 50).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{lead.full_name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.assigned_to || "unassigned"}
                        onValueChange={(value) =>
                          handleAssignLead(lead.id, value === "unassigned" ? null : value)
                        }
                        disabled={assigningLeadId === lead.id}
                      >
                        <SelectTrigger className="w-[150px] h-8 text-xs">
                          {assigningLeadId === lead.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <SelectValue placeholder="Assign..." />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {salesTeam.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fullName || member.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(lead.created_at), "MMM d")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onLeadClick(lead.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
