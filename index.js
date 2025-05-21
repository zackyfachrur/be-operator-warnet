const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ______________________________________
const userRoutes = require('./routes/user-services');
app.use("/api", userRoutes);
// ______________________________________
const billingRoutes = require('./routes/billings-services');
app.use("/api", billingRoutes);
// ______________________________________
const authRoutes = require('./routes/auth-services');
app.use("api", authRoutes);



// ______________________________________
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
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
