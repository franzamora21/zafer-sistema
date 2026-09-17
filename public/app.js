let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('login-user').value.trim();
            const password = document.getElementById('login-pass').value.trim();
            const errorMsg = document.getElementById('login-error');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok) {
                    currentUser = data.username;
                    document.getElementById('user-display').innerText = currentUser;
                    document.getElementById('login-screen').classList.add('hidden');
                    document.getElementById('app-screen').classList.remove('hidden');
                    
                    cargarPrendas('todas');
                } else {
                    errorMsg.innerText = data.error || 'Credenciales incorrectas';
                }
            } catch (err) {
                errorMsg.innerText = 'Error al conectar con el servidor';
            }
        });
    }

    const formPrenda = document.getElementById('form-prenda');
    if (formPrenda) {
        formPrenda.addEventListener('submit', registrarPrenda);
    }

    const barcodeScannerInput = document.getElementById('barcode-scanner');
    if (barcodeScannerInput) {
        barcodeScannerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                registrarVenta();
            }
        });
    }
});

function logout() {
    location.reload();
}

async function registrarPrenda(event) {
    event.preventDefault();

    const nombre = document.getElementById('nombre-prenda').value.trim();
    const categoria = document.getElementById('categoria-prenda').value;
    const genero = document.getElementById('genero-prenda').value;
    const precio = parseFloat(document.getElementById('precio-prenda').value);

    try {
        const res = await fetch('/api/prendas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, categoria, genero, precio, usuario: currentUser })
        });

        const data = await res.json();

        if (res.ok) {
            document.getElementById('form-prenda').reset();
            
            const barcodeResult = document.getElementById('barcode-result');
            const barcodeValue = document.getElementById('barcode-value');
            
            barcodeResult.classList.remove('hidden');
            barcodeValue.innerText = data.codigo_barras;

            JsBarcode("#barcode", data.codigo_barras, {
                format: "CODE128",
                lineColor: "#000",
                width: 2,
                height: 60,
                displayValue: true
            });

            cargarPrendas('todas');
        } else {
            alert(data.error || 'Error al registrar la prenda');
        }
    } catch (err) {
        alert('Error de conexión al registrar prenda');
    }
}

async function cargarPrendas(filtro) {
    let url = '/api/prendas';
    if (filtro === 'disponible') url += '?estado=disponible';
    if (filtro === 'vendido') url += '?estado=vendido';

    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    const btnActive = document.getElementById(`filter-${filtro}`);
    if (btnActive) btnActive.classList.add('active');

    try {
        const res = await fetch(url);
        const prendas = await res.json();
        const tbody = document.getElementById('tabla-prendas');
        tbody.innerHTML = '';

        prendas.forEach(p => {
            const tr = document.createElement('tr');
            const estadoTexto = p.vendido === 1 ? 'Vendido' : 'Disponible';
            const estadoClase = p.vendido === 1 ? 'badge-vendido' : 'badge-disponible';

            tr.innerHTML = `
                <td><strong>${p.codigo_barras}</strong></td>
                <td>${p.nombre}</td>
                <td>${p.categoria}</td>
                <td>${p.genero}</td>
                <td>S/ ${p.precio.toFixed(2)}</td>
                <td><span class="${estadoClase}">${estadoTexto}</span></td>
                <td>${p.usuario || 'Sistema'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error al cargar inventario:', err);
    }
}

async function registrarVenta() {
    const inputScanner = document.getElementById('barcode-scanner');
    const statusMsg = document.getElementById('scan-status');
    const codigo_barras = inputScanner.value.trim();

    if (!codigo_barras) {
        statusMsg.style.color = '#d9534f';
        statusMsg.innerText = 'Por favor, ingrese o escanee un código de barras.';
        return;
    }

    try {
        const res = await fetch('/api/prendas/vender', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo_barras, usuario: currentUser })
        });

        const data = await res.json();

        if (res.ok) {
            statusMsg.style.color = '#28a745';
            statusMsg.innerText = `¡Venta registrada con éxito! (Código: ${codigo_barras})`;
            inputScanner.value = '';
            inputScanner.focus();
            
            cargarPrendas('todas');
        } else {
            statusMsg.style.color = '#d9534f';
            statusMsg.innerText = data.error || 'Prenda no encontrada o ya vendida';
        }
    } catch (err) {
        statusMsg.style.color = '#d9534f';
        statusMsg.innerText = 'Error de conexión al procesar venta';
    }
}