import { Linkedin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

// Public team member data - only non-sensitive fields
interface PublicTeamMember {
  id: string;
  name: string;
  role: string;
  description: string | null;
  linkedin: string | null;
  photo_url: string | null;
  display_order: number;
}

const TeamSection = () => {
  const { data: team = [], isLoading } = useQuery({
    queryKey: ["public-team-members"],
    queryFn: async () => {
      // Primary path: Supabase client invoke
      const response = await supabase.functions.invoke("list-public-team");
      if (!response.error && !response.data?.error) {
        return (response.data?.team || []) as PublicTeamMember[];
      }

      // Fallback path: direct HTTP call with anon JWT for broader compatibility
      const anonJwt = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-public-team`;
      const fallbackResp = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonJwt,
          Authorization: `Bearer ${anonJwt}`,
        },
        body: "{}",
      });

      const fallbackData = await fallbackResp.json().catch(() => ({}));
      if (!fallbackResp.ok || fallbackData?.error) {
        const msg =
          fallbackData?.error ||
          response.error?.message ||
          "Failed to load team members";
        throw new Error(msg);
      }

      return (fallbackData?.team || []) as PublicTeamMember[];
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <section className="section-padding bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-medium text-gold uppercase tracking-wider">Our Team</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mt-4 mb-6">Meet the Experts</h2>
          <p className="text-muted-foreground text-lg">
            Our dedicated team of real estate professionals is here to guide you through every step of your property
            journey.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="mx-auto w-48 h-48 rounded-2xl mb-6" />
                <Skeleton className="h-6 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ))
          ) : team.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-12">
              No team members to display.
            </div>
          ) : (
            team.map((member) => (
              <HoverCard key={member.id} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div className="group cursor-pointer text-center">
                    <div className="relative mx-auto w-48 h-48 mb-6 overflow-hidden rounded-2xl bg-muted">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-semibold text-muted-foreground">
                          {getInitials(member.name)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                    <p className="text-gold text-sm font-medium">{member.role}</p>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-6" side="top">
                  <div className="flex gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={member.photo_url || undefined} alt={member.name} />
                      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold">{member.name}</h4>
                      <p className="text-gold text-sm mb-2">{member.role}</p>
                    </div>
                  </div>
                  {member.description && (
                    <p className="text-muted-foreground text-sm mt-4 mb-4">{member.description}</p>
                  )}
                  {/* Only show LinkedIn link - no email/phone for security */}
                  {member.linkedin && (
                    <div className="flex gap-4 text-muted-foreground">
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gold transition-colors flex items-center gap-2 text-sm"
                        aria-label={`${member.name}'s LinkedIn`}
                      >
                        <Linkedin className="w-4 h-4" />
                        Connect on LinkedIn
                      </a>
                    </div>
                  )}
                </HoverCardContent>
              </HoverCard>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
