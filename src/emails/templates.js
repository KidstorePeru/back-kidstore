// Plantillas de correo de KidStore (estilo "claro y limpio").
// Cada función devuelve { subject, html }.

import { renderEmail, esc, currencySymbol, BRAND } from './shell.js';

/* ─────────────────────────────────────────────────────────────
   Bloques reutilizables
   ───────────────────────────────────────────────────────────── */

const H1 = (text) =>
    `<h1 style="margin:0 0 14px; font-size:22px; line-height:1.35; font-weight:700; color:#111827; letter-spacing:-0.01em;">${text}</h1>`;

const EYEBROW = (text) =>
    `<p style="margin:0 0 10px; font-size:12px; font-weight:700; letter-spacing:0.13em; text-transform:uppercase; color:#1e3a8a;">${text}</p>`;

const LEAD = (html) =>
    `<p style="margin:0 0 8px; font-size:15px; line-height:1.7; color:#4b5563;">${html}</p>`;

const MUTED = (html) =>
    `<p style="margin:0; font-size:13px; line-height:1.65; color:#9aa3b2;">${html}</p>`;

const button = (href, label, kind = 'primary') => {
    const bg = kind === 'whatsapp' ? '#16a34a' : '#1e3a8a';
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td align="center" style="border-radius:10px; background-color:${bg};">
        <a href="${href}" style="display:inline-block; padding:13px 30px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; letter-spacing:0.01em;">${label}</a>
      </td></tr>
    </table>`;
};

/* ─────────────────────────────────────────────────────────────
   1. Código de verificación  (registro / reset / cambio de correo)
   ───────────────────────────────────────────────────────────── */

const VERIF = {
    ES: {
        greeting: (n) => (n ? `Hola, ${esc(n)}:` : 'Hola:'),
        codeLabel: 'Tu código de verificación',
        expires: 'El código caduca en 10 minutos y solo puede usarse una vez.',
        register: {
            subject: (c) => `${c} es tu código de verificación de KidStore`,
            pre: 'Tu código para crear la cuenta. Caduca en 10 minutos.',
            eyebrow: 'Verificación de correo',
            h1: 'Confirma tu correo electrónico',
            lead: (email) => `Estás a un paso de crear tu cuenta en KidStore. Ingresa este código para confirmar que <strong style="color:#111827;">${esc(email)}</strong> es tu correo.`,
            security: 'Si no intentaste registrarte en KidStore, puedes ignorar este mensaje.',
        },
        reset: {
            subject: () => 'Restablece tu contraseña de KidStore',
            pre: 'Tu código para restablecer la contraseña. Caduca en 10 minutos.',
            eyebrow: 'Seguridad de la cuenta',
            h1: 'Restablece tu contraseña',
            lead: () => 'Recibimos una solicitud para cambiar la contraseña de tu cuenta de KidStore. Ingresa este código para continuar.',
            security: 'Si no solicitaste este cambio, ignora este mensaje: tu contraseña no se modificará.',
        },
        'email-change': {
            subject: () => 'Confirma tu nuevo correo en KidStore',
            pre: 'Tu código para confirmar el nuevo correo. Caduca en 10 minutos.',
            eyebrow: 'Cambio de correo',
            h1: 'Confirma tu nuevo correo',
            lead: (email) => `Para usar <strong style="color:#111827;">${esc(email)}</strong> como el correo de tu cuenta de KidStore, ingresa este código.`,
            security: 'Si no pediste este cambio, ignora este mensaje y revisa la seguridad de tu cuenta.',
        },
    },
    EN: {
        greeting: (n) => (n ? `Hi ${esc(n)},` : 'Hi,'),
        codeLabel: 'Your verification code',
        expires: 'This code expires in 10 minutes and can only be used once.',
        register: {
            subject: (c) => `${c} is your KidStore verification code`,
            pre: 'Your code to create your account. Expires in 10 minutes.',
            eyebrow: 'Email verification',
            h1: 'Confirm your email address',
            lead: (email) => `You're one step away from creating your KidStore account. Enter this code to confirm that <strong style="color:#111827;">${esc(email)}</strong> is your email.`,
            security: "If you didn't try to sign up for KidStore, you can ignore this message.",
        },
        reset: {
            subject: () => 'Reset your KidStore password',
            pre: 'Your code to reset your password. Expires in 10 minutes.',
            eyebrow: 'Account security',
            h1: 'Reset your password',
            lead: () => 'We received a request to change the password for your KidStore account. Enter this code to continue.',
            security: "If you didn't request this change, ignore this message — your password won't be modified.",
        },
        'email-change': {
            subject: () => 'Confirm your new email on KidStore',
            pre: 'Your code to confirm your new email. Expires in 10 minutes.',
            eyebrow: 'Email change',
            h1: 'Confirm your new email',
            lead: (email) => `To use <strong style="color:#111827;">${esc(email)}</strong> as the email for your KidStore account, enter this code.`,
            security: "If you didn't request this change, ignore this message and review your account security.",
        },
    },
};

