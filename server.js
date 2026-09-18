const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// 1. Conexión a la base de datos SQLite con better-sqlite3
const db = new Database('./zafer.db');

// 2. Inicialización de la base de datos (creación de tablas)
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS prendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barras TEXT UNIQUE,
    nombre TEXT,
    categoria TEXT,
    genero TEXT,
    precio REAL,
    stock INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'Disponible'
  );

  CREATE TABLE IF NOT EXISTS auditoria_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT,
    accion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migraciones seguras por si las tablas ya existían sin estas columnas
try {
  db.exec(`ALTER TABLE prendas ADD COLUMN stock INTEGER DEFAULT 0;`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE prendas ADD COLUMN estado TEXT DEFAULT 'Disponible';`);
} catch (e) {}

// Limpiar códigos de barras nulos o vacíos existentes
try {
  const prendasNulas = db.prepare("SELECT id FROM prendas WHERE codigo_barras IS NULL OR codigo_barras = 'null' OR codigo_barras = ''").all();
  prendasNulas.forEach(p => {
    const nuevoCodigo = 'ZAF' + Math.floor(100000000 + Math.random() * 900000000);
    db.prepare("UPDATE prendas SET codigo_barras = ? WHERE id = ?").run(nuevoCodigo, p.id);
  });
} catch (e) {
  console.error("Error al limpiar códigos nulos:", e.message);
}

// Función de apoyo para registrar en auditoría
function registrarAuditoria(usuario, accion) {
  try {
    const stmt = db.prepare('INSERT INTO auditoria_logs (usuario, accion) VALUES (?, ?)');
    stmt.run(usuario || 'Sistema', accion);
  } catch (err) {
    console.error('Error registrando auditoría:', err.message);
  }
}

// --- RUTAS DE AUTENTICACIÓN ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    registrarAuditoria(username, 'Inicio de sesión exitoso');
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE PRENDAS (INVENTARIO Y VENTAS) ---
app.get('/api/prendas', (req, res) => {
  try {
    const prendas = db.prepare('SELECT * FROM prendas').all();
    res.json(prendas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prendas', (req, res) => {
  let { codigo_barras, nombre, categoria, genero, precio, stock, usuario } = req.body;

  if (!codigo_barras || codigo_barras === 'null' || codigo_barras === 'undefined' || String(codigo_barras).trim() === '') {
    codigo_barras = 'ZAF' + Math.floor(100000000 + Math.random() * 900000000);
  }

  try {
    const stmt = db.prepare(
      'INSERT INTO prendas (codigo_barras, nombre, categoria, genero, precio, stock, estado) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(codigo_barras, nombre, categoria, genero, precio, stock || 0, 'Disponible');

    registrarAuditoria(usuario, `Creó la prenda: ${nombre} (${codigo_barras})`);
    res.json({ id: result.lastInsertRowid, codigo_barras, message: 'Prenda registrada exitosamente' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ruta para registrar venta por código de barras
app.post('/api/ventas', (req, res) => {
  const { codigo_barras, usuario } = req.body;
  try {
    const prenda = db.prepare('SELECT * FROM prendas WHERE codigo_barras = ?').get(codigo_barras);
    
    if (!prenda) {
      return res.status(404).json({ error: 'Prenda no encontrada con ese código de barras' });
    }

    if (prenda.estado === 'Vendido') {
      return res.status(400).json({ error: 'Esta prenda ya ha sido vendida anteriormente' });
    }

    // Actualizar estado a Vendido y reducir stock opcionalmente
    db.prepare("UPDATE prendas SET estado = 'Vendido', stock = CASE WHEN stock > 0 THEN stock - 1 ELSE 0 END WHERE id = ?").run(prenda.id);

    registrarAuditoria(usuario, `VENTA_REALIZADA: Vendió prenda ${prenda.nombre} (${prenda.codigo_barras})`);
    
    // Retornamos la información completa de la prenda para generar la boleta
    res.json({ message: 'Venta procesada con éxito', prenda: { ...prenda, estado: 'Vendido' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/prendas/:id', (req, res) => {
  const { id } = req.params;
  const { codigo_barras, nombre, categoria, genero, precio, stock, usuario } = req.body;
  try {
    const stmt = db.prepare(
      'UPDATE prendas SET codigo_barras = ?, nombre = ?, categoria = ?, genero = ?, precio = ?, stock = ? WHERE id = ?'
    );
    const result = stmt.run(codigo_barras, nombre, categoria, genero, precio, stock, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Prenda no encontrada' });
    }

    registrarAuditoria(usuario, `Actualizó la prenda ID: ${id}`);
    res.json({ message: 'Prenda actualizada correctamente' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/prendas/:id', (req, res) => {
  const { id } = req.params;
  const usuario = req.headers['x-usuario'] || 'Sistema';
  try {
    const stmt = db.prepare('DELETE FROM prendas WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Prenda no encontrada' });
    }

    registrarAuditoria(usuario, `Eliminó la prenda ID: ${id}`);
    res.json({ message: 'Prenda eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE AUDITORÍA ---
app.get('/api/auditoria', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM auditoria_logs ORDER BY fecha DESC LIMIT 100').all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ZAFER corriendo en el puerto ${PORT}`);
});