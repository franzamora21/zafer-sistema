// Inicialización de la base de datos (creación de tablas)
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
    stock INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS auditoria_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT,
    accion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Asegurar columna stock si la tabla ya existía previamente sin ella
try {
  db.exec(`ALTER TABLE prendas ADD COLUMN stock INTEGER DEFAULT 0;`);
} catch (e) {
  // Si la columna ya existe, se ignora el error automáticamente
}