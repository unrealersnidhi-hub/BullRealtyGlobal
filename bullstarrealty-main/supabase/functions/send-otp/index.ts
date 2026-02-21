import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

  try {
    const { action, user_id, email, otp_code } = await req.json();

    if (action === "send") {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Clean up old OTPs for this user
      await supabase
        .from("otp_verifications")
        .delete()
        .eq("user_id", user_id);

      // Store OTP
      const { error: insertError } = await supabase
        .from("otp_verifications")
        .insert({
          user_id,
          email,
          otp_code: otp,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

      if (insertError) throw insertError;

      // Send OTP via email
      const { error: emailError } = await resend.emails.send({
        from: "Bull Star Realty <noreply@bullstarrealty.ae>",
        to: [email],
        subject: `🔐 Your Login Verification Code: ${otp}`,
        html: `<!DOCTYPE html><html><head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: #000; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
            .content { padding: 30px; text-align: center; }
            .otp-code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #D4AF37; background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head><body>
          <div class="container">
            <div class="header"><h1>🔐 Verification Code</h1></div>
            <div class="content">
              <p>Use the following code to complete your login:</p>
              <div class="otp-code">${otp}</div>
              <p style="color: #666; font-size: 14px;">This code expires in <strong>5 minutes</strong>.</p>
              <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer"><p>Bull Star Realty CRM • Secure Login</p></div>
          </div>
        </body></html>`,
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        throw new Error("Failed to send OTP email");
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      // Find the OTP record
      const { data: otpRecord, error: fetchError } = await supabase
        .from("otp_verifications")
        .select("*")
        .eq("user_id", user_id)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !otpRecord) {
        return new Response(JSON.stringify({ success: false, error: "No pending verification found. Please request a new code." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (new Date(otpRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({ success: false, error: "Code has expired. Please request a new one." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check attempts (max 5)
      if (otpRecord.attempts >= 5) {
        return new Response(JSON.stringify({ success: false, error: "Too many attempts. Please request a new code." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Increment attempts
      await supabase
        .from("otp_verifications")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      // Verify code
      if (otpRecord.otp_code !== otp_code) {
        return new Response(JSON.stringify({ success: false, error: "Invalid code. Please try again." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as verified
      await supabase
        .from("otp_verifications")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OTP error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
