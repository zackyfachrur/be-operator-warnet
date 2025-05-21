const express = require("express");
const router = express.Router();
const db = require("./connection");

// ______________________________________
router.get("/billings/active", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                b.id, 
                b.computer_id, 
                c.name AS computer_name, 
                u.username, 
                b.start_time, 
                b.duration_minutes, 
                c.status AS computer_status, 
                b.status
            FROM billings b
            JOIN users u ON b.user_id = u.id
            JOIN computers c ON b.computer_id = c.id
            WHERE b.status = 'active'
        `);

        const now = new Date();

        const activeBillings = rows.map((b) => {
            const startTime = new Date(b.start_time);
            const durationMinutes = b.duration_minutes || 0;
            const elapsedMinutes = (now - startTime) / 60000;
            const remainingMinutes = Math.max(0, durationMinutes - elapsedMinutes);

            const remainingHours = Math.floor(remainingMinutes / 60);
            const remainingMins = Math.floor(remainingMinutes % 60);
            const remainingSecs = Math.floor((remainingMinutes % 1) * 60);

            const remaining_time =
                String(remainingHours).padStart(2, "0") + ":" +
                String(remainingMins).padStart(2, "0") + ":" +
                String(remainingSecs).padStart(2, "0");

            return {
                id: b.id,
                computer_id: b.computer_id,
                computer_name: b.computer_name,
                username: b.username,
                start_time: b.start_time,
                duration_minutes: durationMinutes,
                remaining_time,
                computer_status: b.computer_status,
                billing_status: b.status,
            };
        });

        res.json(activeBillings);
    } catch (error) {
        console.error("Error fetching active billings:", error);
        res.status(500).json({ message: "Gagal mengambil data billing aktif" });
    }
});
// ______________________________________

// ______________________________________
router.post("/billings/start", async (req, res) => {
    try {
        const { username, computer_id, start_time, duration_minutes } = req.body;

        if (!username || typeof username !== "string") {
            return res.status(400).json({ message: "Username tidak valid" });
        }
        if (!computer_id || typeof computer_id !== "number") {
            return res.status(400).json({ message: "ID Komputer tidak valid" });
        }
        if (!start_time || isNaN(Date.parse(start_time))) {
            return res.status(400).json({ message: "Waktu mulai tidak valid" });
        }
        if (!duration_minutes || typeof duration_minutes !== "number") {
            return res.status(400).json({ message: "Durasi waktu tidak valid" });
        }

        const [users] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
        if (users.length === 0) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        const user_id = users[0].id;

        await db.query(
            `INSERT INTO billings (user_id, computer_id, start_time, duration_minutes) VALUES (?, ?, ?, ?)`,
            [user_id, computer_id, start_time, duration_minutes]
        );
        await db.query("UPDATE computers SET status = 'dipakai' WHERE id = ?", [computer_id]);

        res.json({ message: "Billing started" });
    } catch (err) {
        console.error("Error saat memulai billing:", err);
        res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
});
// ______________________________________

// ______________________________________
router.post("/billings/end", async (req, res) => {
    const { billing_id, end_time, price_per_minute } = req.body;

    const [rows] = await db.query("SELECT * FROM billings WHERE id = ?", [billing_id]);
    if (rows.length === 0) {
        return res.status(404).json({ message: "Billing tidak ditemukan" });
    }

    const billing = rows[0];
    const start = new Date(billing.start_time);
    const end = new Date(end_time);

    if (isNaN(end.getTime()) || end < start) {
        return res.status(400).json({ message: "Waktu akhir tidak valid" });
    }
    if (typeof price_per_minute !== "number" || price_per_minute <= 0) {
        return res.status(400).json({ message: "Harga per menit tidak valid" });
    }

    const duration = Math.ceil((end - start) / 60000);
    const total = duration * price_per_minute;

    await db.query(
        `UPDATE billings SET end_time = ?, duration_minutes = ?, total_price = ?, status = 'completed' WHERE id = ?`,
        [end.toISOString(), duration, total, billing_id]
    );
    await db.query("UPDATE computers SET status = 'available' WHERE id = ?", [billing.computer_id]);

    res.json({ message: "Billing completed", duration, total });
});
// ______________________________________

module.exports = router;