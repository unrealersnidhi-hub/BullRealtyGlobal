import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Plus, Trash2, Eye, Send, Loader2, Calculator, Copy, Download, Pencil, LayoutTemplate,
} from "lucide-react";
import { format, addDays } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────
interface Quotation {
  id: string;
  quote_number: string;
  lead_id: string | null;
  created_by: string;
  property_name: string;
  property_type: string | null;
  property_location: string | null;
  unit_details: string | null;
  base_price: number;
  additional_costs: unknown;
  discounts: unknown;
  total_amount: number;
  currency: string;
  payment_plan: unknown;
  terms_and_conditions: string | null;
  validity_days: number;
  valid_until: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Lead { id: string; full_name: string; email: string; }
interface TeamMember { id: string; email: string; fullName: string | null; }

// ─── Templates ──────────────────────────────────────────────────────
interface QuotationTemplate {
  id: string;
  name: string;
  type: "construction_linked" | "time_linked" | "one_time";
  fields: TemplateField[];
  installments: InstallmentRow[];
  oneTimeCosts: OneTimeCost[];
  termsAndConditions: string;
}

interface TemplateField {
  label: string;
  key: string;
  type: "text" | "number" | "textarea";
  defaultValue: string;
  required: boolean;
}

interface InstallmentRow {
  title: string;
  percentage: string;
}

interface OneTimeCost {
  name: string;
  rate: number;
  perSqft: boolean;
}

const DEFAULT_TERMS = `• Price prevailing as on the date of Booking and acceptance by the Company shall be final and shall be escalation free.
• Price indicated above are subject to revision at the discretion of the company.
• Stamp duty, registration and other related charges/cost are extra and shall be payable along with the last instalment.
• All applicable govt. charges, taxes, cesses like EDC, IDC, CDC, GST & other taxes, cess, levies etc. at present or in future & any enhancement thereof shall be additionally payable by the applicant/allottee as detailed in Buyer & Seller Agreement.
• Electricity load and meter as per UPPCL will be installed; cost of the same will be paid extra as per load installed.
• The construction linked stages can be called for payment in any sequence, depending on the sequence undertaken by the developer irrespective of the sequence mentioned herein above.
• Payments to be made through cheque/DD payable at Varanasi in favour of the developer.`;

const DEFAULT_TEMPLATES: QuotationTemplate[] = [
  {
    id: "tpl-construction",
    name: "Construction Linked Plan",
    type: "construction_linked",
    fields: [
      { label: "Project Name", key: "projectName", type: "text", defaultValue: "", required: true },
      { label: "Developer Name", key: "developerName", type: "text", defaultValue: "", required: false },
      { label: "Floor / Unit", key: "floorUnit", type: "text", defaultValue: "", required: false },
      { label: "Shop / Unit No.", key: "shopNo", type: "text", defaultValue: "", required: true },
      { label: "Rate (per sqft)", key: "rate", type: "number", defaultValue: "", required: true },
      { label: "Super Built-up Area (sqft)", key: "area", type: "number", defaultValue: "", required: true },
      { label: "GST %", key: "gstPercent", type: "number", defaultValue: "12", required: true },
      { label: "Customer Name", key: "customerName", type: "text", defaultValue: "", required: false },
    ],
    installments: [
      { title: "On time of booking", percentage: "20" },
      { title: "1st Installment of Basement slab", percentage: "10" },
      { title: "2nd Installment of 1st slab", percentage: "10" },
      { title: "3rd Installment of 2nd slab", percentage: "10" },
      { title: "4th Installment of ground slab", percentage: "8" },
      { title: "5th Installment of First slab", percentage: "8" },
      { title: "6th Installment of second slab", percentage: "8" },
      { title: "7th Installment of third slab", percentage: "8" },
      { title: "8th Installment of fourth slab", percentage: "8" },
      { title: "9th Installment of fifth slab", percentage: "10" },
    ],
    oneTimeCosts: [
      { name: "Interest Free Maintenance Security", rate: 100, perSqft: true },
      { name: "External Electrification Cost/Fire Fighting Equipment", rate: 100, perSqft: true },
      { name: "Power Backup Installation Cost Min.3KVA", rate: 25000, perSqft: false },
    ],
    termsAndConditions: DEFAULT_TERMS,
  },
  {
    id: "tpl-time",
    name: "Time Linked Plan",
    type: "time_linked",
    fields: [
      { label: "Project Name", key: "projectName", type: "text", defaultValue: "", required: true },
      { label: "Developer Name", key: "developerName", type: "text", defaultValue: "", required: false },
      { label: "Floor / Unit", key: "floorUnit", type: "text", defaultValue: "", required: false },
      { label: "Shop / Unit No.", key: "shopNo", type: "text", defaultValue: "", required: true },
      { label: "Rate (per sqft)", key: "rate", type: "number", defaultValue: "", required: true },
      { label: "Super Built-up Area (sqft)", key: "area", type: "number", defaultValue: "", required: true },
      { label: "Discount %", key: "discountPercent", type: "number", defaultValue: "5", required: false },
      { label: "GST %", key: "gstPercent", type: "number", defaultValue: "12", required: true },
      { label: "Customer Name", key: "customerName", type: "text", defaultValue: "", required: false },
    ],
    installments: [
      { title: "At the time of Booking", percentage: "10" },
      { title: "On 30th day of Booking", percentage: "40" },
      { title: "On 365th day of Booking", percentage: "50" },
    ],
    oneTimeCosts: [
      { name: "Interest Free Maintenance Security", rate: 100, perSqft: true },
      { name: "External Electrification Cost/Fire Fighting Equipment", rate: 100, perSqft: true },
      { name: "Power Backup Installation Cost Min.3KVA", rate: 25000, perSqft: false },
    ],
    termsAndConditions: DEFAULT_TERMS,
  },
  {
    id: "tpl-split",
    name: "A+B Split Plan",
    type: "one_time",
    fields: [
      { label: "Project Name", key: "projectName", type: "text", defaultValue: "", required: true },
      { label: "Developer Name", key: "developerName", type: "text", defaultValue: "", required: false },
      { label: "Floor / Unit", key: "floorUnit", type: "text", defaultValue: "", required: false },
      { label: "Shop / Unit No.", key: "shopNo", type: "text", defaultValue: "", required: true },
      { label: "Rate (per sqft)", key: "rate", type: "number", defaultValue: "", required: true },
      { label: "Super Built-up Area (sqft)", key: "area", type: "number", defaultValue: "", required: true },
      { label: "A Split %", key: "splitAPercent", type: "number", defaultValue: "50", required: true },
      { label: "B Split %", key: "splitBPercent", type: "number", defaultValue: "50", required: true },
      { label: "A Discount %", key: "discountAPercent", type: "number", defaultValue: "20", required: false },
      { label: "B Discount %", key: "discountBPercent", type: "number", defaultValue: "20", required: false },
      { label: "GST %", key: "gstPercent", type: "number", defaultValue: "12", required: true },
      { label: "Customer Name", key: "customerName", type: "text", defaultValue: "", required: false },
    ],
    installments: [
      { title: "At the time of Booking", percentage: "10" },
      { title: "On 30th day of Booking", percentage: "40" },
      { title: "On 365th day of Booking", percentage: "50" },
    ],
    oneTimeCosts: [
      { name: "Interest Free Maintenance Security", rate: 100, perSqft: true },
      { name: "External Electrification Cost/Fire Fighting Equipment", rate: 100, perSqft: true },
      { name: "Power Backup Installation Cost Min.3KVA", rate: 25000, perSqft: false },
    ],
    termsAndConditions: DEFAULT_TERMS,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtCurrency = (amount: number, currency: string) => {
  const symbol = currency === "INR" ? "₹" : "د.إ";
  return `${symbol} ${fmt(amount)}`;
};

const STORAGE_KEY = "bsr-quotation-templates";

const loadTemplates = (): QuotationTemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_TEMPLATES;
};

const saveTemplates = (templates: QuotationTemplate[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

// ─── Component ──────────────────────────────────────────────────────
export const QuotationGenerator = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewQuote, setViewQuote] = useState<Quotation | null>(null);
  const [userCountry, setUserCountry] = useState<"dubai" | "india">("dubai");
  const [activeSubTab, setActiveSubTab] = useState("quotes");

  // Template management
  const [templates, setTemplates] = useState<QuotationTemplate[]>(loadTemplates);
  const [editingTemplate, setEditingTemplate] = useState<QuotationTemplate | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  // Create quotation form state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [validityDays, setValidityDays] = useState("30");
  const [linkedLeadId, setLinkedLeadId] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchQuotations();
    fetchLeads();
    fetchTeamMembers();
    fetchUserCountry();
  }, []);

