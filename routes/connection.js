const mysql = require("mysql2/promise");
// ______________________________________
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "db_afrijeng",
});
// ______________________________________
module.exports = db;