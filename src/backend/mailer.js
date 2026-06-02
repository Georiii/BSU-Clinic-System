const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return null;
    }

    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = port === 465; // true only for port 465, NEVER for 587

    transporter = nodemailer.createTransport({
        host,
        port,
        secure,           // false for 587 (STARTTLS), true for 465 (SSL)
        requireTLS: true, // forces STARTTLS upgrade on port 587
        tls: {
            rejectUnauthorized: false // helps avoid cert issues on local/Windows
        },
        family: 4,        // force IPv4 — fixes the 64:ff9b:: IPv6 tunnel error
        auth: { user, pass }
    });

    return transporter;
}

function maskEmail(email) {
    if (!email || !email.includes('@')) return 'your personal email';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `***@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

async function sendPasswordResetCode(to, code, fullname) {
    const transport = getTransporter();
    if (!transport) {
        throw new Error('Email service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.');
    }

    const displayName = fullname || 'Admin';
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transport.sendMail({
        from: `"BSU Health Services" <${from}>`,
        to,
        subject: 'BSU Health Services - Password Reset Verification Code',
        text: [
            `Hello ${displayName},`,
            '',
            `Your password reset verification code is: ${code}`,
            '',
            'Enter this 6-digit code on the forgot password page to continue.',
            'If you did not request a password reset, you can ignore this email.',
            '',
            '— BSU Health Services Admin Portal'
        ].join('\n'),
        html: `
            <div style="font-family:Segoe UI,Tahoma,sans-serif;max-width:520px;color:#111;">
                <h2 style="color:#50C878;">BSU Health Services</h2>
                <p>Hello <strong>${displayName}</strong>,</p>
                <p>Your password reset verification code is:</p>
                <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#111;">${code}</p>
                <p>Enter this code on the forgot password page to continue.</p>
                <p style="color:#666;font-size:13px;">If you did not request a password reset, you can ignore this email.</p>
            </div>
        `
    });
}

module.exports = { sendPasswordResetCode, maskEmail, getTransporter };
