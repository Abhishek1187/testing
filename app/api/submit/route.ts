import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export async function POST(req: Request) {
  try {
    const { name, email, phone, company, requirement } = await req.json();

    // ── Step 1: AI Categorization (optional — gracefully degrades) ────────────
    let category = 'General';
    let priority = 'Medium';
    try {
      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a lead classification assistant. Classify the following business requirement into a category and priority. Return ONLY valid JSON in this exact format: {"category": "string", "priority": "High" | "Medium" | "Low"}`,
          },
          {
            role: 'user',
            content: `Requirement: "${requirement}"`,
          },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(aiResponse.choices[0].message.content || '{}');
      category = parsed.category || category;
      priority = parsed.priority || priority;
    } catch (aiErr: unknown) {
      const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      console.warn('[AI] Categorization skipped:', msg.slice(0, 120));
    }

    // ── Step 2: Insert lead into Supabase ─────────────────────────────────────
    const { data, error: dbError } = await supabase
      .from('leads')
      .insert([{
        name, email, phone, company, requirement,
        category, priority,
        email_sent: false, // will update to true if email succeeds
      }])
      .select()
      .single();

    if (dbError) {
      console.error('[DB] Insert error:', dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const leadId = data.id;

    // ── Step 3: Send tracked email via Resend (optional — gracefully degrades) ─
    let emailSent = false;
    let emailError = '';
    try {
      const trackingPixelUrl = `${BASE_URL}/api/track/open?id=${leadId}`;
      const targetLink = 'https://yourwebsite.com/offer';
      const clickTrackingUrl = `${BASE_URL}/api/track/click?id=${leadId}&redirect=${encodeURIComponent(targetLink)}`;

      const sendResult = await resend.emails.send({
        from: 'Lead Manager <onboarding@resend.dev>',
        to: [email],
        subject: `Hi ${name}, we received your request!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Request Received ✓</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">We'll be in touch soon</p>
              </div>
              <div style="padding: 40px 32px;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">Hi <strong>${name}</strong>,</p>
                <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                  Thank you for reaching out! We've received your inquiry and our team will review it shortly.
                </p>
                <div style="background: #f3f4f6; border-left: 4px solid #667eea; border-radius: 8px; padding: 20px 24px; margin: 0 0 32px;">
                  <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; font-weight: 600;">Your Requirement</p>
                  <p style="color: #1f2937; font-size: 15px; margin: 0; line-height: 1.6;">${requirement}</p>
                </div>
                <div style="text-align: center; margin: 0 0 32px;">
                  <a href="${clickTrackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: 0.02em;">
                    View Our Offer →
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
                  Regards,<br><strong style="color: #374151;">Lead Manager Team</strong>
                </p>
              </div>
            </div>
            <img src="${trackingPixelUrl}" width="1" height="1" alt="" style="position:absolute;left:-9999px;opacity:0;"/>
          </body>
          </html>
        `,
      });

      // Resend returns { data, error } — check for error object
      if (sendResult.error) {
        emailError = sendResult.error.message;
        console.warn('[Email] Resend error:', emailError);
      } else {
        emailSent = true;
      }
    } catch (emailErr: unknown) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      emailError = msg;
      console.warn('[Email] Send failed:', msg.slice(0, 200));
    }

    // ── Step 4: Update email_sent status in DB ────────────────────────────────
    if (emailSent) {
      await supabase.from('leads').update({ email_sent: true }).eq('id', leadId);
    }

    // ── Always return success for the lead save itself ─────────────────────────
    return NextResponse.json({
      success: true,
      leadId,
      category,
      priority,
      emailSent,
      ...(emailError && { emailWarning: emailError }),
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Submit] Unexpected error:', msg);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
