// Función para generar la boleta de venta en formato formal tipo ticket/comprobante
function generarBoletaVenta(prenda) {
  const ventanaBoleta = window.open('', '_blank', 'width=800,height=600');
  
  const htmlBoleta = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Boleta de Venta - ZAFER</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; background: #f9f9f9; }
        .boleta-container { max-width: 600px; margin: auto; background: #fff; border: 1px solid #ccc; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
        .header h2 { margin: 0; color: #1e293b; }
        .header p { margin: 4px 0; font-size: 13px; color: #555; }
        .info-empresa { margin-bottom: 20px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
        th { background-color: #f1f5f9; color: #1e293b; }
        .total-section { text-align: right; font-size: 15px; font-weight: bold; margin-bottom: 20px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; border-top: 1px dashed #ccc; padding-top: 10px; }
        .no-print { text-align: center; margin-top: 20px; }
        .btn-print { padding: 10px 20px; background: #1e293b; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .btn-print:hover { background: #334155; }
        @media print {
          body { background: #fff; padding: 0; }
          .boleta-container { border: none; box-shadow: none; padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="boleta-container">
        <div class="header">
          <h2>SISTEMA ZAFER E.I.R.L.</h2>
          <p>RUC: 20600000001</p>
          <p>Jr. Comercial 123 - Lima, Perú</p>
          <h3 style="margin-top: 10px;">BOLETA DE VENTA ELECTRÓNICA</h3>
          <p><strong>N° B001 - 0000' + Math.floor(1000 + Math.random() * 9000) + '</strong></p>
        </div>

        <div class="info-empresa">
          <p><strong>Fecha y Hora:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Condición de Pago:</strong> Contado</p>
          <p><strong>Cajero / Usuario:</strong> ${localStorage.getItem('usuario') || 'Sistema'}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Código de Barras</th>
              <th>Descripción de Prenda</th>
              <th>Categoría / Género</th>
              <th>P. Unitario</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${prenda.codigo_barras}</td>
              <td>${prenda.nombre}</td>
              <td>${prenda.categoria} (${prenda.genero})</td>
              <td>S/ ${Number(prenda.precio).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-section">
          <p>IMPORTE TOTAL: S/ ${Number(prenda.precio).toFixed(2)}</p>
        </div>

        <div class="footer">
          <p>¡Gracias por su preferencia en ZAFER!</p>
          <p>Representación impresa de la Boleta de Venta Electrónica.</p>
        </div>

        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
        </div>
      </div>
    </body>
    </html>
  `;

  ventanaBoleta.document.write(htmlBoleta);
  ventanaBoleta.document.close();
}

// Ejemplo de integración al registrar venta en tu interfaz (asegúrate de llamarla al recibir la respuesta exitosa del servidor):
// fetch('/api/ventas', { method: 'POST', ... })
//   .then(res => res.json())
//   .then(data => {
//      if(data.prenda) { generarBoletaVenta(data.prenda); cargarInventario(); }
//   });