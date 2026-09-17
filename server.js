const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Conexión a la base de datos SQLite con better-sqlite3
const db = new Database('./zafer.db');

// Inicializar la Base de Datos
db.serialize(() => {
  // Tabla de Usuarios
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  // Tabla de Prendas (con la columna 'usuario')
  db.run(`CREATE TABLE IF NOT EXISTS prendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barras TEXT UNIQUE,
    nombre TEXT,
    categoria TEXT,
    genero TEXT,
    precio REAL,
    vendido INTEGER DEFAULT 0,
    usuario TEXT,
    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Intentar agregar la columna 'usuario' por si la base de datos ya existía previamente
  db.run(`ALTER TABLE prendas ADD COLUMN usuario TEXT`, (err) => {
    // Si ya existe la columna, ignoramos el error
  });

  // Tabla de Auditoría / Logs
  db.run(`CREATE TABLE IF NOT EXISTS auditoria_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT,
    accion TEXT,
    detalles TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Usuarios iniciales
  const usuariosIniciales = [
    { user: 'kevinzafer', pass: '222026' },
    { user: 'elsazafer', pass: '196312' },
    { user: 'tanozafer', pass: '196313' }
  ];

  usuariosIniciales.forEach(u => {
    const hash = bcrypt.hashSync(u.pass, 10);
    db.run(`INSERT OR IGNORE INTO usuarios (username, password) VALUES (?, ?)`, [u.user, hash]);
  });
});

// Función de Copia de Seguridad Automática
function realizarBackup(accionRealizada) {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = './backups';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  
  const destPath = path.join(dir, `backup_zafer_${fecha}.db`);
  fs.copyFile('./zafer.db', destPath, (err) => {
    if (err) console.error('Error al crear copia de seguridad:', err);
    else console.log(`[BACKUP] Copia realizada tras: ${accionRealizada}`);
  });
}

// Registrar auditoría
function registrarLog(usuario, accion, detalles) {
  db.run(`INSERT INTO auditoria_logs (usuario, accion, detalles) VALUES (?, ?, ?)`, 
    [usuario || 'DESCONOCIDO', accion, detalles]);
}

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM usuarios WHERE username = ?`, [username], (err, user) => {
    if (err || !user) {
      registrarLog(username, 'LOGIN_FALLIDO', 'Intento de ingreso con usuario no autorizado');
      return res.status(401).json({ error: 'Usuario no autorizado' });
    }
    
    if (bcrypt.compareSync(password, user.password)) {
      registrarLog(username, 'LOGIN_EXITO', 'Ingreso exitoso al sistema');
      res.json({ status: 'ok', username: user.username });
    } else {
      registrarLog(username, 'LOGIN_FALLIDO', 'Contraseña incorrecta');
      res.status(401).json({ error: 'Contraseña incorrecta' });
    }
  });
});

// Obtener Prendas
app.get('/api/prendas', (req, res) => {
  const estado = req.query.estado;
  let query = "SELECT * FROM prendas";
  if (estado === 'vendido') query += " WHERE vendido = 1";
  if (estado === 'disponible') query += " WHERE vendido = 0";
  query += " ORDER BY id DESC";

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Registrar Prenda con Usuario
app.post('/api/prendas', (req, res) => {
  const { nombre, categoria, genero, precio, usuario } = req.body;
  const codigoBarras = 'ZAF' + Date.now().toString().slice(-9);

  db.run(`INSERT INTO prendas (codigo_barras, nombre, categoria, genero, precio, usuario) VALUES (?, ?, ?, ?, ?, ?)`,
    [codigoBarras, nombre, categoria, genero, precio, usuario || 'Sistema'],
    function(err) {
      if (err) {
        registrarLog(usuario, 'ERROR_AGREGAR_PRENDA', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      registrarLog(usuario, 'NUEVA_PRENDA', `Prenda ingresada ID: ${this.lastID}, Código: ${codigoBarras}`);
      realizarBackup('AGREGAR_PRENDA');
      res.json({ id: this.lastID, codigo_barras: codigoBarras, nombre, categoria, genero, precio, usuario });
    }
  );
});

// Vender Prenda
app.post('/api/prendas/vender', (req, res) => {
  const { codigo_barras, usuario } = req.body;

  db.run(`UPDATE prendas SET vendido = 1 WHERE codigo_barras = ? AND vendido = 0`, [codigo_barras], function(err) {
    if (err || this.changes === 0) {
      registrarLog(usuario, 'ERROR_VENTA', `Prenda no encontrada o ya vendida: ${codigo_barras}`);
      return res.status(400).json({ error: 'Prenda no disponible o código inválido' });
    }

    registrarLog(usuario, 'VENTA_REALIZADA', `Prenda vendida con código: ${codigo_barras}`);
    realizarBackup('REGISTRO_VENTA');
    res.json({ status: 'ok', message: 'Venta registrada con éxito' });
  });
});

app.listen(3000, () => {
  console.log('Servidor ZAFER activo en http://localhost:3000');
});