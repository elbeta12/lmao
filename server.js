require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/api/fichajes', async (req, res) => {
  const data = await pool.query(
    'SELECT * FROM historial ORDER BY fecha DESC LIMIT 50'
  );
  res.json(data.rows);
});

app.listen(3000, () => {
  console.log('🌐 Web activa');
});
