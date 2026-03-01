const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function notifyNewReservation(reservation) {
  if (!process.env.SMTP_USER || !process.env.NOTIFY_EMAIL) {
    console.log('Email not configured - skipping notification');
    return;
  }
  const { nombre, telefono, fecha, hora, personas, ocasion, notas } = reservation;
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#1a1a1a;color:#e8dcc8;padding:32px;border-radius:8px">
      <h2 style="font-family:serif;color:#c9a84c;border-bottom:1px solid #333;padding-bottom:12px">
        Nueva Reserva - La Resena
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;color:#999;width:140px">Cliente</td><td style="padding:8px 0"><strong>${nombre}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#999">Telefono</td><td style="padding:8px 0"><a href="tel:${telefono}" style="color:#c9a84c">${telefono}</a></td></tr>
        <tr><td style="padding:8px 0;color:#999">Fecha</td><td style="padding:8px 0">${fecha}</td></tr>
        <tr><td style="padding:8px 0;color:#999">Hora</td><td style="padding:8px 0">${hora}</td></tr>
        <tr><td style="padding:8px 0;color:#999">Personas</td><td style="padding:8px 0">${personas}</td></tr>
        <tr><td style="padding:8px 0;color:#999">Ocasion</td><td style="padding:8px 0">${ocasion || '-'}</td></tr>
        <tr><td style="padding:8px 0;color:#999">Notas</td><td style="padding:8px 0">${notas || '-'}</td></tr>
      </table>
      <p style="margin-top:24px;font-size:13px;color:#666">
        Gestiona esta reserva desde el panel de administracion.
      </p>
    </div>
  `;
  await transporter.sendMail({
    from:    `"La Resena" <${process.env.SMTP_USER}>`,
    to:      process.env.NOTIFY_EMAIL,
    subject: `Nueva reserva: ${nombre} - ${fecha} ${hora}`,
    html,
  });
  console.log(`Email enviado al restaurante para reserva de ${nombre}`);
}

async function confirmReservationToCustomer(reservation) {
  if (!process.env.SMTP_USER) {
    console.log('Email not configured - skipping customer confirmation');
    return;
  }
  const { nombre, email, telefono, fecha, hora, personas, ocasion } = reservation;
  if (!email) return;
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#1a1a1a;color:#e8dcc8;padding:32px;border-radius:8px">
      <h2 style="font-family:serif;color:#c9a84c;border-bottom:1px solid #333;padding-bottom:12px">
        Reserva Confirmada - La Resena
      </h2>
      <p style="margin-bottom:24px">Hola <strong>${nombre}</strong>, hemos recibido tu reserva correctamente.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;color:#999;width:140px">Fecha</td><td style="padding:8px 0"><strong>${fecha}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#999">Hora</td><td style="padding:8px 0"><strong>${hora}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#999">Personas</td><td style="padding:8px 0">${personas}</td></tr>
        <tr><td style="padding:8px 0;color:#999">Ocasion</td><td style="padding:8px 0">${ocasion || '-'}</td></tr>
      </table>
      <p style="margin-top:24px;color:#999">Si necesitas cancelar o modificar tu reserva llamanos al <a href="tel:957073913" style="color:#c9a84c">957 073 913</a>.</p>
      <p style="margin-top:32px;font-size:13px;color:#666">C/ Doctor Manuel Ruiz Maya, num 1 local - Cordoba</p>
    </div>
  `;
  await transporter.sendMail({
    from:    `"La Resena" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: `Reserva recibida - La Resena ${fecha} ${hora}`,
    html,
  });
  console.log(`Email de confirmacion enviado a ${email}`);
}

module.exports = { notifyNewReservation, confirmReservationToCustomer };