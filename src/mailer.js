const nodemailer = require('nodemailer');

// Configure via .env — works with Gmail, Brevo, Resend SMTP, etc.
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send notification to the restaurant when a new reservation arrives.
 */
async function notifyNewReservation(reservation) {
  if (!process.env.SMTP_USER || !process.env.NOTIFY_EMAIL) {
    console.log('📧  Email not configured — skipping notification');
    return;
  }

  const { nombre, telefono, fecha, hora, personas, ocasion, notas } = reservation;

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#1a1a1a;color:#e8dcc8;padding:32px;border-radius:8px">
      <h2 style="font-family:serif;color:#c9a84c;border-bottom:1px solid #333;padding-bottom:12px">
        🍽️ Nueva Reserva — La Reseña
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;color:#999;width:140px">Cliente</td>   <td style="padding:8px 0"><strong>${nombre}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#999">Teléfono</td>  <td style="padding:8px 0"><a href="tel:${telefono}" style="color:#c9a84c">${telefono}</a></td></tr>
        <tr><td style="padding:8px 0;color:#999">Fecha</td>     <td style="padding:8px 0">${fecha}</td></tr>
        <tr><td style="padding:8px 0;color:#999">Hora</td>      <td style="padding:8px 0">${hora}</td></tr>
        <tr><td style="padding:8px 0;color:#999">Personas</td>  <td style="padding:8px 0">${personas}</td></tr>
        <tr><td style="padding:8px 0;color:#999">Ocasión</td>   <td style="padding:8px 0">${ocasion || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#999">Notas</td>     <td style="padding:8px 0">${notas || '—'}</td></tr>
      </table>
      <p style="margin-top:24px;font-size:13px;color:#666">
        Gestiona esta reserva desde el <a href="${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}/admin.html" style="color:#c9a84c">panel de administración</a>.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from:    `"La Reseña" <${process.env.SMTP_USER}>`,
    to:      process.env.NOTIFY_EMAIL,
    subject: `Nueva reserva: ${nombre} — ${fecha} ${hora}`,
    html,
  });

  console.log(`📧  Email enviado para reserva de ${nombre}`);
}

module.exports = { notifyNewReservation };
