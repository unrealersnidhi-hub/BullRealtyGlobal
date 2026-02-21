import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, MessageCircle, Bot, Globe, Tag, Calendar, User } from "lucide-react";
import { type LeadStatus } from "./LeadStatusBadge";

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
}

interface LeadSearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  sourceFilter: string;
  onSourceChange: (source: string) => void;
  assigneeFilter: string;
  onAssigneeChange: (assignee: string) => void;
  countryFilter: string;
  onCountryChange: (country: string) => void;
  interestTagFilter?: string;
  onInterestTagChange?: (tag: string) => void;
  dateFilter?: string;
  onDateFilterChange?: (date: string) => void;
  teamMembers: TeamMember[];
  sources: string[];
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export const LeadSearchFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  assigneeFilter,
  onAssigneeChange,
  countryFilter,
  onCountryChange,
  interestTagFilter,
  onInterestTagChange,
  dateFilter,
  onDateFilterChange,
  teamMembers,
  sources,
  onClearAll,
  hasActiveFilters,
}: LeadSearchFiltersProps) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from("lead_interest_tags")
        .select("tag")
        .limit(100);
      if (data) {
        const unique = [...new Set(data.map(d => d.tag))];
        setAvailableTags(unique);
      }
    };
    fetchTags();
  }, []);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, or interest..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange("")}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Filter Row - All filters always visible */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[120px] sm:w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="not_interested">Not Interested</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>

        {/* Assignee Filter */}
        <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
          <SelectTrigger className="w-[120px] sm:w-[150px] h-8 text-xs">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.fullName || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select value={sourceFilter} onValueChange={onSourceChange}>
          <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                <div className="flex items-center gap-1.5">
                  {source === "whatsapp" && <MessageCircle className="w-3 h-3 text-[#25D366]" />}
                  {source === "ai-chatbot" && <Bot className="w-3 h-3 text-[hsl(var(--gold))]" />}
                  {(source === "website" || source === "contact-page") && <Globe className="w-3 h-3 text-muted-foreground" />}
                  <span className="capitalize">{source.replace("-", " ")}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Country Filter */}
        <Select value={countryFilter} onValueChange={onCountryChange}>
          <SelectTrigger className="w-[120px] sm:w-[130px] h-8 text-xs">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            <SelectItem value="dubai">🇦🇪 Dubai</SelectItem>
            <SelectItem value="india">🇮🇳 India</SelectItem>
            <SelectItem value="none">No Country</SelectItem>
          </SelectContent>
        </Select>

        {/* Interest Tag Filter - Always shown */}
        {onInterestTagChange && (
          <Select value={interestTagFilter || "all"} onValueChange={onInterestTagChange}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs">
              <SelectValue placeholder="Interest Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              <SelectItem value="Interested">👍 Interested</SelectItem>
              <SelectItem value="Not Interested">👎 Not Interested</SelectItem>
              {availableTags.filter(t => t !== "Interested" && t !== "Not Interested").map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date Filter */}
        {onDateFilterChange && (
          <Select value={dateFilter || "all"} onValueChange={onDateFilterChange}>
            <SelectTrigger className="w-[120px] sm:w-[130px] h-8 text-xs">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Active filter count + clear */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={onClearAll}>
            <X className="w-3.5 h-3.5 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};
