const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "db_afrijeng",
});

/* 
-- Akun Operator
INSERT INTO operators (username, password) VALUES ('rangga', 'renggo');

>> Kalau udah jalanin Query SQL diatas
>> Matin Comment di code bawah Select Codenya terus (CTRL + /)
*/

// ----------- Matiin Comment ----------
// async function updatePasswordHash() {
//     const passwordPlain = "renggo";
//     const saltRounds = 10;
//     const hash = await bcrypt.hash(passwordPlain, saltRounds);

//     await db.query("UPDATE operators SET password = ? WHERE username = ?", [hash, "rangga"]);
//     console.log("Password hashed dan diupdate di DB:", hash);
// }

// updatePasswordHash();
// ----------- Matiin Comment ----------

// ______________ AUTH (Operator Login) ______________ 
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const [rows] = await db.query("SELECT * FROM operators WHERE username = ?", [username]);

    if (rows.length === 0) return res.status(404).json({ message: "Account Operator Tidak Ada!" });
    const operator = rows[0];
    const match = await bcrypt.compare(password, operator.password);
    if (!match) return res.status(401).json({ message: "Password Tidak Sesuai" });

    res.json({ message: "Login successful", operator: { id: operator.id, username: operator.username } });
});

// ______________ USERS ______________
app.post("/api/users", async (req, res) => {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashed]);
    res.json({ message: "User Berhasil Dibuat" });
});

app.get("/api/billings/active", async (req, res) => {
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




// ----------- Matiin Comment ----------
// async function createUser(username, password) {
//     try {
//         const hashed = await bcrypt.hash(password, 10);
//         await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [
//             username,
//             hashed,
//         ]);
//         console.log("User berhasil dibuat:", username);
//     } catch (error) {
//         console.error("Gagal buat user:", error.message);
//     }
// }
// async function main() {
//     const password = "123456";
//     for (let i = 1; i <= 23; i++) {
//         const username = `PC${i}`;
//         await createUser(username, password);
//     }
// }

// main().then(() => {
//     console.log("Semua user berhasil dibuat");
//     process.exit(0);
// });

// ----------- Matiin Comment ----------


// ______________ COMPUTERS ______________
app.get("/api/computers", async (req, res) => {
    const [rows] = await db.query("SELECT * FROM computers");
    res.json(rows);
});


app.post("/api/billings/start", async (req, res) => {
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

// ______________ BILLINGS END ______________
app.post("/api/billings/end", async (req, res) => {
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

// ______________ START SERVER ______________
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
