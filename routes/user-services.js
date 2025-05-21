const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("./connection");

// ______________________________________
router.get("/computers", async (req, res) => {
    const [rows] = await db.query("SELECT * FROM computers");
    res.json(rows);
});
// ______________________________________
// ______________________________________
router.post("/users", async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [
            username,
            hashed,
        ]);
        res.json({ message: "User Berhasil Dibuat" });
    } catch (error) {
        console.error("Gagal membuat user:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat membuat user" });
    }
});
// ______________________________________

module.exports = router;