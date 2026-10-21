import type { APIRoute } from 'astro';
import { isEmail, mailTo, missingSecrets, sendMail, verifyTurnstile } from '../../../lib/mail';

export const prerender = false;

const FORM = '/teachers/contact-form/';
const THANKS = '/teachers/contact-form/thanks/';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const field = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max);
  const name = field('name', 100);
  const company = field('company', 200);
  const email = field('email', 200);
  const message = field('message', 5000);

  if (field('website', 200)) return redirect(THANKS, 303);
  if (!name || !isEmail(email) || !message) return redirect(`${FORM}?error=v`, 303);
  if (missingSecrets()) return redirect(`${FORM}?error=c`, 303);
  if (!(await verifyTurnstile(field('cf-turnstile-response', 4096), request.headers.get('CF-Connecting-IP') ?? ''))) {
    return redirect(`${FORM}?error=t`, 303);
  }
  try {
    await sendMail({
      to: [mailTo()],
      replyTo: email,
      subject: `[Teachers site contact] ${name}`,
      text: `Name: ${name}\nCompany: ${company || '-'}\nEmail: ${email}\n\n${message}\n`,
    });
  } catch (e) {
    console.error('contact: mail failed', e);
    return redirect(`${FORM}?error=m`, 303);
  }
  return redirect(THANKS, 303);
};
