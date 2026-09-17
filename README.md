# ZAFER - Sistema de Inventario y Ventas

Sistema web para la tienda **ZAFER** con control de prendas vendidas y en stock, generación e impresión de códigos de barras únicos (compatibles con lector óptico), inicio de sesión restringido, auditoría de usuarios y copias de seguridad automáticas.

## Estructura del Proyecto

```
zafer-sistema/
├── package.json
├── server.js
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── README.md
```

## Usuarios Autorizados
El acceso está estrictamente limitado a 3 usuarios:

1. **kevinzafer** - Contraseña: `222026`
2. **elsazafer** - Contraseña: `196312`
3. **tanozafer** - Contraseña: `196313`

## Instrucciones de Instalación y Ejecución

1. Asegúrate de tener instalado [Node.js](https://nodejs.org/).
2. Descomprime este archivo en una carpeta.
3. Abre una terminal o consola de comandos en la carpeta del proyecto.
4. Ejecuta el siguiente comando para instalar las dependencias:
   ```bash
   npm install
   ```
5. Inicia el servidor ejecutando:
   ```bash
   npm start
   ```
   o
   ```bash
   node server.js
   ```
6. Abre tu navegador web e ingresa a: **http://localhost:3000**

## Funcionalidades Incluidas
- **Login Seguro:** Validación mediante contraseña encriptada (bcrypt) para los 3 usuarios.
- **Auditoría / Logs:** Registro en SQLite de qué usuario realizó cada cambio o si ocurrió un error.
- **Códigos de Barras Únicos:** Generación con formato CODE128 único por prenda (prefijo `ZAF` + timestamp).
- **Lectura por Escáner:** Soporta el ingreso mediante lectoras de código de barras físicas.
- **Backups Automáticos:** En cada venta o registro de prenda se crea un archivo de respaldo `.db` dentro de la carpeta `backups/`.
