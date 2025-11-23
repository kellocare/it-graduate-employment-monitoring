const db = require('../db');

class AuditService {
    async log(adminId, action, targetId, details, ip = '127.0.0.1') {
        try {
            await db.query(
                `INSERT INTO audit_logs (admin_id, action, target_id, details, ip_address, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [adminId, action, targetId, details, ip]
            );
        } catch (e) {
            console.error("Audit Log Error:", e);
            // Не роняем сервер, если лог не записался
        }
    }
}

module.exports = new AuditService();