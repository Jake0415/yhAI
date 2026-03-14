#!/usr/bin/env node
/**
 * YHAI 이메일 전송 스크립트
 * Usage: node scripts/send-email.js --subject "제목" --body "<html>본문</html>"
 *        node scripts/send-email.js --subject "제목" --body-file path/to/body.html
 */

const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// .env 파일 수동 파싱 (dotenv 의존성 없이)
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env file not found at", envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--subject" && args[i + 1]) {
      result.subject = args[++i];
    } else if (args[i] === "--body" && args[i + 1]) {
      result.body = args[++i];
    } else if (args[i] === "--body-file" && args[i + 1]) {
      result.bodyFile = args[++i];
    } else if (args[i] === "--to" && args[i + 1]) {
      result.to = args[++i];
    } else if (args[i] === "--attach" && args[i + 1]) {
      if (!result.attachments) result.attachments = [];
      result.attachments.push(args[++i]);
    }
  }
  return result;
}

async function main() {
  loadEnv();
  const args = parseArgs();

  if (!args.subject) {
    console.error("Error: --subject is required");
    process.exit(1);
  }

  let htmlBody;
  if (args.bodyFile) {
    const filePath = path.resolve(args.bodyFile);
    if (!fs.existsSync(filePath)) {
      console.error("Error: body file not found:", filePath);
      process.exit(1);
    }
    htmlBody = fs.readFileSync(filePath, "utf-8");
  } else if (args.body) {
    htmlBody = args.body;
  } else {
    console.error("Error: --body or --body-file is required");
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const to = args.to || process.env.EMAIL_TO;
  const mailOptions = {
    from: `"YHAI 기획팀" <${process.env.SMTP_USER}>`,
    to,
    subject: args.subject,
    html: htmlBody,
  };

  if (args.attachments && args.attachments.length > 0) {
    mailOptions.attachments = args.attachments.map((filePath) => {
      const resolved = path.resolve(filePath);
      return { filename: path.basename(resolved), path: resolved };
    });
  }

  const info = await transporter.sendMail(mailOptions);

  console.log(`Email sent successfully! Message ID: ${info.messageId}`);
}

main().catch((err) => {
  console.error("Failed to send email:", err.message);
  process.exit(1);
});
