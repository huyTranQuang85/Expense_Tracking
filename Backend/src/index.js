
const express = require('express')
const app = express()
const pool = require("./db");

//test db
app.get('/health', (req,res) => {
    try {
    const result = await pool.query("SELECT 1 as ok");
    res.json({ status: "ok", db: result.rows[0].ok });
  } catch (err) {
    res.status(500).json({ status: "error", message: "DB error" });
  }
})
// ====== ROUTES ======
const authRoutes = require("./routes/authRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

// ====== USE======
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);



app.listen(4000)

module.exports = app;