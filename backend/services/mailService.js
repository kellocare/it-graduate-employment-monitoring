const nodemailer = require('nodemailer');

class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // true для 465, false для других портов
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendActivationMail(to, link) {
        try {
            await this.transporter.sendMail({
                from: `"IT-Monitoring" <${process.env.SMTP_USER}>`, // Красивое имя отправителя
                to,
                subject: 'Подтверждение регистрации на IT-Monitoring',
                text: '',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #1890ff; text-align: center;">Добро пожаловать! 🎓</h2>
                        <p style="font-size: 16px; color: #333;">Здравствуйте!</p>
                        <p style="font-size: 16px; color: #333;">Спасибо за регистрацию в системе мониторинга трудоустройства.</p>
                        <p style="font-size: 16px; color: #333;">Для активации вашего аккаунта, пожалуйста, нажмите на кнопку ниже:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${link}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Подтвердить Email</a>
                        </div>

                        <p style="font-size: 14px; color: #777;">Или скопируйте ссылку в браузер:</p>
                        <p style="font-size: 12px; color: #999; word-break: break-all;">${link}</p>
                    </div>
                `
            });
            console.log(`Письмо отправлено на ${to}`);
        } catch (e) {
            console.error("Ошибка отправки письма:", e);
        }
    }
}

module.exports = new MailService();