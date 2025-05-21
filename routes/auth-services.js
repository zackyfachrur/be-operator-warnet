const express = require("express");
const router = express.Router();
const db = require("./connection");
const bcrypt = require("bcrypt");

// ______________________________________
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM operators WHERE username = ?", [username]);

        if (rows.length === 0)
            return res.status(404).json({ message: "Account Operator Tidak Ada!" });

        const operator = rows[0];
        const match = await bcrypt.compare(password, operator.password);

        if (!match)
            return res.status(401).json({ message: "Password Tidak Sesuai" });

        res.json({
            message: "Login successful",
            operator: { id: operator.id, username: operator.username },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
});
// ______________________________________

module.exports = router;
