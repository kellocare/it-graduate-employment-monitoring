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

    async sendInterviewInvite(to, date, link, name) {
        try {
            await this.transporter.sendMail({
                from: `"IT-Monitoring HR" <${process.env.SMTP_USER}>`,
                to,
                subject: 'Приглашение на техническое интервью',
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #2c3e50;">Здравствуйте, ${name}!</h2>
                        <p>Ваше тестовое задание успешно прошло проверку.</p>
                        <p>Мы рады пригласить вас на техническое интервью.</p>
                        
                        <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #1890ff; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>📅 Дата:</strong> ${new Date(date).toLocaleString('ru-RU')}</p>
                            <p style="margin: 5px 0;"><strong>🔗 Ссылка:</strong> <a href="${link}">${link}</a></p>
                        </div>
                        
                        <p>Пожалуйста, не опаздывайте.</p>
                        <p style="color: #888; font-size: 12px;">Это автоматическое уведомление.</p>
                    </div>
                `
            });
            console.log(`Invite sent to ${to}`);
        } catch (e) {
            console.error("Mail Error:", e);
        }
    }
}

module.exports = new MailService();