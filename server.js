const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/**
 * 🔌 CONEXIÓN POSTGRESQL (Railway)
 */
const pool = new Pool({
    connectionString: 'postgresql://postgres:CenxudPxGEGkzojZdstqLDFmswxLvvrZ@ballast.proxy.rlwy.net:14576/railway',
    ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(() => console.log('✅ PostgreSQL conectada'))
    .catch(err => console.error('❌ Error DB:', err));

/**
 * 📥 Obtener fichajes
 */
app.get('/api/fichajes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fichajes');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 🏠 Index
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * 🚀 Servidor
 */
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
});
