
const express = require('express')
const app = express()

app.get('/', (req,res) => {
    try {
    const result = await pool.query("SELECT 1 as ok");
    res.json({ status: "ok", db: result.rows[0].ok });
  } catch (err) {
    res.status(500).json({ status: "error", message: "DB error" });
  }
})

app.listen(4000)