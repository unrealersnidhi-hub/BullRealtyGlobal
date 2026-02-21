import https from "node:https";

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : "";
};

const baseUrl = getArg("--url");
const apiKey = getArg("--key");

if (!baseUrl || !apiKey) {
  console.error("Usage: node scripts/check-import-counts.mjs --url <SUPABASE_URL> --key <API_KEY>");
  process.exit(1);
}

const tables = [
  "api_keys",
  "attendance",
  "automated_report_schedules",
  "blog_categories",
  "call_logs",
  "employees",
  "follow_ups",
  "integration_logs",
  "lead_activities",
  "lead_assignees",
  "lead_assignment_history",
  "lead_interest_tags",
  "lead_notes",
  "leads",
  "mcube_call_records",
  "meetings",
  "otp_verifications",
  "profiles",
  "team_members",
  "user_locations",
  "user_roles",
  "user_sessions",
  "webhooks",
];

function countTable(table) {
  return new Promise((resolve) => {
    const url = `${baseUrl}/rest/v1/${table}?select=id&limit=1`;
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          Prefer: "count=exact",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const cr = res.headers["content-range"];
          if ((res.statusCode === 200 || res.statusCode === 206) && typeof cr === "string") {
            const m = cr.match(/\/(\d+)$/);
            if (m) return resolve({ table, result: m[1] });
          }
          resolve({ table, result: `inaccessible (${res.statusCode ?? "?"})` });
        });
      },
    );

    req.on("error", (err) => {
      resolve({ table, result: `error (${err.message})` });
    });
    req.end();
  });
}

console.log("Checking row counts via PostgREST...");
for (const table of tables) {
  // eslint-disable-next-line no-await-in-loop
  const out = await countTable(table);
  console.log(`${out.table.padEnd(30)} ${String(out.result).padStart(8)}`);
}