export function verificationEmail({ code, name, email, lang = 'ES', purpose = 'register' }) {
    const L = VERIF[lang] || VERIF.ES;
    const p = L[purpose] || L.register;
    const safeCode = esc(String(code));

    const content = `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr><td style="padding:38px 36px 0;">
        ${EYEBROW(p.eyebrow)}
        ${H1(p.h1)}
        ${LEAD(L.greeting(name))}
        ${LEAD(p.lead(email))}
      </td></tr>
      <tr><td style="padding:22px 36px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb; border:1px dashed #b7c2d4; border-radius:12px;">
          <tr><td align="center" style="padding:24px 16px;">
            <div style="font-size:11px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:#8a94a6; margin-bottom:10px;">${L.codeLabel}</div>
            <div style="font-family:'SFMono-Regular',Consolas,Menlo,monospace; font-size:36px; font-weight:700; letter-spacing:0.32em; color:#111827;">${safeCode}</div>
          </td></tr>
        </table>
        <p style="margin:12px 0 0; font-size:13px; line-height:1.6; color:#9aa3b2;">${L.expires}</p>
      </td></tr>
      <tr><td style="padding:22px 36px 40px;">
        ${MUTED(p.security)}
      </td></tr>
    </table>`;

    return {
        subject: p.subject(safeCode),
        html: renderEmail({ preheader: p.pre, content, lang }),
    };
}

/* ─────────────────────────────────────────────────────────────
   2. Confirmación de pedido — CLIENTE  (bilingüe)
   ───────────────────────────────────────────────────────────── */

const FORM_LABELS = {
    ES: {
        epicUser: 'Usuario de Epic Games', gameAccount: 'Cuenta / correo del juego',
        gameName: 'Nombre en el juego', platform: 'Plataforma', riotId: 'Riot ID',
        uid: 'UID', server: 'Servidor', trainerCode: 'Código de entrenador', discordTag: 'Discord',
    },
    EN: {
        epicUser: 'Epic Games username', gameAccount: 'Game account / email',
        gameName: 'In-game name', platform: 'Platform', riotId: 'Riot ID',
        uid: 'UID', server: 'Server', trainerCode: 'Trainer code', discordTag: 'Discord',
    },
};

const formLabel = (lang, k) =>
    (FORM_LABELS[lang] || FORM_LABELS.ES)[k] ||
    k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const SITE = 'https://www.kidstoreperu.com';
