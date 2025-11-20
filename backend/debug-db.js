require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

console.log('Попытка подключения со следующими параметрами:');
console.log(`User: ${process.env.DB_USER}`);
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Password: ${process.env.DB_PASSWORD ? '*** (указан)' : 'ПУСТОЙ (ошибка!)'}`);

async function testConnection() {
    try {
        await client.connect();
        console.log('✅ УСПЕХ! Подключение к базе данных работает.');
        const res = await client.query('SELECT NOW()');
        console.log('Время на сервере БД:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ:');
        console.error('------------------------------------------------');
        console.error(err.message); // Текст ошибки
        console.error('------------------------------------------------');
        if (err.message.includes('password')) {
            console.log('💡 Совет: Проверь пароль в файле .env');
        } else if (err.message.includes('does not exist')) {
            console.log('💡 Совет: Проверь имя базы данных (DB_NAME) в файле .env. Точно ли она называется graduate_monitoring?');
        }
        await client.end();
    }
}

testConnection();