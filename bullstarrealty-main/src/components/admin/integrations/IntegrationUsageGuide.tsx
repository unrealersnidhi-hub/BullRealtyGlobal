import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Code, Terminal, FileCode } from "lucide-react";

interface IntegrationUsageGuideProps {
  type: "api_key" | "webhook";
  identifier: string; // API key or webhook token
  name: string;
}

export function IntegrationUsageGuide({ type, identifier, name }: IntegrationUsageGuideProps) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const baseUrl = `${supabaseUrl}/functions/v1/lead-webhook`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getApiKeyCode = () => ({
    curl: `curl -X POST "${baseUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${identifier}" \\
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+971501234567",
    "interest": "2BHK in Dubai Marina",
    "message": "Looking for properties"
  }'`,
    javascript: `const response = await fetch("${baseUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${identifier}"
  },
  body: JSON.stringify({
    full_name: formData.name,
    email: formData.email,
    phone: formData.phone,
    interest: formData.interest,
    message: formData.message
  })
});

const result = await response.json();
if (result.success) {
  console.log("Lead created:", result.lead_id);
}`,
    php: `<?php
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "${baseUrl}",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "x-api-key: ${identifier}"
  ],
  CURLOPT_POSTFIELDS => json_encode([
    "full_name" => $_POST["name"],
    "email" => $_POST["email"],
    "phone" => $_POST["phone"],
    "interest" => $_POST["interest"],
    "message" => $_POST["message"]
  ])
]);

$response = curl_exec($curl);
$result = json_decode($response, true);
curl_close($curl);

if ($result["success"]) {
  echo "Lead created: " . $result["lead_id"];
}
?>`,
    python: `import requests

response = requests.post(
    "${baseUrl}",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "${identifier}"
    },
    json={
        "full_name": "John Doe",
        "email": "john@example.com",
        "phone": "+971501234567",
        "interest": "2BHK in Dubai Marina",
        "message": "Looking for properties"
    }
)

result = response.json()
if result.get("success"):
    print(f"Lead created: {result['lead_id']}")`,
  });

  const getWebhookCode = () => ({
    curl: `curl -X POST "${baseUrl}/${identifier}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+971501234567",
    "interest": "2BHK in Dubai Marina",
    "message": "Looking for properties"
  }'`,
    javascript: `const WEBHOOK_URL = "${baseUrl}/${identifier}";

const response = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    full_name: formData.name,
    email: formData.email,
    phone: formData.phone,
    interest: formData.interest,
    message: formData.message
  })
});

const result = await response.json();
if (result.success) {
  console.log("Lead captured:", result.lead_id);
}`,
    php: `<?php
$webhook_url = "${baseUrl}/${identifier}";

$data = [
    "full_name" => $_POST["name"],
    "email" => $_POST["email"],
    "phone" => $_POST["phone"],
    "interest" => $_POST["interest"],
    "message" => $_POST["message"]
];

$options = [
    "http" => [
        "method" => "POST",
        "header" => "Content-Type: application/json",
        "content" => json_encode($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($webhook_url, false, $context);
$response = json_decode($result, true);

if ($response["success"]) {
    echo "Lead captured: " . $response["lead_id"];
}
?>`,
    python: `import requests

WEBHOOK_URL = "${baseUrl}/${identifier}"

response = requests.post(
    WEBHOOK_URL,
    json={
        "full_name": "John Doe",
        "email": "john@example.com",
        "phone": "+971501234567",
        "interest": "2BHK in Dubai Marina",
        "message": "Looking for properties"
    }
)

result = response.json()
if result.get("success"):
    print(f"Lead captured: {result['lead_id']}")`,
  });

  const codeExamples = type === "api_key" ? getApiKeyCode() : getWebhookCode();

  return (
    <Card className="border-gold/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Code className="w-4 h-4 text-gold" />
          How to Use: {name}
        </CardTitle>
        <CardDescription>
          Copy these code snippets to integrate with your application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Endpoint Info */}
        <div className="bg-muted rounded-lg p-3 space-y-2">
          <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
          <div className="flex items-center gap-2">
            <code className="text-xs flex-1 break-all font-mono">
              {type === "api_key" ? baseUrl : `${baseUrl}/${identifier}`}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() =>
                copyToClipboard(
                  type === "api_key" ? baseUrl : `${baseUrl}/${identifier}`,
                  "URL"
                )
              }
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          {type === "api_key" && (
            <>
              <Label className="text-xs text-muted-foreground mt-2">API Key (add to header)</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs flex-1 break-all font-mono bg-background px-2 py-1 rounded">
                  x-api-key: {identifier}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => copyToClipboard(identifier, "API Key")}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Code Examples */}
        <Tabs defaultValue="curl" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="curl" className="text-xs gap-1">
              <Terminal className="w-3 h-3" />
              cURL
            </TabsTrigger>
            <TabsTrigger value="javascript" className="text-xs gap-1">
              <FileCode className="w-3 h-3" />
              JavaScript
            </TabsTrigger>
            <TabsTrigger value="php" className="text-xs gap-1">
              <FileCode className="w-3 h-3" />
              PHP
            </TabsTrigger>
            <TabsTrigger value="python" className="text-xs gap-1">
              <FileCode className="w-3 h-3" />
              Python
            </TabsTrigger>
          </TabsList>

          {Object.entries(codeExamples).map(([lang, code]) => (
            <TabsContent key={lang} value={lang} className="mt-3">
              <div className="relative">
                <pre className="bg-background border rounded-lg p-4 text-xs overflow-x-auto max-h-64">
                  {code}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(code, `${lang.toUpperCase()} code`)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Field Mapping */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="field-mapping" className="border-none">
            <AccordionTrigger className="text-sm py-2">Field Mapping Reference</AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Your Field</TableHead>
                    <TableHead className="text-xs">Accepted Names</TableHead>
                    <TableHead className="text-xs">Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs">Name</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">full_name</code>,{" "}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">name</code>,{" "}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">fullName</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-[10px]">Required</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Email</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">email</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-[10px]">Required</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Phone</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">phone</code>,{" "}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">mobile</code>,{" "}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">contact</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Interest</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">interest</code>,{" "}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">property_type</code>,{" "}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">propertyType</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Message</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">message</code>,{" "}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">comments</code>,{" "}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">notes</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
