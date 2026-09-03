// Envoltura común de todos los correos de KidStore.
// HTML seguro para clientes de correo: tablas, estilos en línea, sin flex/grid,
// ancho fijo 600px, tema claro. La cabecera usa el imagotipo alojado en la web.

const BRAND = {
    wordmark:     'https://www.kidstoreperu.com/logo/imagotipo-kidstore.png',
    site:         'kidstoreperu.com',
    supportEmail: 'contacto@kidstoreperu.com',
    waNumber:     '51983454837',
    waHuman:      '+51 983 454 837',
};

const FOOTER_T = {
    ES: {
        help:   'Centro de ayuda',
        reason: 'Recibiste este correo por actividad reciente en tu cuenta de KidStore.',
        rights: 'Todos los derechos reservados.',
    },
    EN: {
        help:   'Help center',
        reason: 'You received this email because of recent activity on your KidStore account.',
        rights: 'All rights reserved.',
    },
};

export const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]
));

export const currencySymbol = (c) => (c === 'USD' ? '$' : c === 'EUR' ? '€' : 'S/');

export function renderEmail({ preheader = '', content = '', lang = 'ES' }) {
    const t = FOOTER_T[lang] || FOOTER_T.ES;
    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="${lang === 'EN' ? 'en' : 'es'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>KidStore</title>
</head>
<body style="margin:0; padding:0; background-color:#eef1f5; -webkit-text-size-adjust:100%;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${esc(preheader)}&#8203;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#eef1f5;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border:1px solid #e4e8ee; border-radius:16px; overflow:hidden; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="height:3px; background-color:#1e3a8a; font-size:0; line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:26px 36px; border-bottom:1px solid #eef1f5;">
            <img src="${BRAND.wordmark}" width="150" alt="KidStore" style="display:block; border:0; outline:none; text-decoration:none; height:auto;">
          </td>
        </tr>
        <tr><td style="padding:0;">${content}</td></tr>
        <tr>
          <td style="padding:24px 36px; background-color:#f7f9fc; border-top:1px solid #eef1f5;">
            <p style="margin:0 0 8px; font-size:12px; line-height:1.7; color:#8a94a6;">
              <a href="mailto:${BRAND.supportEmail}" style="color:#1d4ed8; text-decoration:none;">${BRAND.supportEmail}</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="https://wa.me/${BRAND.waNumber}" style="color:#1d4ed8; text-decoration:none;">WhatsApp ${BRAND.waHuman}</a>
            </p>
            <p style="margin:0 0 10px; font-size:12px; line-height:1.6; color:#9aa3b2;">${t.reason}</p>
            <p style="margin:0; font-size:11px; line-height:1.6; color:#b6bdc9;">© ${year} KidStore · ${BRAND.site} · Lima, Perú · ${t.rights}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export { BRAND };