const absUrl = (u) => {
    const s = String(u || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    return SITE + (s.startsWith('/') ? '' : '/') + s;
};

// Fila de producto con miniatura. Cabecera y fila total deben usar colspan="2"
// para la primera columna (imagen + nombre).
const itemRows = (items, sym) => items.map((it, i) => {
    const border = i === 0 ? '' : 'border-top:1px solid #eef1f5;';
    const img = absUrl(it.image);
    const thumb = img
        ? `<img src="${esc(img)}" width="46" height="46" alt="" style="display:block; width:46px; height:46px; border-radius:8px; border:1px solid #eef1f5; background-color:#f4f7fb; object-fit:contain;">`
        : `<div style="width:46px; height:46px; border-radius:8px; background-color:#f4f7fb; border:1px solid #eef1f5;">&nbsp;</div>`;
    return `
    <tr>
      <td width="64" valign="middle" style="padding:12px 0 12px 18px; ${border}">${thumb}</td>
      <td valign="middle" style="padding:12px 14px; font-size:14px; line-height:1.4; color:#111827; ${border}">${esc(it.name)}<span style="color:#9aa3b2;">&nbsp;·&nbsp;×${Number(it.quantity)}</span></td>
      <td valign="middle" align="right" style="padding:12px 18px 12px 0; font-size:14px; font-weight:700; color:#111827; white-space:nowrap; ${border}">${sym} ${(Number(it.price) * Number(it.quantity)).toFixed(2)}</td>
    </tr>`;
}).join('');

const formDataBlock = (formData, lang, title) => {
    const rows = Object.entries(formData || {})
        .filter(([k, v]) => !['notes', 'name', 'phone', 'email'].includes(k) && v)
        .map(([k, v]) => `
          <tr>
            <td style="padding:7px 0; font-size:13px; color:#8a94a6; white-space:nowrap;">${esc(formLabel(lang, k))}</td>
            <td style="padding:7px 0 7px 18px; font-size:13px; font-weight:600; color:#111827;">${esc(v)}</td>
          </tr>`).join('');
    if (!rows) return '';
    return `
    <tr><td style="padding:18px 36px 0;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f7f9fc; border:1px solid #eef1f5; border-radius:12px;">
        <tr><td style="padding:14px 20px;">
          <p style="margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#8a94a6;">${esc(title)}</p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
      </table>
    </td></tr>`;
};

const ORDER = {
    ES: {
        subject: (id) => `Pedido #${id} confirmado — KidStore`,
        pre: (id) => `Recibimos tu pedido #${id}. Envía tu comprobante de pago por WhatsApp para procesarlo.`,
        eyebrow: 'Pedido confirmado',
        h1: (n) => (n ? `Gracias por tu compra, ${esc(n)}` : 'Gracias por tu compra'),
        lead: (id) => `Registramos tu pedido <strong style="color:#111827;">#${id}</strong>. Para completarlo, envíanos tu comprobante de pago por WhatsApp y lo procesamos lo antes posible.`,
        colProduct: 'Producto', colSubtotal: 'Subtotal', total: 'Total',
        payLabel: 'Método de pago',
        deliveryTitle: 'Datos para la entrega',
        notesTitle: 'Notas',
        cta: 'Enviar comprobante por WhatsApp',
        waText: (id) => `Hola! Acabo de hacer el pedido #${id} en KidStore. Adjunto mi comprobante de pago.`,
        after: 'Te avisaremos por este medio cuando tu pedido esté en proceso y cuando se complete la entrega.',
    },
    EN: {
        subject: (id) => `Order #${id} confirmed — KidStore`,
        pre: (id) => `We've received your order #${id}. Send your payment proof on WhatsApp to process it.`,
        eyebrow: 'Order confirmed',
        h1: (n) => (n ? `Thanks for your order, ${esc(n)}` : 'Thanks for your order'),
        lead: (id) => `Your order <strong style="color:#111827;">#${id}</strong> is registered. To complete it, send us your payment proof on WhatsApp and we'll process it as soon as possible.`,
        colProduct: 'Item', colSubtotal: 'Subtotal', total: 'Total',
        payLabel: 'Payment method',
        deliveryTitle: 'Delivery details',
        notesTitle: 'Notes',
        cta: 'Send payment proof on WhatsApp',
        waText: (id) => `Hi! I just placed order #${id} on KidStore. Here is my payment proof.`,
        after: "We'll let you know here when your order is being processed and when the delivery is complete.",
    },
};

export function orderClientEmail({ orderId, name, email, items = [], total, currency = 'PEN', paymentMethod, formData = {}, lang = 'ES' }) {
    const L = ORDER[lang] || ORDER.ES;
    const sym = currencySymbol(currency);
    const displayName = name && name !== String(email).split('@')[0] ? name : '';
    const waHref = `https://wa.me/${BRAND.waNumber}?text=${encodeURIComponent(L.waText(orderId))}`;
    const notes = formData?.notes;

    const content = `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr><td style="padding:38px 36px 0;">
        ${EYEBROW(L.eyebrow)}
        ${H1(L.h1(displayName))}
        ${LEAD(L.lead(orderId))}
      </td></tr>

      <tr><td style="padding:24px 36px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f5; border-radius:12px; overflow:hidden;">
          <tr style="background-color:#f7f9fc;">
            <td colspan="2" style="padding:11px 20px; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#1e3a8a;">${L.colProduct}</td>
            <td align="right" style="padding:11px 20px; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#1e3a8a;">${L.colSubtotal}</td>
          </tr>
          ${itemRows(items, sym)}
          <tr style="background-color:#f7f9fc;">
            <td colspan="2" style="padding:14px 20px; font-size:13px; font-weight:700; color:#4b5563; border-top:2px solid #e4e8ee;">${L.total}</td>
            <td align="right" style="padding:14px 20px; font-size:19px; font-weight:800; color:#047857; border-top:2px solid #e4e8ee;">${sym} ${Number(total).toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="padding:16px 36px 0; font-size:13px; color:#8a94a6;">
        ${L.payLabel}: <strong style="color:#b45309; text-transform:capitalize;">${esc(paymentMethod || '—')}</strong>
      </td></tr>

      ${formDataBlock(formData, lang, L.deliveryTitle)}

      ${notes ? `
      <tr><td style="padding:14px 36px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f7f9fc; border-left:3px solid #1e3a8a; border-radius:0 8px 8px 0;">
          <tr><td style="padding:12px 18px;">
            <p style="margin:0 0 4px; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#8a94a6;">${L.notesTitle}</p>
            <p style="margin:0; font-size:13px; color:#4b5563; line-height:1.6;">${esc(notes)}</p>
          </td></tr>
        </table>
      </td></tr>` : ''}

      <tr><td style="padding:28px 36px 8px;">
        ${button(waHref, L.cta, 'whatsapp')}
      </td></tr>

      <tr><td style="padding:16px 36px 40px;">
        ${MUTED(L.after)}
      </td></tr>
    </table>`;

    return {
        subject: L.subject(orderId),
        html: renderEmail({ preheader: L.pre(orderId), content, lang }),
    };
}

/* ─────────────────────────────────────────────────────────────
   3. Aviso de pedido — ADMIN  (siempre en español)
   ───────────────────────────────────────────────────────────── */

export function orderAdminEmail({ orderId, name, email, phone, items = [], total, currency = 'PEN', paymentMethod, formData = {} }) {
    const sym = currencySymbol(currency);
    const notes = formData?.notes;
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');

    const infoRow = (label, value) => `
      <tr>
        <td style="padding:8px 0; font-size:13px; color:#8a94a6; white-space:nowrap;">${esc(label)}</td>
        <td style="padding:8px 0 8px 18px; font-size:13px; font-weight:600; color:#111827;">${value}</td>
      </tr>`;

    const formRows = Object.entries(formData || {})
        .filter(([k, v]) => !['notes', 'name', 'phone', 'email'].includes(k) && v)
        .map(([k, v]) => infoRow(formLabel('ES', k), esc(v)))
        .join('');

    const content = `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr><td style="padding:34px 36px 0;">
        ${EYEBROW('Nuevo pedido')}
        ${H1(`Pedido #${esc(orderId)} · ${sym} ${Number(total).toFixed(2)}`)}
      </td></tr>

      <tr><td style="padding:20px 36px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f7f9fc; border:1px solid #eef1f5; border-radius:12px;">
          <tr><td style="padding:16px 20px;">
            <p style="margin:0 0 8px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#8a94a6;">Cliente</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              ${infoRow('Nombre', esc(name || '—'))}
              ${infoRow('Correo', `<a href="mailto:${esc(email)}" style="color:#1d4ed8; text-decoration:none;">${esc(email)}</a>`)}
              ${phone ? infoRow('Teléfono', `<a href="https://wa.me/${cleanPhone}" style="color:#1d4ed8; text-decoration:none;">${esc(phone)}</a>`) : ''}
            </table>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:16px 36px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f5; border-radius:12px; overflow:hidden;">
          <tr style="background-color:#f7f9fc;">
            <td colspan="2" style="padding:11px 20px; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#1e3a8a;">Producto</td>
            <td align="right" style="padding:11px 20px; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#1e3a8a;">Subtotal</td>
          </tr>
          ${itemRows(items, sym)}
          <tr style="background-color:#f7f9fc;">
            <td colspan="2" style="padding:14px 20px; font-size:13px; font-weight:700; color:#4b5563; border-top:2px solid #e4e8ee;">Total (${esc(currency)})</td>
            <td align="right" style="padding:14px 20px; font-size:19px; font-weight:800; color:#047857; border-top:2px solid #e4e8ee;">${sym} ${Number(total).toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="padding:16px 36px 0; font-size:13px; color:#8a94a6;">
        Método de pago: <strong style="color:#b45309; text-transform:capitalize;">${esc(paymentMethod || '—')}</strong>
      </td></tr>

      ${formRows ? `
      <tr><td style="padding:18px 36px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f7f9fc; border:1px solid #eef1f5; border-radius:12px;">
          <tr><td style="padding:14px 20px;">
            <p style="margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#8a94a6;">Datos del pedido</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">${formRows}</table>
          </td></tr>
        </table>
      </td></tr>` : ''}

      ${notes ? `
      <tr><td style="padding:14px 36px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fff7ed; border-left:3px solid #ea580c; border-radius:0 8px 8px 0;">
          <tr><td style="padding:12px 18px;">
            <p style="margin:0 0 4px; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#9a3412;">Notas del cliente</p>
            <p style="margin:0; font-size:13px; color:#7c2d12; line-height:1.6;">${esc(notes)}</p>
          </td></tr>
        </table>
      </td></tr>` : ''}

      <tr><td style="padding:26px 36px 40px;">
        ${button(`https://wa.me/${cleanPhone || BRAND.waNumber}`, 'Abrir WhatsApp', 'whatsapp')}
      </td></tr>
    </table>`;

    return {
        subject: `Nuevo pedido #${orderId} · ${name || email} · ${sym} ${Number(total).toFixed(2)}`,
        html: renderEmail({ preheader: `${name || email} — ${items.length} producto(s) — ${sym} ${Number(total).toFixed(2)}`, content, lang: 'ES' }),
    };
}

/* ─────────────────────────────────────────────────────────────
   4. Cambio de estado del pedido — CLIENTE  (bilingüe)
   Se envía cuando el administrador pasa el pedido a "en proceso", "entregado" o "cancelado".
   ───────────────────────────────────────────────────────────── */

const STATUS_T = {
    ES: {
        greeting: (n) => (n ? `Hola, ${esc(n)}:` : 'Hola:'),
        itemsTitle: 'Productos del pedido',
        cta: 'Escribir por WhatsApp',
        waText: (id) => `Hola! Tengo una consulta sobre mi pedido #${id} de KidStore.`,
        processing: {
            subject: (id) => `Tu pedido #${id} está en proceso — KidStore`,
            pre: (id) => `Verificamos tu pago y estamos procesando tu pedido #${id}.`,
            eyebrow: 'Pedido en proceso',
            h1: 'Estamos procesando tu pedido',
            lead: (id) => `Verificamos tu pago y ya estamos trabajando en tu pedido <strong style="color:#111827;">#${id}</strong>. Te avisaremos por este medio en cuanto esté entregado.`,
        },
        delivered: {
            subject: (id) => `Pedido #${id} entregado — KidStore`,
            pre: (id) => `Completamos la entrega de tu pedido #${id}. ¡Gracias por tu compra!`,
            eyebrow: 'Pedido entregado',
            h1: '¡Tu pedido fue entregado!',
            lead: (id) => `Completamos la entrega de tu pedido <strong style="color:#111827;">#${id}</strong>. ¡Gracias por comprar en KidStore! Si algo no está como esperabas, escríbenos y lo revisamos.`,
        },
        cancelled: {
            subject: (id) => `Pedido #${id} cancelado — KidStore`,
            pre: (id) => `Tu pedido #${id} fue cancelado.`,
            eyebrow: 'Pedido cancelado',
            h1: 'Tu pedido fue cancelado',
            lead: (id) => `Tu pedido <strong style="color:#111827;">#${id}</strong> fue cancelado. Si crees que es un error o ya realizaste el pago, escríbenos por WhatsApp y lo revisamos.`,
        },
    },
    EN: {
        greeting: (n) => (n ? `Hi ${esc(n)},` : 'Hi,'),
        itemsTitle: 'Items in this order',
        cta: 'Message us on WhatsApp',
        waText: (id) => `Hi! I have a question about my KidStore order #${id}.`,
        processing: {
            subject: (id) => `Your order #${id} is being processed — KidStore`,
            pre: (id) => `We verified your payment and are processing order #${id}.`,
            eyebrow: 'Order in progress',
            h1: "We're processing your order",
            lead: (id) => `We verified your payment and are working on your order <strong style="color:#111827;">#${id}</strong>. We'll let you know here as soon as it's delivered.`,
        },
        delivered: {
            subject: (id) => `Order #${id} delivered — KidStore`,
            pre: (id) => `Your order #${id} has been delivered. Thanks for your purchase!`,
            eyebrow: 'Order delivered',
            h1: 'Your order has been delivered!',
            lead: (id) => `We've completed the delivery of your order <strong style="color:#111827;">#${id}</strong>. Thanks for shopping at KidStore! If anything isn't right, message us and we'll look into it.`,
        },
        cancelled: {
            subject: (id) => `Order #${id} cancelled — KidStore`,
            pre: (id) => `Your order #${id} was cancelled.`,
            eyebrow: 'Order cancelled',
            h1: 'Your order was cancelled',
            lead: (id) => `Your order <strong style="color:#111827;">#${id}</strong> was cancelled. If you think this is a mistake or you already paid, message us on WhatsApp and we'll look into it.`,
        },
    },
};

export function orderStatusEmail({ orderId, name, status, items = [], lang = 'ES' }) {
    const T = STATUS_T[lang] || STATUS_T.ES;
    const S = T[status];
    if (!S) return null; // "pending" u otros: no se avisa
    const waHref = `https://wa.me/${BRAND.waNumber}?text=${encodeURIComponent(T.waText(orderId))}`;
    const list = items
        .map((it) => `<li style="margin:0 0 4px;">${esc(it.name)}<span style="color:#9aa3b2;">&nbsp;·&nbsp;×${Number(it.quantity) || 1}</span></li>`)
        .join('');

    const content = `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr><td style="padding:38px 36px 0;">
        ${EYEBROW(S.eyebrow)}
        ${H1(S.h1)}
        ${LEAD(T.greeting(name))}
        ${LEAD(S.lead(orderId))}
      </td></tr>
      ${list ? `
      <tr><td style="padding:18px 36px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f7f9fc; border:1px solid #eef1f5; border-radius:12px;">
          <tr><td style="padding:14px 20px;">
            <p style="margin:0 0 8px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#8a94a6;">${T.itemsTitle}</p>
            <ul style="margin:0; padding:0 0 0 18px; font-size:14px; line-height:1.5; color:#111827;">${list}</ul>
          </td></tr>
        </table>
      </td></tr>` : ''}
      <tr><td style="padding:26px 36px 40px;">
        ${button(waHref, T.cta, 'whatsapp')}
      </td></tr>
    </table>`;

    return {
        subject: S.subject(orderId),
        html: renderEmail({ preheader: S.pre(orderId), content, lang }),
    };
}
