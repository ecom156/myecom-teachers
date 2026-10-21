import { env } from 'cloudflare:workers';

// 必要な設定（Cloudflare の Worker の「変数とシークレット」）
//   TURNSTILE_SECRET_KEY … Turnstile のシークレットキー
//   RESEND_API_KEY       … Resend の API キー（ecominc.co.jp を送信ドメインとして認証済みのもの）
//   MAIL_TO              … 受信先（省略時 rec@ecominc.co.jp）
export const vars = env as unknown as Record<string, string | undefined>;

export const FROM = 'ECOM Teachers Recruitment <noreply@ecominc.co.jp>';
export const mailTo = () => vars.MAIL_TO ?? 'rec@ecominc.co.jp';
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function missingSecrets() {
  if (vars.TURNSTILE_SECRET_KEY && vars.RESEND_API_KEY) return false;
  console.error('form: missing secret', { turnstile: !!vars.TURNSTILE_SECRET_KEY, resend: !!vars.RESEND_API_KEY });
  return true;
}

export async function verifyTurnstile(token: string, ip: string) {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: vars.TURNSTILE_SECRET_KEY ?? '', response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!data.success) console.error('form: turnstile rejected', data['error-codes']);
    return data.success;
  } catch (e) {
    console.error('form: turnstile failed', e);
    return false;
  }
}

export type Attachment = { filename: string; content: string };

export async function sendMail(mail: { to: string[]; subject: string; text: string; replyTo?: string; attachments?: Attachment[] }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${vars.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: mail.to,
      reply_to: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
      attachments: mail.attachments,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

export async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
