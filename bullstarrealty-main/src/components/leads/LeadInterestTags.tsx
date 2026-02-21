import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X, Tag, ThumbsUp, ThumbsDown } from "lucide-react";

interface LeadInterestTagsProps {
  leadId: string;
  compact?: boolean;
}

const PRESET_TAGS = [
  { label: "Interested", icon: "👍", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { label: "Not Interested", icon: "👎", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  { label: "Site Visit Done", icon: "🏠", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { label: "Documents Pending", icon: "📄", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { label: "Payment Pending", icon: "💳", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { label: "Negotiation", icon: "🤝", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { label: "Follow-up Required", icon: "📞", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
];

export const LeadInterestTags = ({ leadId, compact = false }: LeadInterestTagsProps) => {
  const [tags, setTags] = useState<{ id: string; tag: string }[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [leadId]);

  const fetchTags = async () => {
    const { data } = await supabase
      .from("lead_interest_tags")
      .select("id, tag")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    setTags(data || []);
  };

  const addTag = async (tagName: string) => {
    if (tags.some(t => t.tag === tagName)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("lead_interest_tags")
        .insert({ lead_id: leadId, tag: tagName, created_by: session?.user?.id })
        .select("id, tag")
        .single();
      if (error) throw error;
      setTags([...tags, data]);
      setCustomTag("");
      setShowInput(false);
    } catch {
      toast.error("Failed to add tag");
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      await supabase.from("lead_interest_tags").delete().eq("id", tagId);
      setTags(tags.filter(t => t.id !== tagId));
    } catch {
      toast.error("Failed to remove tag");
    }
  };

  const getTagStyle = (tag: string) => {
    const preset = PRESET_TAGS.find(p => p.label === tag);
    return preset?.color || "bg-muted text-foreground border-border";
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map(t => (
          <Badge key={t.id} variant="outline" className={`text-[10px] h-5 ${getTagStyle(t.tag)}`}>
            {t.tag}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">Interest Tags</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <Badge key={t.id} variant="outline" className={`gap-1 text-xs ${getTagStyle(t.tag)}`}>
            {t.tag}
            <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeTag(t.id)} />
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {PRESET_TAGS.filter(p => !tags.some(t => t.tag === p.label)).map(preset => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => addTag(preset.label)}
          >
            <span>{preset.icon}</span>
            {preset.label}
          </Button>
        ))}
      </div>

      {showInput ? (
        <div className="flex gap-1.5">
          <Input
            value={customTag}
            onChange={e => setCustomTag(e.target.value)}
            placeholder="Custom tag..."
            className="h-7 text-xs"
            onKeyDown={e => e.key === "Enter" && customTag.trim() && addTag(customTag.trim())}
          />
          <Button size="sm" className="h-7 text-xs" onClick={() => customTag.trim() && addTag(customTag.trim())}>Add</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowInput(false)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowInput(true)}>
          <Plus className="w-3 h-3" />
          Custom Tag
        </Button>
      )}
    </div>
  );
};
