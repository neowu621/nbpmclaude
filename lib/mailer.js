const nodemailer = require('nodemailer');

let transporter = null;
function gmailTransport() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      // 應用程式密碼可含空格，一律去除
      pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
    }
  });
  return transporter;
}

// 寄信優先順序：Gmail SMTP → Resend → 印在 log（本機測試）
async function sendMail({ to, subject, html }) {
  const from = process.env.MAIL_FROM || process.env.GMAIL_USER || 'noreply@example.com';

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    await gmailTransport().sendMail({ from, to, subject, html });
    return { sent: 'gmail' };
  }

  if (process.env.RESEND_API_KEY) {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html })
    });
    if (!resp.ok) throw new Error('寄信失敗: ' + (await resp.text()));
    return { sent: 'resend' };
  }

  console.log('──[ 未設定寄信服務，僅印出信件內容 ]──');
  console.log('收件人:', to, '| 主旨:', subject);
  console.log('內容  :', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  console.log('────────────────────────────────────────');
  return { sent: 'log' };
}

module.exports = { sendMail };
