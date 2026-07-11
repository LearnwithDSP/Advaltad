import { DbAmbassador } from "./supabase";

export interface SentEmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
  sentAt: string;
  status: "sent" | "logged" | "failed";
  method: string;
  generatedWithAI: boolean;
}

const EMAILS_LOG_LOCAL_STORAGE_KEY = "advaltad_sent_emails";

export async function getSentEmails(): Promise<SentEmailLog[]> {
  try {
    const data = localStorage.getItem(EMAILS_LOG_LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn("getSentEmails error:", err);
    return [];
  }
}

export async function triggerApprovalEmail(ambassador: DbAmbassador): Promise<{
  success: boolean;
  sent: boolean;
  method: string;
  email?: SentEmailLog;
  error?: string;
}> {
  try {
    const payload = {
      id: ambassador.id,
      name: ambassador.professional_name || ambassador.name || "ADVALTAD Ambassador",
      email: ambassador.email,
      city: ambassador.base_city || ambassador.city || "Global Community",
      field: ambassador.focus_interest || ambassador.field || "Social Impact",
      avu_balance: ambassador.avu_balance || 1250,
    };

    console.log(`[EMAIL SERVICE] Triggering approval email notification for ${payload.email}...`);

    let result: any = { success: false, sent: false, method: "local_mock" };

    // Try to trigger the serverless API route
    try {
      const response = await fetch("/api/notify-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        result = await response.json();
      } else {
        const errText = await response.text();
        console.warn(`[EMAIL SERVICE] API response failed: ${response.status} - ${errText}`);
      }
    } catch (apiErr) {
      console.warn("[EMAIL SERVICE] API request failed (might be running client-side only dev):", apiErr);
    }

    // Capture or fallback to local visual simulation
    let emailLog: SentEmailLog;

    if (result.success) {
      emailLog = {
        id: "EML-" + Math.floor(Math.random() * 89999 + 10000),
        recipientEmail: payload.email,
        recipientName: payload.name,
        subject: result.subject || "Welcome to the Fellowship! Your ADVALTAD Ambassador Application is Approved",
        bodyHtml: result.emailHtml,
        sentAt: new Date().toISOString(),
        status: result.sent ? "sent" : "logged",
        method: result.method || "server_console",
        generatedWithAI: !!result.generatedWithAI,
      };
    } else {
      // Complete client-side local fallback generation
      const mockBody = `
        <div style="font-family: sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; padding: 32px;">
            <h1 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">ADVALTAD Fellowship Portal</h1>
            <h2>Congratulations, ${payload.name}!</h2>
            <p>Your fellowship credentials have been successfully approved by the administrator panel.</p>
            <p><strong>City Hub:</strong> ${payload.city}<br><strong>Impact Sector:</strong> ${payload.field}</p>
            <p>Your ambassador wallet is credited with <strong>${payload.avu_balance} AVU</strong> for local community launches.</p>
            <p>Warmest regards,<br><strong>The ADVALTAD Fellowship Team</strong></p>
          </div>
        </div>
      `;

      emailLog = {
        id: "EML-" + Math.floor(Math.random() * 89999 + 10000),
        recipientEmail: payload.email,
        recipientName: payload.name,
        subject: "Welcome to the Fellowship! Your ADVALTAD Ambassador Application is Approved (Local Sim)",
        bodyHtml: mockBody,
        sentAt: new Date().toISOString(),
        status: "logged",
        method: "client_local",
        generatedWithAI: false,
      };
    }

    // Persist to local log list
    const logList = await getSentEmails();
    logList.unshift(emailLog); // Add to top
    localStorage.setItem(EMAILS_LOG_LOCAL_STORAGE_KEY, JSON.stringify(logList));

    return {
      success: true,
      sent: emailLog.status === "sent",
      method: emailLog.method,
      email: emailLog,
    };
  } catch (err: any) {
    console.error("[EMAIL SERVICE] triggerApprovalEmail exception:", err);
    return {
      success: false,
      sent: false,
      method: "failed",
      error: err?.message || "Unknown mailer trigger error",
    };
  }
}
