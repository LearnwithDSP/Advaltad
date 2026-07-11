import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id, name, email, city, field, avu_balance } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing required recipient email address.' });
    }

    const ambassadorName = name || 'ADVALTAD Ambassador';
    const baseCity = city || 'Global Community';
    const focusInterest = field || 'Social Development';
    const avuBalance = avu_balance !== undefined ? avu_balance : 1250;

    // 1. Generate Email Content using Gemini if available
    let emailHtml = '';
    let generatedWithAI = false;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
      try {
        console.log(`[API NOTIFY] Initiating Gemini email customization for ${email}...`);
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const prompt = `
You are the lead coordinator at ADVALTAD Global Fellowship, a prestigious global community.
Compose an exceptionally warm, professional, and inspiring congratulations email to a newly approved Ambassador:
Name: ${ambassadorName}
City: ${baseCity}
Focus Field/Interest: ${focusInterest}
Wallet Balance Awarded: ${avuBalance} AVU

The email must:
1. Enthusiastically congratulate them on their official approval as an ADVALTAD Global Ambassador.
2. Highlight how their background and specific focus in "${focusInterest}" will create high impact from their hub in "${baseCity}".
3. Formally inform them that their ambassador wallet is initialized with a grant of ${avuBalance} AVU (ADVALTAD Valuation Units) tokens. These are visible on their dashboard and can be utilized for launching community projects or backing active campaigns.
4. Encourage them to customize their public profile, view recent live impact stories, and participate in global action.
5. Provide a welcoming call to action and close with a signature from "The ADVALTAD Fellowship Board".

Return ONLY clean, valid, standard HTML starting with a parent <div> container. It should be styled with highly-polished inline CSS for compatibility (use professional off-white/light-grey background, charcoal typography, clear accents, elegant card layout, and ample breathing space). Do not use markdown code block tags (like \`\`\`html) or any formatting wrapper. Only return the pure HTML content.
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });

        if (response.text) {
          // Clean up the text in case the model ignored instructions and wrapped in code blocks anyway
          let cleaned = response.text.trim();
          if (cleaned.startsWith('```html')) {
            cleaned = cleaned.substring(7);
          } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.substring(3);
          }
          if (cleaned.endsWith('```')) {
            cleaned = cleaned.substring(0, cleaned.length - 3);
          }
          emailHtml = cleaned.trim();
          generatedWithAI = true;
          console.log('[API NOTIFY] Gemini email copy created successfully.');
        }
      } catch (err) {
        console.warn('[API NOTIFY] Gemini generation errored out, reverting to premium fallback layout:', err);
      }
    }

    // Static Fallback Layout if Gemini is not available or failed
    if (!emailHtml) {
      emailHtml = `
<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">ADVALTAD GLOBAL FELLOWSHIP</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Official Fellowship Credentials</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 40px 32px;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 600; line-height: 1.4;">Congratulations, ${ambassadorName}!</h2>
      <p style="font-size: 16px; line-height: 1.7; color: #334155;">We are thrilled to formally welcome you to the <strong>ADVALTAD Global Fellowship</strong>. Your credentials and application have been thoroughly reviewed and officially <strong>approved</strong> by our administrative board.</p>
      
      <!-- Highlight Box -->
      <div style="background-color: #f1f5f9; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px 12px 12px 4px; margin: 28px 0;">
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155;">
          <strong>Hub City:</strong> ${baseCity}<br>
          <strong>Focus Interest:</strong> ${focusInterest}<br>
          <strong>Wallet Credit:</strong> <span style="color: #059669; font-weight: 700;">${avuBalance} AVU</span> (ADVALTAD Valuation Units)
        </p>
      </div>

      <p style="font-size: 15px; line-height: 1.7; color: #334155;">Your strategic hub in <strong>${baseCity}</strong> will serve as a vital node in our global efforts, particularly in mobilizing resources and ideas around <strong>${focusInterest}</strong>. Your initial grant of <strong>${avuBalance} AVU</strong> is fully available in your wallet for immediate community initiatives and impact validation.</p>

      <p style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 32px;">Please log in to your account, customize your profile dashboard, explore real-time impact stories, and start activating campaigns.</p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.APP_URL || 'https://advaltad.org'}" style="background-color: #0f172a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; transition: background-color 0.2s;">Access Your Dashboard</a>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
        Warmest regards,<br>
        <strong style="color: #0f172a;">The ADVALTAD Fellowship Board</strong><br>
        <span style="font-size: 12px; color: #94a3b8;">Empowering global change.</span>
      </p>
    </div>
  </div>
</div>
`;
    }

    const emailSubject = `Welcome to the Fellowship! Your ADVALTAD Ambassador Application is Approved`;

    // 2. Deliver Email using SMTP if configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'ADVALTAD Fellowship <fellowship@advaltad.org>';

    let emailSent = false;
    let messageId = '';
    let dispatchMethod = 'console_logger';

    if (smtpHost && smtpUser && smtpPass) {
      try {
        console.log(`[API NOTIFY] Attempting SMTP delivery via ${smtpHost}:${smtpPort} to ${email}...`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const info = await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: emailSubject,
          html: emailHtml,
        });

        emailSent = true;
        messageId = info.messageId || '';
        dispatchMethod = 'smtp';
        console.log(`[API NOTIFY] SMTP transactional email dispatched successfully: ${messageId}`);
      } catch (smtpErr: any) {
        console.error('[API NOTIFY] SMTP delivery failed, falling back to local visual log:', smtpErr);
      }
    } else {
      console.log(`[API NOTIFY] SMTP variables not configured. Transactional approval email simulated successfully for ${email}.`);
      console.log('-----------------------------------------');
      console.log(`RECIPIENT: ${email} (${ambassadorName})`);
      console.log(`SUBJECT: ${emailSubject}`);
      console.log(`GEN AI CUSTOMIZED: ${generatedWithAI ? 'Yes' : 'No'}`);
      console.log('HTML CONTENT CAPTURED SUCCESSFULLY');
      console.log('-----------------------------------------');
    }

    return res.status(200).json({
      success: true,
      sent: emailSent,
      method: dispatchMethod,
      messageId: messageId,
      recipient: email,
      subject: emailSubject,
      generatedWithAI: generatedWithAI,
      emailHtml: emailHtml,
    });

  } catch (error: any) {
    console.error('[API NOTIFY] Exception in notifier handler:', error);
    return res.status(500).json({ error: error?.message || 'Internal notifier delivery error.' });
  }
}
