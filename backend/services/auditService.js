const db = require('../db');

class AuditService {

    /**
     * Записать действие в лог
     * @param {number} adminId - ID пользователя, который совершил действие
     * @param {string} action - Тип действия (AUTH_LOGIN, USER_DELETE, VACANCY_APPROVE и т.д.)
     * @param {number|null} targetId - ID объекта, над которым совершено действие
     * @param {string|object} details - Описание или JSON с деталями
     * @param {string} ip - IP адрес (опционально)
     */
    async log(adminId, action, targetId = null, details = '', ip = '') {
        try {
            const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;

            await db.query(
                `INSERT INTO audit_logs (admin_id, action, target_id, details, ip_address) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [adminId, action, targetId, detailsStr, ip]
            );
        } catch (e) {
            console.error("Audit Log Error:", e.message);
            // Ошибки логов не должны ломать основное приложение
        }
    }
}

module.exports = new AuditService();