  const fetchUserCountry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("country").eq("user_id", user.id).maybeSingle();
      if (profile?.country) setUserCountry(profile.country);
    } catch (e) { console.error(e); }
  };

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from("quotations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setQuotations(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load quotations");
    } finally { setIsLoading(false); }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads").select("id, full_name, email").order("full_name");
      if (error) throw error;
      setLeads(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await supabase.functions.invoke("list-team-members");
      if (response.data?.users) setTeamMembers(response.data.users);
    } catch (e) { console.error(e); }
  };

  const getCompanyName = () => userCountry === "india" ? "Bull Realty Global Pvt Ltd" : "Bull Star Realty";
  const getCompanyDetails = () => {
    if (userCountry === "india") {
      return {
        name: "Bull Realty Global Pvt Ltd",
        address: "Arazi No:- 128-K, Bull House, Bull Events, Premchand Smarak Rd, near Munshi, Lamhi, Varanasi, Uttar Pradesh 221007",
        phone: "Toll Free: 1800-212-0121",
        email: "info@bullrealtyglobal.com",
      };
    }
    return {
      name: "Bull Star Realty",
      address: "Dubai, United Arab Emirates",
      phone: "+971 545304304",
      email: "support@bullstarrealty.ae",
    };
  };

  const getCreatorName = (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    return member?.fullName || member?.email || "Unknown";
  };

  // ─── Template Editor ─────────────────────────────────────────────
  const openTemplateEditor = (template?: QuotationTemplate) => {
    if (template) {
      setEditingTemplate({ ...template, fields: [...template.fields], installments: [...template.installments], oneTimeCosts: [...template.oneTimeCosts] });
    } else {
      setEditingTemplate({
        id: `tpl-${Date.now()}`,
        name: "",
        type: "construction_linked",
        fields: [
          { label: "Project Name", key: "projectName", type: "text", defaultValue: "", required: true },
          { label: "Rate", key: "rate", type: "number", defaultValue: "", required: true },
          { label: "Area (sqft)", key: "area", type: "number", defaultValue: "", required: true },
          { label: "GST %", key: "gstPercent", type: "number", defaultValue: "12", required: true },
        ],
        installments: [{ title: "On Booking", percentage: "100" }],
        oneTimeCosts: [],
        termsAndConditions: DEFAULT_TERMS,
      });
    }
    setIsTemplateDialogOpen(true);
  };

  const saveTemplate = () => {
    if (!editingTemplate || !editingTemplate.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    const updated = templates.map(t => t.id === editingTemplate.id ? editingTemplate : t);
    if (!templates.find(t => t.id === editingTemplate.id)) {
      updated.push(editingTemplate);
    }
    setTemplates(updated);
    saveTemplates(updated);
    setIsTemplateDialogOpen(false);
    setEditingTemplate(null);
    toast.success("Template saved");
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    toast.success("Template deleted");
  };

  // ─── Create Quotation ────────────────────────────────────────────
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const openCreateDialog = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    const defaults: Record<string, string> = {};
    tpl.fields.forEach(f => { defaults[f.key] = f.defaultValue; });
    setFieldValues(defaults);
    setValidityDays("30");
    setLinkedLeadId("");
    setInternalNotes("");
    setIsCreateDialogOpen(true);
  };

  const handleCreateQuotation = async () => {
    if (!selectedTemplate) return;
    const rate = parseFloat(fieldValues.rate || "0");
    const area = parseFloat(fieldValues.area || "0");
    if (!rate || !area) {
      toast.error("Rate and Area are required");
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: quoteNumber, error: fnError } = await supabase.rpc("generate_quote_number");
      if (fnError) throw fnError;

      const baseAmount = rate * area;
      const gstPercent = parseFloat(fieldValues.gstPercent || "12");
      const gst = baseAmount * (gstPercent / 100);
      const total = baseAmount + gst;
      const currency = userCountry === "india" ? "INR" : "AED";
      const validity = parseInt(validityDays) || 30;

      const { error } = await supabase.from("quotations").insert({
        quote_number: quoteNumber as string,
        lead_id: linkedLeadId || null,
        created_by: user.id,
        property_name: fieldValues.projectName || "Untitled",
        property_type: fieldValues.shopNo || null,
        property_location: fieldValues.floorUnit || null,
        unit_details: `Area: ${area} sqft | Rate: ${rate}/sqft`,
        base_price: baseAmount,
        additional_costs: JSON.parse(JSON.stringify(selectedTemplate.oneTimeCosts)),
        discounts: JSON.parse(JSON.stringify([])),
        total_amount: total,
        currency,
        payment_plan: JSON.parse(JSON.stringify({ template: selectedTemplate.name, installments: selectedTemplate.installments, fieldValues })),
        terms_and_conditions: selectedTemplate.termsAndConditions,
        validity_days: validity,
        valid_until: format(addDays(new Date(), validity), "yyyy-MM-dd"),
        notes: internalNotes || null,
        status: "draft",
      });

      if (error) throw error;
      toast.success(`Quotation ${quoteNumber} created`);
      setIsCreateDialogOpen(false);
      fetchQuotations();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create quotation");
    } finally { setIsCreating(false); }
  };

  // ─── Generate PDF ─────────────────────────────────────────────────
  const generatePDF = (quote: Quotation) => {
    const company = getCompanyDetails();
    const creatorName = getCreatorName(quote.created_by);
    const linkedLead = leads.find(l => l.id === quote.lead_id);
    const plan = quote.payment_plan as any;
    const fieldVals = plan?.fieldValues || {};
    const installments = plan?.installments || [];
    const oneTimeCosts = (quote.additional_costs as any[]) || [];
    const rate = parseFloat(fieldVals.rate || "0");
    const area = parseFloat(fieldVals.area || "0");
    const baseAmount = rate * area;
    const gstPercent = parseFloat(fieldVals.gstPercent || "12");
    const gst = baseAmount * (gstPercent / 100);
    const totalWithGst = baseAmount + gst;

    // One-time costs calculation
    let oneTimeSub = 0;
    const oneTimeRows = oneTimeCosts.map((c: any) => {
      const amt = c.perSqft ? c.rate * area : c.rate;
      oneTimeSub += amt;
      return { ...c, amount: amt };
    });
    const oneTimeGst = oneTimeSub * (gstPercent / 100);
    const oneTimeTotal = oneTimeSub + oneTimeGst;
    const finalAmount = totalWithGst + oneTimeTotal;

    const printContent = `<!DOCTYPE html><html><head><title>Quotation ${quote.quote_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#222;background:#fff;font-size:12px}
.page{max-width:800px;margin:0 auto;padding:30px 40px}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th,td{border:1px solid #999;padding:6px 10px;text-align:center}
.header-row{background:#FFD700;font-weight:bold;font-size:14px;text-align:center}
.sub-header{background:#E0E0E0;font-weight:bold}
.section-header{background:#00CED1;font-weight:bold;color:#000;font-size:12px}
.total-row{font-weight:bold}
.amount{text-align:right}
.highlight{background:#FFFACD}
.note-row{background:#FFD700;font-weight:bold;text-align:center;font-size:11px;color:#c00}
.terms{margin-top:16px;padding:12px;font-size:11px;line-height:1.7}
.terms h4{font-weight:bold;text-align:center;margin-bottom:8px;font-size:13px}
.terms p{text-align:center;margin-bottom:4px}
.footer{text-align:center;margin-top:20px;font-size:10px;color:#666;border-top:2px solid #B8860B;padding-top:10px}
.company-header{text-align:center;margin-bottom:16px}
.company-header h1{color:#B8860B;font-size:14px;margin-bottom:2px}
.company-header p{font-size:10px;color:#555}
@media print{body{padding:0}.page{padding:20px}}
</style></head><body><div class="page">
<div class="company-header">
  <h1>${company.name}</h1>
  <p>${company.address}</p>
  <p>${company.phone} | ${company.email}</p>
  <p style="margin-top:4px;font-size:9px">Quote #: ${quote.quote_number} | Date: ${format(new Date(quote.created_at), "dd-MM-yyyy")}</p>
</div>

${linkedLead ? `<p style="margin-bottom:8px;font-size:11px"><strong>Client:</strong> ${linkedLead.full_name} (${linkedLead.email})</p>` : ""}

<table>
  <tr class="header-row"><td colspan="4">${fieldVals.projectName || quote.property_name}</td></tr>
  ${fieldVals.developerName ? `<tr><td colspan="4">A Project by ${fieldVals.developerName}</td></tr>` : ""}
  ${fieldVals.floorUnit ? `<tr><td colspan="4">Quotation for ${fieldVals.floorUnit}</td></tr>` : ""}
  ${fieldVals.customerName ? `<tr><td colspan="4" style="text-align:left;font-weight:bold">${fieldVals.customerName}</td></tr>` : ""}
</table>

<table>
  <tr class="sub-header"><th>DESCRIPTION</th><th>RATE</th><th>SUPER BUILT-UP AREA (SQFT)</th><th>AMOUNT</th></tr>
  <tr><td>${fieldVals.shopNo || "Unit"}</td><td>${fmt(rate)}</td><td>${fmt(area)}</td><td class="amount">${fmt(baseAmount)}</td></tr>
  <tr><td colspan="2" style="color:#00CED1;font-weight:bold">GST - (${gstPercent}%)</td><td></td><td class="amount">${fmt(gst)}</td></tr>
  <tr class="total-row"><td colspan="3">TOTAL</td><td class="amount">${fmt(totalWithGst)}</td></tr>
</table>

${installments.length > 0 ? `
<table>
  <tr class="section-header"><th colspan="3">PAYMENT SCHEDULE</th></tr>
  <tr class="sub-header"><th>TITLE</th><th>INSTALLMENT</th><th>AMOUNT</th></tr>
  ${installments.map((inst: any) => {
    const pct = parseFloat(inst.percentage) || 0;
    const amt = totalWithGst * (pct / 100);
    return `<tr><td>${inst.title}</td><td>${inst.percentage}%</td><td class="amount">${fmt(amt)}</td></tr>`;
  }).join("")}
  <tr class="total-row"><td colspan="2">TOTAL</td><td class="amount">${fmt(totalWithGst)}</td></tr>
</table>` : ""}

${oneTimeRows.length > 0 ? `
<table>
  <tr class="section-header"><th colspan="4">ONE TIME PAYMENT</th></tr>
  <tr class="sub-header"><th>ONE TIME PAYMENT</th><th>RATE (Rs)</th><th>SUPER BUILT-UP AREA (SQFT)</th><th>AMOUNT</th></tr>
  ${oneTimeRows.map((c: any) => `<tr><td>${c.name}</td><td>${c.rate}</td><td>${c.perSqft ? fmt(area) : ""}</td><td class="amount">${fmt(c.amount)}</td></tr>`).join("")}
  <tr><td colspan="2" style="color:#00CED1;font-weight:bold">GST@${gstPercent}%</td><td></td><td class="amount">${fmt(oneTimeGst)}</td></tr>
  <tr class="total-row"><td colspan="3">TOTAL</td><td class="amount">${fmt(oneTimeTotal)}</td></tr>
</table>
<table>
  <tr class="highlight total-row"><td colspan="2">Base Payment Including GST and Extra cost TOTAL</td><td>FINAL AMOUNT</td><td class="amount" style="font-size:14px">${fmt(finalAmount)}</td></tr>
</table>` : ""}

<table><tr class="note-row"><td colspan="4">NOTE:-THIS QUOTATION IS VALID TILL ${quote.valid_until ? format(new Date(quote.valid_until), "dd-MM-yyyy") : "N/A"}</td></tr></table>

<div class="terms">
  <h4>TERMS & CONDITIONS</h4>
  ${(quote.terms_and_conditions || DEFAULT_TERMS).split("\n").filter(l => l.trim()).map(l => `<p>${l.trim()}</p>`).join("")}
</div>

<div style="margin-top:16px;padding:10px;border:1px solid #ccc;border-radius:4px;background:#f9f9f9">
  <p style="font-weight:bold;font-size:11px">Prepared By</p>
  <p style="font-size:11px">${creatorName}</p>
  <p style="font-size:10px;color:#666">${company.name} | ${company.phone} | ${company.email}</p>
</div>

<div class="footer">
  <p style="font-weight:bold;color:#B8860B">${company.name}</p>
  <p>${company.address}</p>
  <p>${company.phone} | ${company.email}</p>
</div>
</div></body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("quotations").update({ status: newStatus }).eq("id", quoteId);
      if (error) throw error;
      toast.success(`Quotation marked as ${newStatus}`);
      fetchQuotations();
    } catch (e) { console.error(e); toast.error("Failed to update"); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-secondary text-secondary-foreground",
      sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      accepted: "bg-green-500/10 text-green-600 border-green-500/20",
      rejected: "bg-red-500/10 text-red-600 border-red-500/20",
      expired: "bg-muted text-muted-foreground",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--gold))]" /></div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="quotes"><FileText className="w-4 h-4 mr-1.5" />Quotations</TabsTrigger>
          <TabsTrigger value="templates"><LayoutTemplate className="w-4 h-4 mr-1.5" />Templates</TabsTrigger>
        </TabsList>

        {/* ─── QUOTATIONS TAB ─────────────────────────────────────── */}
        <TabsContent value="quotes" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: quotations.length },
              { label: "Drafts", value: quotations.filter(q => q.status === "draft").length },
              { label: "Sent", value: quotations.filter(q => q.status === "sent").length },
              { label: "Accepted", value: quotations.filter(q => q.status === "accepted").length },
              { label: "Rejected", value: quotations.filter(q => q.status === "rejected").length },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-2xl font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create New from Template */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Create Quotation</CardTitle>
                <CardDescription>Select a template to generate a new quotation</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => openCreateDialog(tpl.id)}
                    className="p-4 border border-border rounded-xl hover:border-[hsl(var(--gold))] hover:bg-accent/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="w-5 h-5 text-[hsl(var(--gold))]" />
                      <span className="font-medium text-sm">{tpl.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tpl.installments.length} installments • {tpl.oneTimeCosts.length} extra costs
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quotations List */}
          <Card>
            <CardHeader><CardTitle className="text-base">All Quotations</CardTitle></CardHeader>
            <CardContent>
              {quotations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No quotations yet. Select a template above to create one.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotations.map(q => (
                        <TableRow key={q.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-sm">{q.quote_number}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(q.quote_number); toast.success("Copied"); }}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{q.property_name}</p>
                            <p className="text-xs text-muted-foreground">{q.property_location || "—"}</p>
                          </TableCell>
                          <TableCell className="font-medium">{fmtCurrency(q.total_amount, q.currency || "AED")}</TableCell>
                          <TableCell>{getStatusBadge(q.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{getCreatorName(q.created_by)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{q.valid_until ? format(new Date(q.valid_until), "MMM d, yyyy") : "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => generatePDF(q)} title="Download PDF"><Download className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setViewQuote(q)}><Eye className="w-4 h-4" /></Button>
                              {q.status === "draft" && (
                                <Button variant="ghost" size="icon" className="text-primary" onClick={() => handleStatusChange(q.id, "sent")}><Send className="w-4 h-4" /></Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TEMPLATES TAB ──────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Quotation Templates</CardTitle>
                <CardDescription>Create and manage quotation templates</CardDescription>
              </div>
              <Button onClick={() => openTemplateEditor()} size="sm">
                <Plus className="w-4 h-4 mr-1" /> New Template
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map(tpl => (
                  <div key={tpl.id} className="flex items-center justify-between p-4 border border-border rounded-xl">
                    <div>
                      <p className="font-medium">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tpl.type.replace("_", " ")} • {tpl.fields.length} fields • {tpl.installments.length} installments
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openTemplateEditor(tpl)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteTemplate(tpl.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Template Editor Dialog ───────────────────────────────── */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate && templates.find(t => t.id === editingTemplate.id) ? "Edit" : "New"} Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name *</Label>
                  <Input value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} placeholder="e.g., Construction Linked" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={editingTemplate.type} onValueChange={(v: any) => setEditingTemplate({ ...editingTemplate, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction_linked">Construction Linked</SelectItem>
                      <SelectItem value="time_linked">Time Linked</SelectItem>
                      <SelectItem value="one_time">A+B Split / Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Custom Fields</Label>
                  <Button size="sm" variant="outline" onClick={() => setEditingTemplate({ ...editingTemplate, fields: [...editingTemplate.fields, { label: "", key: `field_${Date.now()}`, type: "text", defaultValue: "", required: false }] })}><Plus className="w-3 h-3 mr-1" />Add</Button>
                </div>
                {editingTemplate.fields.map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <Input placeholder="Label" value={f.label} onChange={e => { const u = [...editingTemplate.fields]; u[i] = { ...u[i], label: e.target.value }; setEditingTemplate({ ...editingTemplate, fields: u }); }} className="flex-1" />
                    <Select value={f.type} onValueChange={(v: any) => { const u = [...editingTemplate.fields]; u[i] = { ...u[i], type: v }; setEditingTemplate({ ...editingTemplate, fields: u }); }}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="textarea">Long Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => setEditingTemplate({ ...editingTemplate, fields: editingTemplate.fields.filter((_, j) => j !== i) })}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                ))}
              </div>

              {/* Installments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Installments</Label>
                  <Button size="sm" variant="outline" onClick={() => setEditingTemplate({ ...editingTemplate, installments: [...editingTemplate.installments, { title: "", percentage: "0" }] })}><Plus className="w-3 h-3 mr-1" />Add</Button>
                </div>
                {editingTemplate.installments.map((inst, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input placeholder="Title" value={inst.title} onChange={e => { const u = [...editingTemplate.installments]; u[i] = { ...u[i], title: e.target.value }; setEditingTemplate({ ...editingTemplate, installments: u }); }} className="flex-1" />
                    <Input type="number" placeholder="%" value={inst.percentage} onChange={e => { const u = [...editingTemplate.installments]; u[i] = { ...u[i], percentage: e.target.value }; setEditingTemplate({ ...editingTemplate, installments: u }); }} className="w-20" />
                    <Button variant="ghost" size="icon" onClick={() => setEditingTemplate({ ...editingTemplate, installments: editingTemplate.installments.filter((_, j) => j !== i) })}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                ))}
              </div>

              {/* One-time Costs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>One-time Costs</Label>
                  <Button size="sm" variant="outline" onClick={() => setEditingTemplate({ ...editingTemplate, oneTimeCosts: [...editingTemplate.oneTimeCosts, { name: "", rate: 0, perSqft: true }] })}><Plus className="w-3 h-3 mr-1" />Add</Button>
                </div>
                {editingTemplate.oneTimeCosts.map((c, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <Input placeholder="Name" value={c.name} onChange={e => { const u = [...editingTemplate.oneTimeCosts]; u[i] = { ...u[i], name: e.target.value }; setEditingTemplate({ ...editingTemplate, oneTimeCosts: u }); }} className="flex-1" />
                    <Input type="number" placeholder="Rate" value={c.rate || ""} onChange={e => { const u = [...editingTemplate.oneTimeCosts]; u[i] = { ...u[i], rate: parseFloat(e.target.value) || 0 }; setEditingTemplate({ ...editingTemplate, oneTimeCosts: u }); }} className="w-24" />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input type="checkbox" checked={c.perSqft} onChange={e => { const u = [...editingTemplate.oneTimeCosts]; u[i] = { ...u[i], perSqft: e.target.checked }; setEditingTemplate({ ...editingTemplate, oneTimeCosts: u }); }} />
                      Per sqft
                    </label>
                    <Button variant="ghost" size="icon" onClick={() => setEditingTemplate({ ...editingTemplate, oneTimeCosts: editingTemplate.oneTimeCosts.filter((_, j) => j !== i) })}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                ))}
              </div>

              {/* Terms */}
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea value={editingTemplate.termsAndConditions} onChange={e => setEditingTemplate({ ...editingTemplate, termsAndConditions: e.target.value })} rows={6} />
              </div>

              <Button onClick={saveTemplate} className="w-full bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-light))] text-[hsl(var(--charcoal))]">Save Template</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Create Quotation Dialog ──────────────────────────────── */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Quotation</DialogTitle>
            <DialogDescription>{selectedTemplate?.name} — {getCompanyName()}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Link to Lead (Optional)</Label>
                <Select value={linkedLeadId || "none"} onValueChange={v => setLinkedLeadId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No lead</SelectItem>
                    {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name} ({l.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate.fields.map(f => (
                <div key={f.key}>
                  <Label>{f.label} {f.required && "*"}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={fieldValues[f.key] || ""} onChange={e => setFieldValues({ ...fieldValues, [f.key]: e.target.value })} rows={2} />
                  ) : (
                    <Input type={f.type} value={fieldValues[f.key] || ""} onChange={e => setFieldValues({ ...fieldValues, [f.key]: e.target.value })} />
                  )}
                </div>
              ))}

              {/* Preview calculation */}
              {fieldValues.rate && fieldValues.area && (
                <div className="bg-accent/30 p-3 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between"><span>Base ({fieldValues.rate} × {fieldValues.area})</span><span className="font-medium">{fmt(parseFloat(fieldValues.rate) * parseFloat(fieldValues.area))}</span></div>
                  <div className="flex justify-between"><span>GST ({fieldValues.gstPercent || "12"}%)</span><span>{fmt(parseFloat(fieldValues.rate) * parseFloat(fieldValues.area) * (parseFloat(fieldValues.gstPercent || "12") / 100))}</span></div>
                  <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span className="text-[hsl(var(--gold))]">{fmtCurrency(parseFloat(fieldValues.rate) * parseFloat(fieldValues.area) * (1 + parseFloat(fieldValues.gstPercent || "12") / 100), userCountry === "india" ? "INR" : "AED")}</span></div>
                </div>
              )}

              <div>
                <Label>Validity (Days)</Label>
                <Input type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
              </div>
              <div>
                <Label>Internal Notes</Label>
                <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} />
              </div>

              <Button onClick={handleCreateQuotation} disabled={isCreating} className="w-full bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-light))] text-[hsl(var(--charcoal))]">
                {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><FileText className="w-4 h-4 mr-2" />Create Quotation</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── View Quote Dialog ────────────────────────────────────── */}
      <Dialog open={!!viewQuote} onOpenChange={() => setViewQuote(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewQuote && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Quotation {viewQuote.quote_number} {getStatusBadge(viewQuote.status)}
                </DialogTitle>
                <DialogDescription>Created {format(new Date(viewQuote.created_at), "MMMM d, yyyy")} • {getCompanyName()}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-muted-foreground text-xs">Property</Label><p className="font-medium">{viewQuote.property_name}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Type</Label><p>{viewQuote.property_type || "—"}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Location</Label><p>{viewQuote.property_location || "—"}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Amount</Label><p className="font-bold text-[hsl(var(--gold))]">{fmtCurrency(viewQuote.total_amount, viewQuote.currency)}</p></div>
                </div>
                <div className="flex gap-2 pt-3">
                  <Button variant="outline" onClick={() => generatePDF(viewQuote)}><Download className="w-4 h-4 mr-2" />Download PDF</Button>
                  {viewQuote.status === "draft" && (
                    <Button onClick={() => { handleStatusChange(viewQuote.id, "sent"); setViewQuote(null); }} className="bg-primary hover:bg-primary/90"><Send className="w-4 h-4 mr-2" />Mark Sent</Button>
                  )}
                  {viewQuote.status === "sent" && (
                    <>
                      <Button onClick={() => { handleStatusChange(viewQuote.id, "accepted"); setViewQuote(null); }} className="bg-primary hover:bg-primary/90">Accept</Button>
                      <Button onClick={() => { handleStatusChange(viewQuote.id, "rejected"); setViewQuote(null); }} variant="destructive">Reject</Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotationGenerator;
