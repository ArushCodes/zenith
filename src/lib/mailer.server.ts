import nodemailer from "nodemailer";

interface SendOtpOptions {
  to: string;
  otp: string;
  fullName?: string;
  purpose?: "signup" | "reset";
}

export async function sendOtpEmail({
  to,
  otp,
  fullName,
  purpose = "signup",
}: SendOtpOptions): Promise<{ success: boolean; provider: string; error?: string }> {
  const formattedOtp = otp.length === 8 ? `${otp.slice(0, 4)} ${otp.slice(4)}` : otp;
  const greeting = fullName ? `Hi ${fullName.split(" ")[0]},` : "Hi student,";

  const isReset = purpose === "reset";
  const actionLabel = isReset ? "password reset" : "verification";
  const subject = `Your Zenith ${actionLabel} code: ${otp}`;
  const textBody = isReset
    ? `${greeting}\n\nYour Zenith password reset code is: ${otp}\n\nEnter this code on the Zenith screen to set your new password.\nThis code will expire in 15 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.\n\n— Zenith (TAPMI Manipal)`
    : `${greeting}\n\nYour Zenith verification code is: ${otp}\n\nEnter this code on the Zenith sign-up screen to verify your email address.\nThis code will expire in 15 minutes.\n\nIf you did not request this verification, you can safely ignore this email.\n\n— Zenith (TAPMI Manipal)`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 30px 15px; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <tr>
      <td style="padding: 28px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-bottom: 1px solid #334155;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px;">
          Zenith <span style="font-size: 13px; font-weight: 400; color: #94a3b8; margin-left: 6px;">TAPMI Manipal</span>
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #e2e8f0;">
          ${greeting}
        </p>
        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
          Please use the following verification code to confirm your <strong style="color: #cbd5e1;">@learner.manipal.edu</strong> account on Zenith:
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #0f172a; border: 2px solid #0284c7; border-radius: 12px; padding: 16px 28px; box-shadow: 0 0 20px rgba(2, 132, 199, 0.25);">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 30px; font-weight: 800; letter-spacing: 6px; color: #38bdf8;">
              ${formattedOtp}
            </span>
          </div>
        </div>

        <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: #64748b; text-align: center;">
          This code expires in <strong>15 minutes</strong>.<br>
          If you did not request an account on Zenith, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px; background-color: #0c1222; border-top: 1px solid #1e293b; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #475569;">
          Zenith &bull; Academic &amp; Batch Portal &bull; TAPMI Manipal
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const mailDriver = process.env["MAIL_DRIVER"] || (process.env["SMTP_HOST"] ? "smtp" : "resend");

  // 1. If SMTP driver selected or available first (Google SMTP bypasses Microsoft Defender new-domain quarantine)
  if (mailDriver === "smtp" && process.env["SMTP_HOST"]) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env["SMTP_HOST"],
        port: Number(process.env["SMTP_PORT"] || 587),
        secure: Number(process.env["SMTP_PORT"]) === 465,
        auth: {
          user: process.env["SMTP_USER"],
          pass: process.env["SMTP_PASS"]?.replace(/\s+/g, ""),
        },
      });

      await transporter.sendMail({
        from: process.env["SMTP_FROM"] || `"Zenith" <${process.env["SMTP_USER"]}>`,
        to,
        subject,
        text: textBody,
        html: htmlBody,
      });

      return { success: true, provider: "smtp" };
    } catch (err: any) {
      console.error("[Mailer SMTP Failed]", err);
    }
  }

  // 2. Try Resend if configured or requested
  const resendApiKey = process.env["RESEND_API_KEY"];
  if (resendApiKey) {
    try {
      const fromEmail = process.env["EMAIL_FROM"] || "Zenith <noreply@zenithfor.me>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });

      const resData = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) {
        console.error("[Mailer Resend Error]", resData);
        throw new Error(resData.message || "Failed to send email via Resend");
      }
      return { success: true, provider: "resend" };
    } catch (err: any) {
      console.error("[Mailer Resend Failed]", err);
    }
  }

  // 3. Fallback to SMTP if Resend wasn't chosen or failed
  if (process.env["SMTP_HOST"]) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env["SMTP_HOST"],
        port: Number(process.env["SMTP_PORT"] || 587),
        secure: Number(process.env["SMTP_PORT"]) === 465,
        auth: {
          user: process.env["SMTP_USER"],
          pass: process.env["SMTP_PASS"]?.replace(/\s+/g, ""),
        },
      });

      await transporter.sendMail({
        from: process.env["SMTP_FROM"] || `"Zenith" <${process.env["SMTP_USER"]}>`,
        to,
        subject,
        text: textBody,
        html: htmlBody,
      });

      return { success: true, provider: "smtp" };
    } catch (err: any) {
      console.error("[Mailer Fallback SMTP Failed]", err);
    }
  }

  // 3. Fallback: Log to server console so registration is never blocked while setting up mail credentials
  console.log("==================================================");
  console.log(`[ZENITH OTP DISPATCH] To: ${to}`);
  console.log(`[ZENITH OTP DISPATCH] Code: ${otp}`);
  console.log("==================================================");

  return {
    success: true,
    provider: "console",
  };
}
