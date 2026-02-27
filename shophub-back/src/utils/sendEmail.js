async function sendEmail(to, subject, text) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    console.warn("[mail] SMTP env not configured. Email skipped.");
    return;
  }

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (err) {
    console.warn("[mail] nodemailer not installed. Run `npm i nodemailer` in shophub-back.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
}

module.exports = sendEmail;