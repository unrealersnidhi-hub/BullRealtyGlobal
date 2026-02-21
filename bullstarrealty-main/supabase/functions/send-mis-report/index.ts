import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const allowedOrigins = [
  "https://bullstarrealty.ae",
  "https://www.bullstarrealty.ae",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

interface TeamMemberStats {
  userId: string;
  name: string;
  email: string;
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  converted: number;
  newLeads: number;
  totalCalls: number;
  answeredCalls: number;
  totalCallDuration: number;
  followUpsCompleted: number;
  followUpsPending: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function generateReportHTML(
  stats: TeamMemberStats[],
  reportName: string,
  frequency: string,
  dateLabel: string,
  includeCallStats: boolean,
  includeLeadStats: boolean,
  includePerformance: boolean,
  includeConversion: boolean
): string {
  const totalLeads = stats.reduce((s, m) => s + m.totalLeads, 0);
  const totalConverted = stats.reduce((s, m) => s + m.converted, 0);
  const totalCalls = stats.reduce((s, m) => s + m.totalCalls, 0);
  const totalAnswered = stats.reduce((s, m) => s + m.answeredCalls, 0);

  let leadRows = "";
  let callRows = "";
  let perfRows = "";

  stats.forEach((m) => {
    const convRate = m.totalLeads > 0 ? ((m.converted / m.totalLeads) * 100).toFixed(1) : "0.0";
    const answerRate = m.totalCalls > 0 ? ((m.answeredCalls / m.totalCalls) * 100).toFixed(1) : "0.0";
    
    leadRows += `<tr>
      <td style="padding:8px;border:1px solid #ddd">${m.name}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${m.totalLeads}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;color:#e53e3e">${m.hotLeads}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;color:#ed8936">${m.warmLeads}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;color:#4299e1">${m.coldLeads}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;color:#48bb78">${m.converted}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${convRate}%</td>
    </tr>`;

    callRows += `<tr>
      <td style="padding:8px;border:1px solid #ddd">${m.name}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${m.totalCalls}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${m.answeredCalls}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${answerRate}%</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${formatDuration(m.totalCallDuration)}</td>
    </tr>`;

    perfRows += `<tr>
      <td style="padding:8px;border:1px solid #ddd">${m.name}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${m.followUpsCompleted}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${m.followUpsPending}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${m.totalCalls}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${m.totalLeads}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${convRate}%</td>
    </tr>`;
  });

  return `<!DOCTYPE html><html><head><style>
    body{font-family:'Segoe UI',sans-serif;background:#f4f4f4;margin:0;padding:20px}
    .container{max-width:800px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
    .header{background:linear-gradient(135deg,#D4AF37,#B8860B);padding:25px;text-align:center;color:#000}
    .header h1{margin:0;font-size:22px}
    .header p{margin:4px 0 0;font-size:13px;opacity:0.8}
    .content{padding:25px}
    .summary{display:flex;gap:12px;margin-bottom:25px;flex-wrap:wrap}
    .stat-box{flex:1;min-width:120px;background:#f8f9fa;border-radius:8px;padding:15px;text-align:center;border-left:4px solid #D4AF37}
    .stat-box .num{font-size:28px;font-weight:bold;color:#333}
    .stat-box .label{font-size:11px;color:#666;text-transform:uppercase;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#333;color:#fff;padding:10px 8px;font-size:12px;text-transform:uppercase}
    td{padding:8px;border:1px solid #ddd;font-size:13px}
    tr:nth-child(even){background:#f8f9fa}
    .section-title{font-size:16px;font-weight:bold;color:#333;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #D4AF37}
    .footer{background:#f8f9fa;padding:15px;text-align:center;color:#666;font-size:11px}
  </style></head><body>
  <div class="container">
    <div class="header">
      <h1>📊 ${reportName}</h1>
      <p>${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Report • ${dateLabel}</p>
    </div>
    <div class="content">
      <div class="summary">
        <div class="stat-box"><div class="num">${totalLeads}</div><div class="label">Total Leads</div></div>
        <div class="stat-box"><div class="num">${totalConverted}</div><div class="label">Converted</div></div>
        <div class="stat-box"><div class="num">${totalCalls}</div><div class="label">Total Calls</div></div>
        <div class="stat-box"><div class="num">${totalCalls > 0 ? ((totalAnswered / totalCalls) * 100).toFixed(0) : 0}%</div><div class="label">Answer Rate</div></div>
      </div>

      ${includeLeadStats ? `
      <div class="section-title">📋 Lead Status Summary</div>
      <table>
        <tr><th>Team Member</th><th>Total</th><th>🔥 Hot</th><th>🌡 Warm</th><th>❄ Cold</th><th>✅ Converted</th><th>Conv %</th></tr>
        ${leadRows}
      </table>` : ""}

      ${includeCallStats ? `
      <div class="section-title">📞 Call Statistics</div>
      <table>
        <tr><th>Team Member</th><th>Total Calls</th><th>Answered</th><th>Answer Rate</th><th>Duration</th></tr>
        ${callRows}
      </table>` : ""}

      ${includePerformance ? `
      <div class="section-title">🏆 Team Performance</div>
      <table>
        <tr><th>Team Member</th><th>Follow-ups Done</th><th>Pending</th><th>Calls Made</th><th>Leads Handled</th><th>Conv Rate</th></tr>
        ${perfRows}
      </table>` : ""}
    </div>
    <div class="footer">
      <p>Bull Star Realty CRM • Automated MIS Report • Generated at ${new Date().toISOString()}</p>
    </div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const scheduleId = body.schedule_id;

    // If schedule_id provided, send for that specific schedule
    // Otherwise, this is a cron call - check all active schedules
    let schedules: any[] = [];

    if (scheduleId) {
      const { data, error } = await supabase
        .from("automated_report_schedules")
        .select("*")
        .eq("id", scheduleId)
        .single();
      if (error) throw error;
      schedules = [data];
    } else {
      // Cron mode - get all active schedules
      const { data, error } = await supabase
        .from("automated_report_schedules")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      schedules = data || [];
    }

    const results: any[] = [];

    for (const schedule of schedules) {
      try {
        // Determine date range based on frequency
        const now = new Date();
        let startDate: Date;
        let dateLabel: string;

        switch (schedule.frequency) {
          case "weekly":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            dateLabel = `Week of ${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`;
            break;
          case "monthly":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            dateLabel = `Month: ${now.toLocaleString("default", { month: "long", year: "numeric" })}`;
            break;
          default: // daily
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            dateLabel = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        }

        const startISO = startDate.toISOString();
        const endISO = now.toISOString();

        // Fetch team members via user_roles and profiles
        const { data: roleUsers } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["user", "telesales", "manager"]);

        const userIds = [...new Set((roleUsers || []).map((r: any) => r.user_id))];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const profileMap: Record<string, { name: string; email: string }> = {};
        (profiles || []).forEach((p: any) => {
          profileMap[p.user_id] = { name: p.full_name || p.email || "Unknown", email: p.email || "" };
        });

        // Fetch leads
        const { data: leads } = await supabase
          .from("leads")
          .select("id, status, assigned_to, created_at")
          .gte("created_at", startISO)
          .lte("created_at", endISO);

        // Fetch call logs
        const { data: callLogs } = await supabase
          .from("call_logs")
          .select("user_id, outcome, duration_seconds")
          .gte("created_at", startISO)
          .lte("created_at", endISO);

        // Fetch follow-ups
        const { data: followUps } = await supabase
          .from("follow_ups")
          .select("user_id, completed")
          .gte("created_at", startISO)
          .lte("created_at", endISO);

        // Build stats per team member
        const statsMap: Record<string, TeamMemberStats> = {};
        userIds.forEach((uid) => {
          const p = profileMap[uid] || { name: "Unknown", email: "" };
          statsMap[uid] = {
            userId: uid,
            name: p.name,
            email: p.email,
            totalLeads: 0, hotLeads: 0, warmLeads: 0, coldLeads: 0, converted: 0, newLeads: 0,
            totalCalls: 0, answeredCalls: 0, totalCallDuration: 0,
            followUpsCompleted: 0, followUpsPending: 0,
          };
        });

        (leads || []).forEach((l: any) => {
          const uid = l.assigned_to;
          if (uid && statsMap[uid]) {
            statsMap[uid].totalLeads++;
            switch (l.status) {
              case "hot": statsMap[uid].hotLeads++; break;
              case "warm": statsMap[uid].warmLeads++; break;
              case "cold": statsMap[uid].coldLeads++; break;
              case "converted": statsMap[uid].converted++; break;
              case "new": statsMap[uid].newLeads++; break;
            }
          }
        });

        (callLogs || []).forEach((c: any) => {
          if (statsMap[c.user_id]) {
            statsMap[c.user_id].totalCalls++;
            if (c.outcome === "answered") statsMap[c.user_id].answeredCalls++;
            statsMap[c.user_id].totalCallDuration += c.duration_seconds || 0;
          }
        });

        (followUps || []).forEach((f: any) => {
          if (statsMap[f.user_id]) {
            if (f.completed) statsMap[f.user_id].followUpsCompleted++;
            else statsMap[f.user_id].followUpsPending++;
          }
        });

        const allStats = Object.values(statsMap).sort((a, b) => b.totalLeads - a.totalLeads);

        const html = generateReportHTML(
          allStats,
          schedule.name,
          schedule.frequency,
          dateLabel,
          schedule.include_call_stats,
          schedule.include_lead_stats,
          schedule.include_performance,
          schedule.include_conversion
        );

        const subject = `📊 ${schedule.name} - ${schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} Report (${dateLabel})`;

        // Send email
        if (!Deno.env.get("RESEND_API_KEY")) {
          console.log("RESEND_API_KEY not set, skipping email");
          results.push({ schedule: schedule.name, status: "skipped_no_api_key" });
          continue;
        }

        const emailResult = await resend.emails.send({
          from: "Bull Star Realty CRM <notifications@bullstarrealty.ae>",
          to: schedule.recipient_emails,
          cc: schedule.cc_emails.length > 0 ? schedule.cc_emails : undefined,
          subject,
          html,
        });

        // Update last_sent_at
        await supabase
          .from("automated_report_schedules")
          .update({ last_sent_at: new Date().toISOString() } as any)
          .eq("id", schedule.id);

        results.push({ schedule: schedule.name, status: "sent", emailId: emailResult?.data?.id });
      } catch (scheduleError: any) {
        console.error(`Error processing schedule ${schedule.name}:`, scheduleError);
        results.push({ schedule: schedule.name, status: "error", error: scheduleError.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("MIS Report Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
