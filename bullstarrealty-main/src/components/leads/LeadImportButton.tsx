import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedLead {
  full_name: string;
  email: string;
  phone?: string;
  interest?: string;
  status?: string;
  message?: string;
  source?: string;
  country?: string;
  assigned_to_raw?: string;
  captured_date?: string;
  assigned_date?: string;
  activities_summary?: string;
  notes?: string;
  call_logs?: string;
  follow_ups?: string;
  valid: boolean;
  error?: string;
  rowNumber: number;
}

interface LeadImportButtonProps {
  onImportComplete?: () => void;
  className?: string;
}

interface ColumnDetection {
  name?: number;
  email?: number;
  phone?: number;
  interest?: number;
  status?: number;
  message?: number;
  source?: number;
  country?: number;
  assigned_to?: number;
  captured_date?: number;
  assigned_date?: number;
  activities_summary?: number;
  notes?: number;
  call_logs?: number;
  follow_ups?: number;
}

const VALID_STATUSES = ["new", "warm", "cold", "hot", "not_interested", "converted"];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        row.push(current.trim());
        if (row.some((c) => c !== "")) rows.push(row);
        row = [];
        current = "";
        if (char === "\r") i++;
      } else {
        current += char;
      }
    }
  }

  row.push(current.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function buildColumnMap(headers: string[]): ColumnDetection {
  const map: ColumnDetection = {};

  headers.forEach((raw, index) => {
    const h = normalizeHeader(raw);

    if ((h === "name" || h === "full_name" || h === "fullname") && map.name === undefined) map.name = index;
    if ((h.includes("name") && !h.includes("assigned") && !h.includes("company") && map.name === undefined)) map.name = index;

    if ((h === "email" || h === "email_id" || h.includes("email")) && map.email === undefined) map.email = index;
    if ((h.includes("phone") || h.includes("mobile") || h.includes("contact") || h.includes("whatsapp")) && map.phone === undefined) map.phone = index;

    if ((h === "interest" || h.includes("interest") || h.includes("project") || h.includes("property") || h.includes("requirement")) && map.interest === undefined) map.interest = index;
    if ((h === "status" || h === "lead_status" || h.includes("status")) && map.status === undefined) map.status = index;

    if ((h === "message" || h.includes("message") || h.includes("remark")) && map.message === undefined) map.message = index;
    if ((h === "source" || h.includes("source") || h.includes("reference")) && map.source === undefined) map.source = index;

    if ((h === "country" || h.includes("country")) && map.country === undefined) map.country = index;
    if ((h === "assigned_to" || h.includes("assigned_to") || h.includes("assignedto")) && map.assigned_to === undefined) map.assigned_to = index;

    if ((h === "captured_date" || h === "captureddate" || h === "created_at") && map.captured_date === undefined) map.captured_date = index;
    if ((h === "assigned_date" || h === "assigneddate" || h === "assigned_at") && map.assigned_date === undefined) map.assigned_date = index;

    if ((h === "activities_summary" || h.includes("activities")) && map.activities_summary === undefined) map.activities_summary = index;
    if ((h === "notes" || h.includes("notes")) && map.notes === undefined) map.notes = index;
    if ((h === "call_logs" || h.includes("call_logs") || (h.includes("call") && h.includes("log"))) && map.call_logs === undefined) map.call_logs = index;
    if ((h === "follow_ups" || h.includes("follow_ups") || h.includes("followups")) && map.follow_ups === undefined) map.follow_ups = index;
  });

  return map;
}

function safeCell(row: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return (row[index] || "").toString().trim();
}

function normalizeCountry(value: string): "dubai" | "india" | null {
  const v = value.toLowerCase().trim();
  if (!v) return null;
  if (v.includes("dubai") || v.includes("uae")) return "dubai";
  if (v.includes("india")) return "india";
  return null;
}

function parseDateOrNull(value: string | undefined): string | null {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

function parseExcel(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  return rows.map((r) => r.map((cell) => (cell ?? "").toString().trim()));
}

function mapRowsToLeads(rows: string[][]): { leads: ParsedLead[]; map: ColumnDetection; headers: string[] } {
  const headers = (rows[0] || []).map((h) => h.toString().trim());
  const map = buildColumnMap(headers);

  const leads: ParsedLead[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const full_name = safeCell(row, map.name);
    const email = safeCell(row, map.email);
    const phone = safeCell(row, map.phone);
    const interest = safeCell(row, map.interest);
    const statusRaw = safeCell(row, map.status).toLowerCase();
    const message = safeCell(row, map.message);
    const source = safeCell(row, map.source);
    const country = safeCell(row, map.country);
    const assigned_to_raw = safeCell(row, map.assigned_to);
    const captured_date = safeCell(row, map.captured_date);
    const assigned_date = safeCell(row, map.assigned_date);
    const activities_summary = safeCell(row, map.activities_summary);
    const notes = safeCell(row, map.notes);
    const call_logs = safeCell(row, map.call_logs);
    const follow_ups = safeCell(row, map.follow_ups);

    if (![full_name, email, phone, interest, statusRaw, message, source, country, assigned_to_raw, captured_date, assigned_date, activities_summary, notes, call_logs, follow_ups].some(Boolean)) {
      continue;
    }

    let valid = true;
    let error = "";

    if (!full_name && !email) {
      valid = false;
      error = "Name and email are empty";
    } else if (!email) {
      valid = false;
      error = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      valid = false;
      error = "Invalid email format";
    }

    leads.push({
      full_name: full_name || email.split("@")[0],
      email,
      phone: phone || undefined,
      interest: interest || undefined,
      status: VALID_STATUSES.includes(statusRaw) ? statusRaw : undefined,
      message: message || undefined,
      source: source || undefined,
      country: country || undefined,
      assigned_to_raw: assigned_to_raw || undefined,
      captured_date: captured_date || undefined,
      assigned_date: assigned_date || undefined,
      activities_summary: activities_summary || undefined,
      notes: notes || undefined,
      call_logs: call_logs || undefined,
      follow_ups: follow_ups || undefined,
      valid,
      error,
      rowNumber: i + 1,
    });
  }

  return { leads, map, headers };
}

export const LeadImportButton = ({ onImportComplete, className }: LeadImportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [defaultSource, setDefaultSource] = useState("bulk_import");
  const [detectedMap, setDetectedMap] = useState<ColumnDetection>({});
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [fileLabel, setFileLabel] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectedFields = useMemo(() => {
    const rows: { field: keyof ColumnDetection; label: string }[] = [
      { field: "name", label: "Name" },
      { field: "email", label: "Email" },
      { field: "phone", label: "Phone" },
      { field: "interest", label: "Interest" },
      { field: "status", label: "Status" },
      { field: "message", label: "Message" },
      { field: "source", label: "Source" },
      { field: "country", label: "Country" },
      { field: "assigned_to", label: "Assigned To" },
      { field: "captured_date", label: "Captured Date" },
      { field: "assigned_date", label: "Assigned Date" },
      { field: "activities_summary", label: "Activities Summary" },
      { field: "notes", label: "Notes" },
      { field: "call_logs", label: "Call Logs" },
      { field: "follow_ups", label: "Follow-ups" },
    ];

    return rows
      .filter(({ field }) => detectedMap[field] !== undefined)
      .map(({ field, label }) => ({
        label,
        header: detectedHeaders[detectedMap[field] as number] || "(unknown)",
      }));
  }, [detectedHeaders, detectedMap]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: string[][] = [];

      if (ext === "csv") {
        rows = parseCSV(await file.text());
      } else if (ext === "xlsx" || ext === "xls") {
        rows = parseExcel(await file.arrayBuffer());
      } else {
        toast.error("Unsupported file type. Upload CSV, XLSX, or XLS.");
        return;
      }

      if (rows.length < 2) {
        toast.error("File appears empty or has no data rows.");
        return;
      }

      const { leads, map, headers } = mapRowsToLeads(rows);
      if (map.name === undefined && map.email === undefined) {
        toast.error("Could not detect Name or Email columns. Use headers like Name, Email.");
        return;
      }

      setParsedLeads(leads);
      setDetectedMap(map);
      setDetectedHeaders(headers);
      setFileLabel(file.name);
      setImportResult(null);
      setIsOpen(true);
    } catch (error) {
      console.error("Import parse error:", error);
      toast.error("Failed to parse file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resolveAssignedTo = (raw: string | undefined, teamUsers: Array<{ id: string; email: string; fullName: string | null }>): string | null => {
    if (!raw) return null;
    const value = raw.trim();
    if (!value) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return value;

    const lower = value.toLowerCase();
    const byEmail = teamUsers.find((u) => (u.email || "").toLowerCase() === lower);
    if (byEmail) return byEmail.id;

    const byName = teamUsers.find((u) => (u.fullName || "").toLowerCase() === lower);
    if (byName) return byName.id;

    return null;
  };

  const buildMessage = (lead: ParsedLead): string | null => {
    const parts: string[] = [];
    if (lead.message) parts.push(lead.message);
    if (lead.activities_summary) parts.push(`Activities Summary: ${lead.activities_summary}`);
    if (lead.notes) parts.push(`Notes: ${lead.notes}`);
    if (lead.call_logs) parts.push(`Call Logs: ${lead.call_logs}`);
    if (lead.follow_ups) parts.push(`Follow-ups: ${lead.follow_ups}`);
    if (parts.length === 0) return null;
    return parts.join("\n");
  };

  const handleImport = async () => {
    const validLeads = parsedLeads.filter((l) => l.valid);
    if (validLeads.length === 0) {
      toast.error("No valid leads to import.");
      return;
    }

    setIsImporting(true);
    let success = 0;
    let failed = 0;

    let teamUsers: Array<{ id: string; email: string; fullName: string | null }> = [];
    try {
      const teamRes = await supabase.functions.invoke("list-team-members");
      teamUsers = (teamRes.data?.users || []) as Array<{ id: string; email: string; fullName: string | null }>;
    } catch {
      teamUsers = [];
    }

    const chunkSize = 50;
    for (let i = 0; i < validLeads.length; i += chunkSize) {
      const chunk = validLeads.slice(i, i + chunkSize);
      const payload = chunk.map((lead) => ({
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone || null,
        interest: lead.interest || null,
        status: (lead.status as any) || "new",
        source: lead.source || defaultSource,
        message: buildMessage(lead),
        country: (normalizeCountry(lead.country || "") as any) || null,
        assigned_to: resolveAssignedTo(lead.assigned_to_raw, teamUsers),
        created_at: parseDateOrNull(lead.captured_date) || undefined,
        assigned_at: parseDateOrNull(lead.assigned_date) || undefined,
      }));

      const { data, error } = await supabase.from("leads").insert(payload).select("id");
      if (!error) {
        success += data?.length ?? 0;
        continue;
      }

      for (const row of payload) {
        const { data: singleData, error: singleError } = await supabase.from("leads").insert(row).select("id");
        if (singleError) failed += 1;
        else success += singleData?.length ?? 0;
      }
    }

    setImportResult({ success, failed });
    setIsImporting(false);

    if (success > 0) {
      toast.success(`Imported ${success} leads.`);
      onImportComplete?.();
    }
    if (failed > 0) toast.error(`Failed to import ${failed} leads.`);
  };

  const downloadTemplate = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Interest",
      "Status",
      "Message",
      "Source",
      "Country",
      "Assigned To",
      "Captured Date",
      "Assigned Date",
      "Activities Summary",
      "Notes",
      "Call Logs",
      "Follow-ups",
    ].join(",");

    const sample = [
      "John Doe",
      "john@example.com",
      "+971501234567",
      "Villa in Marina",
      "warm",
      "Interested in 2BR",
      "website",
      "dubai",
      "",
      "2026-02-21 10:30",
      "",
      "Lead created",
      "Asked for brochure",
      "No answer",
      "Call tomorrow",
    ].join(",");

    const blob = new Blob([`${headers}\n${sample}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lead_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedLeads.filter((l) => l.valid).length;
  const invalidCount = parsedLeads.length - validCount;

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
      <Button variant="outline" className={cn("h-9", className)} onClick={() => fileInputRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" />
        Import
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-[95vw] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[hsl(var(--gold))]" />
              Import Leads
            </DialogTitle>
            <DialogDescription>
              Auto-detected fields from <span className="font-medium">{fileLabel || "selected file"}</span>. Review and import valid rows.
            </DialogDescription>
          </DialogHeader>

          {importResult ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">Import Complete</p>
                <p className="mt-1 text-muted-foreground">
                  {importResult.success} imported{importResult.failed > 0 ? `, ${importResult.failed} failed` : ""}
                </p>
              </div>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="border-red-500/30 text-red-500">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {invalidCount} invalid
                  </Badge>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Default source:</span>
                  <Select value={defaultSource} onValueChange={setDefaultSource}>
                    <SelectTrigger className="h-8 w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulk_import">Bulk Import</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="cold_call">Cold Call</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  <Download className="mr-1 h-4 w-4" />
                  Template
                </Button>
              </div>

              <div className="rounded-lg border border-border/70 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Detected field mapping</p>
                <div className="flex flex-wrap gap-2">
                  {detectedFields.map((item) => (
                    <Badge key={item.label} variant="secondary" className="font-normal">
                      {item.label}: {item.header}
                    </Badge>
                  ))}
                  {detectedFields.length === 0 && <span className="text-xs text-muted-foreground">No fields detected</span>}
                </div>
              </div>

              <div className="flex-1 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[56px]">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Captured Date</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Activities Summary</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Call Logs</TableHead>
                      <TableHead>Follow-ups</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLeads.slice(0, 100).map((lead) => (
                      <TableRow key={lead.rowNumber} className={cn(!lead.valid && "bg-red-500/5")}>
                        <TableCell className="text-xs text-muted-foreground">{lead.rowNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {!lead.valid && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                            <span className={cn("text-sm", !lead.valid && "text-red-500")}>{lead.full_name || "--"}</span>
                          </div>
                          {lead.error && <p className="mt-0.5 text-xs text-red-500">{lead.error}</p>}
                        </TableCell>
                        <TableCell className="text-sm">{lead.email || "--"}</TableCell>
                        <TableCell className="text-sm">{lead.phone || "--"}</TableCell>
                        <TableCell className="text-sm">{lead.interest || "--"}</TableCell>
                        <TableCell className="text-sm capitalize">{lead.status || "new"}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">{lead.message || "--"}</TableCell>
                        <TableCell className="text-sm">{lead.source || defaultSource}</TableCell>
                        <TableCell className="text-sm">{lead.country || "--"}</TableCell>
                        <TableCell className="text-sm">{lead.assigned_to_raw || "--"}</TableCell>
                        <TableCell className="text-sm">{lead.captured_date || "--"}</TableCell>
                        <TableCell className="text-sm">{lead.assigned_date || "--"}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">{lead.activities_summary || "--"}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">{lead.notes || "--"}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">{lead.call_logs || "--"}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">{lead.follow_ups || "--"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedLeads.length > 100 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">Showing first 100 of {parsedLeads.length} rows</p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || validCount === 0}
                  className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold))]/90"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import {validCount} Leads
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
