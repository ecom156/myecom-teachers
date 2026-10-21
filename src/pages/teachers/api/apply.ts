import type { APIRoute } from 'astro';
import { FILE_TYPES, MAX_FILE } from '../../../lib/limits';
import { isEmail, mailTo, missingSecrets, sendMail, toBase64, verifyTurnstile } from '../../../lib/mail';

export const prerender = false;

const FORM = '/teachers/form/';
const THANKS = '/teachers/form/thank-you/';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const field = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max);
  const d = {
    firstName: field('first_name', 100),
    lastName: field('last_name', 100),
    email: field('email', 200),
    nationality: field('nationality', 100),
    residence: field('residence', 200),
    cover: field('cover', 5000),
    method: field('method', 20),
    business: field('business', 5000),
    education: field('education', 5000),
    languages: field('languages', 3000),
    others: field('others', 5000),
  };
  const upload = form.get('resume');
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  const online = d.method !== 'upload';

  // ボット対策のダミー欄に入力があれば、成功したふりをして捨てる
  if (field('website', 200)) return redirect(THANKS, 303);
  // 失敗理由は ?error= に短いコードで返す（v: 入力, f: ファイル, c: 設定不足, t: Turnstile, m: メール送信）
  const valid =
    d.firstName && d.lastName && isEmail(d.email) && d.nationality && d.residence && form.get('agree') &&
    (online ? d.business && d.education : file);
  if (!valid) return redirect(`${FORM}?error=v`, 303);
  if (file) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (file.size > MAX_FILE || !FILE_TYPES.includes(ext)) return redirect(`${FORM}?error=f`, 303);
  }
  if (missingSecrets()) return redirect(`${FORM}?error=c`, 303);
  if (!(await verifyTurnstile(field('cf-turnstile-response', 4096), request.headers.get('CF-Connecting-IP') ?? ''))) {
    return redirect(`${FORM}?error=t`, 303);
  }

  const name = `${d.firstName} ${d.lastName}`;
  const section = (label: string, v: string) => `■ ${label}\n${v || '-'}\n`;
  const text = [
    `Name: ${name}`,
    `Email: ${d.email}`,
    `Nationality: ${d.nationality}`,
    `Place of residence: ${d.residence}`,
    `Method: ${online ? 'Fill out the form online' : 'Upload resume file'}`,
    `Resume file: ${file ? `${file.name} (${Math.ceil(file.size / 1024)} KB, attached)` : '-'}`,
    '',
    section('Cover page', d.cover),
    section('Business experiences', d.business),
    section('Education history', d.education),
    section('Language skills', d.languages),
    section('Others', d.others),
  ].join('\n');

  try {
    await sendMail({
      to: [mailTo()],
      replyTo: d.email,
      subject: `[Teacher application] ${name} (${d.nationality})`,
      text,
      attachments: file ? [{ filename: file.name, content: await toBase64(file) }] : undefined,
    });
  } catch (e) {
    console.error('apply: mail failed', e);
    return redirect(`${FORM}?error=m`, 303);
  }

  // 応募者への自動返信。失敗しても応募自体は受け付け済みなので、ログだけ残す
  try {
    await sendMail({
      to: [d.email],
      replyTo: mailTo(),
      subject: 'Thank you for your application to ECOM',
      text: `Dear ${name},

Thank you for applying for a teaching position at ECOM.
We have received your application.

Please note that we only contact teachers who have passed our screening, within one week after submitting the application.
We receive many applications every week and are unable to respond to all of them.

Best regards,
ECOM Recruitment Team
Ecommunication, Inc.
https://www.myecom.net/teachers/
`,
    });
  } catch (e) {
    console.error('apply: auto-reply failed', e);
  }
  return redirect(THANKS, 303);
};
