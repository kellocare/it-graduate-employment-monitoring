const dns = require('dns').promises;
const axios = require('axios');

// 1. Черный список слабых паролей
const COMMON_PASSWORDS = [
    '123456', '12345678', '123456789', 'qwerty', 'password', 'admin',
    '111111', '123123', 'iloveyou', 'pass123'
];

const validatePassword = (password) => {
    if (password.length < 8) return 'Пароль слишком короткий';
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) return 'Пароль слишком простой';
    // Проверка на последовательности (123, abc)
    if ('0123456789'.includes(password)) return 'Не используйте простые последовательности цифр';
    if ('abcdefghijklmnopqrstuvwxyz'.includes(password.toLowerCase())) return 'Не используйте алфавитные последовательности';
    return null; // OK
};

// 2. Проверка существования MX записи (домена почты)
const validateEmailDNS = async (email) => {
    const domain = email.split('@')[1];
    if (!domain) return false;
    try {
        const records = await dns.resolveMx(domain);
        return records && records.length > 0;
    } catch (e) {
        return false;
    }
};

// 3. Проверка hCaptcha
const verifyCaptcha = async (token) => {
    if (!token) return false;
    const secretKey = process.env.HCAPTCHA_SECRET; // Добавь в .env

    try {
        const verifyUrl = `https://api.hcaptcha.com/siteverify`;
        const response = await axios.post(verifyUrl, new URLSearchParams({
            secret: secretKey,
            response: token
        }));
        return response.data.success;
    } catch (e) {
        console.error('Captcha Error:', e);
        return false;
    }
};

module.exports = { validatePassword, validateEmailDNS, verifyCaptcha };