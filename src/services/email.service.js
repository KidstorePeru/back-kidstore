import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, html) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Kidstore <no-reply@kidstoreperu.com>', 
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ Error en Resend Service:', err);
        throw new Error('Fallo al procesar el envío de correo');
    }
};