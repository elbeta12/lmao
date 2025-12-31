require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

/* ==================== EXPRESS ==================== */

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Servir archivos estáticos

/* ==================== POSTGRESQL ==================== */

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:CenxudPxGEGkzojZdstqLDFmswxLvvrZ@postgres.railway.internal:5432/railway',
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
        ? { rejectUnauthorized: false }
        : false
});

/* ==================== VERIFICAR CONEXIÓN ==================== */

(async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL conectado:', result.rows[0].now);
    } catch (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
        process.exit(1);
    }
})();

/* ==================== API ENDPOINTS ==================== */

// Obtener historial de fichajes
app.get('/api/fichajes', async (req, res) => {
    try {
        const { limit = 50, tipo } = req.query;
        
        let query = 'SELECT * FROM historial';
        const params = [];
        
        if (tipo && tipo !== 'todos') {
            query += ' WHERE tipo = $1';
            params.push(tipo);
        }
        
        query += ` ORDER BY fecha DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));
        
        const data = await pool.query(query, params);
        
        res.json({
            success: true,
            count: data.rows.length,
            data: data.rows
        });
    } catch (err) {
        console.error('Error en /api/fichajes:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener fichajes',
            message: err.message
        });
    }
});

// Obtener estadísticas
app.get('/api/estadisticas', async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) as total FROM historial');
        const fichajes = await pool.query("SELECT COUNT(*) as total FROM historial WHERE tipo != 'baja'");
        const bajas = await pool.query("SELECT COUNT(*) as total FROM historial WHERE tipo = 'baja'");
        
        res.json({
            success: true,
            data: {
                total: parseInt(total.rows[0].total),
                fichajes: parseInt(fichajes.rows[0].total),
                bajas: parseInt(bajas.rows[0].total)
            }
        });
    } catch (err) {
        console.error('Error en /api/estadisticas:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas'
        });
    }
});

// Obtener equipos
app.get('/api/equipos', async (req, res) => {
    try {
        const data = await pool.query('SELECT * FROM teams ORDER BY nombre');
        
        res.json({
            success: true,
            count: data.rows.length,
            data: data.rows
        });
    } catch (err) {
        console.error('Error en /api/equipos:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener equipos'
        });
    }
});

// Obtener fichaje específico por jugador
app.get('/api/fichajes/jugador/:jugadorId', async (req, res) => {
    try {
        const { jugadorId } = req.params;
        
        const data = await pool.query(
            'SELECT * FROM historial WHERE jugadorId = $1 ORDER BY fecha DESC',
            [jugadorId]
        );
        
        res.json({
            success: true,
            count: data.rows.length,
            data: data.rows
        });
    } catch (err) {
        console.error('Error en /api/fichajes/jugador:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener fichajes del jugador'
        });
    }
});

// Obtener fichajes por equipo
app.get('/api/fichajes/equipo/:teamNombre', async (req, res) => {
    try {
        const { teamNombre } = req.params;
        
        const data = await pool.query(
            'SELECT * FROM historial WHERE teamNombre = $1 ORDER BY fecha DESC',
            [teamNombre]
        );
        
        res.json({
            success: true,
            count: data.rows.length,
            data: data.rows
        });
    } catch (err) {
        console.error('Error en /api/fichajes/equipo:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener fichajes del equipo'
        });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            success: true,
            status: 'OK',
            database: 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            status: 'ERROR',
            database: 'Disconnected',
            error: err.message
        });
    }
});

/* ==================== SERVIR FRONTEND ==================== */

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para cualquier otra página (SPA fallback)
app.get('*', (req, res) => {
    // Si es una ruta de API, devolver 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'Endpoint no encontrado'
        });
    }
    // Si no, servir el index.html
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ==================== ERROR HANDLING ==================== */

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

/* ==================== INICIAR SERVIDOR ==================== */

app.listen(PORT, '0.0.0.0', () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Servidor Web Activo');
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`💾 Base de datos: PostgreSQL`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

/* ==================== GRACEFUL SHUTDOWN ==================== */

process.on('SIGTERM', async () => {
    console.log('⚠️  SIGTERM recibido, cerrando servidor...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n⚠️  SIGINT recibido, cerrando servidor...');
    await pool.end();
    process.exit(0);
});
