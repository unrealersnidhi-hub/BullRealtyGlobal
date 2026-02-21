import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Play, CheckCircle, XCircle } from "lucide-react";

interface TestIntegrationButtonProps {
  type: "api_key" | "webhook";
  identifier: string; // API key or webhook token
  webhookUrl?: string; // Full webhook URL for webhooks
  onTestComplete?: () => void;
}

interface TestResult {
  success: boolean;
  message: string;
  leadId?: string;
  error?: string;
}

export function TestIntegrationButton({
  type,
  identifier,
  webhookUrl,
  onTestComplete,
}: TestIntegrationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testData, setTestData] = useState({
    full_name: "Test Lead",
    email: `test-${Date.now()}@example.com`,
    phone: "+971501234567",
    interest: "2BHK in Dubai Marina",
    message: "This is a test lead from the integration panel.",
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const runTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      let url: string;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (type === "api_key") {
        url = `${supabaseUrl}/functions/v1/lead-webhook`;
        headers["x-api-key"] = identifier;
      } else {
        url = webhookUrl || `${supabaseUrl}/functions/v1/lead-webhook/${identifier}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(testData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestResult({
          success: true,
          message: "Test lead created successfully!",
          leadId: result.lead_id,
        });
        toast.success("Integration test passed! Lead created successfully.");
        onTestComplete?.();
      } else {
        setTestResult({
          success: false,
          message: "Test failed",
          error: result.error || "Unknown error",
        });
        toast.error(`Test failed: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Network error";
      setTestResult({
        success: false,
        message: "Test failed",
        error: errorMessage,
      });
      toast.error(`Test failed: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Play className="w-3 h-3" />
          Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-gold" />
            Test {type === "api_key" ? "API Key" : "Webhook"}
          </DialogTitle>
          <DialogDescription>
            Send a test lead to verify your integration is working correctly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Name</Label>
              <Input
                value={testData.full_name}
                onChange={(e) => setTestData({ ...testData, full_name: e.target.value })}
                placeholder="Test Lead"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Phone</Label>
              <Input
                value={testData.phone}
                onChange={(e) => setTestData({ ...testData, phone: e.target.value })}
                placeholder="+971501234567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Email</Label>
            <Input
              value={testData.email}
              onChange={(e) => setTestData({ ...testData, email: e.target.value })}
              placeholder="test@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Interest</Label>
            <Input
              value={testData.interest}
              onChange={(e) => setTestData({ ...testData, interest: e.target.value })}
              placeholder="Property interest"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Message</Label>
            <Textarea
              value={testData.message}
              onChange={(e) => setTestData({ ...testData, message: e.target.value })}
              placeholder="Test message..."
              rows={2}
            />
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-lg border ${
                testResult.success
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${testResult.success ? "text-green-700" : "text-red-700"}`}>
                    {testResult.message}
                  </p>
                  {testResult.leadId && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Lead ID: <code className="bg-background px-1 rounded">{testResult.leadId}</code>
                    </p>
                  )}
                  {testResult.error && (
                    <p className="text-sm text-red-600 mt-1">{testResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={runTest} disabled={isTesting}>
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
