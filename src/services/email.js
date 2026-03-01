/**
 * services/email.js
 * Nodemailer wrapper — sends notification emails for new reservations.
 *
 * Configure SMTP settings in your .env file.
 * For Gmail, generate an App Password at:
 *   https://myaccount.google.com/apppasswords
 */

const nodemailer = require('nodemailer');

// Create reusable transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email to the restaurant when a new reservation is submitted.
 * @param {Object} reservation - The newly created reservation row
 */
async function sendNewReservationNotification(reservation) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email not configured — skipping notification email.');
    return;
  }

  const subject = `Nueva Reserva — ${reservation.nombre} · ${reservation.fecha} ${reservation.hora}`;

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e8e0d0; padding: 32px; border-radius: 8px;">
      <h1 style="font-family: 'Cinzel', Georgia, serif; color: #c9a96e; border-bottom: 1px solid #333; padding-bottom: 16px; margin-top: 0;">
        La Reseña · Nueva Reserva
      </h1>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #888; width: 140px; vertical-align: top;">Cliente</td>
          <td style="padding: 10px 0; font-weight: bold;">${reservation.nombre}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #888; vertical-align: top;">Teléfono</td>
          <td style="padding: 10px 0;">
            <a href="tel:${reservation.telefono}" style="color: #c9a96e;">${reservation.telefono}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #888; vertical-align: top;">Fecha</td>
          <td style="padding: 10px 0;">${reservation.fecha}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #888; vertical-align: top;">Hora</td>
          <td style="padding: 10px 0;">${reservation.hora}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #888; vertical-align: top;">Personas</td>
          <td style="padding: 10px 0;">${reservation.personas}</td>
        </tr>
        ${reservation.ocasion ? `
        <tr>
          <td style="padding: 10px 0; color: #888; vertical-align: top;">Ocasión</td>
          <td style="padding: 10px 0;">${reservation.ocasion}</td>
        </tr>` : ''}
        ${reservation.notas ? `
        <tr>
          <td style="padding: 10px 0; color: #888; vertical-align: top;">Notas</td>
          <td style="padding: 10px 0; font-style: italic;">${reservation.notas}</td>
        </tr>` : ''}
      </table>

      <div style="margin-top: 24px; padding: 16px; background: #252525; border-radius: 6px; border-left: 3px solid #c9a96e;">
        <p style="margin: 0; font-size: 14px;">
          Accede al panel de administración para confirmar o cancelar esta reserva.
        </p>
      </div>

      <p style="margin-top: 24px; font-size: 12px; color: #555; text-align: center;">
        La Reseña de Santo y Seña · C/ Doctor Manuel Ruiz Maya 1 · Córdoba
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER,
    subject,
    html,
  });
}

/**
 * Sends a confirmation email to the customer.
 * @param {Object} reservation
 */
async function sendConfirmationToCustomer(reservation) {
  // Only send if the customer provided an email (field not in original form,
  // but included here for future use if you add an email field to the form).
  if (!reservation.email) return;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: reservation.email,
    subject: `Reserva Confirmada — La Reseña · ${reservation.fecha}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c9a96e;">¡Tu reserva ha sido confirmada!</h2>
        <p>Hola <strong>${reservation.nombre}</strong>,</p>
        <p>Tu reserva para el <strong>${reservation.fecha} a las ${reservation.hora}</strong>
           (${reservation.personas}) está confirmada. ¡Te esperamos!</p>
        <p style="color: #888; font-size: 13px;">
          La Reseña de Santo y Seña · C/ Doctor Manuel Ruiz Maya 1 · Córdoba · 957 073 913
        </p>
      </div>
    `,
  });
}

module.exports = { sendNewReservationNotification, sendConfirmationToCustomer };
