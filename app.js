// PEGA AQUÍ LA URL COMPLETA DE TU WEB APP DE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbwIIgViY2Ri6dJ405xN-ypFh0duymToANtfZxDoWUU9GbD6JUxTw2YEGsVPXJYloc56/exec"; 

let viajesData = [];

document.addEventListener("DOMContentLoaded", () => {
    // Verificar sesión guardada
    if (sessionStorage.getItem('adminUnlocked') === 'true') {
        mostrarDashboard();
    }

    // Event Listener para Login
    document.getElementById('formLogin').addEventListener('submit', verificarPin);

    // Event Listeners para formularios
    document.getElementById('formNuevoViaje').addEventListener('submit', guardarNuevoViaje);
    document.getElementById('formEditarViaje').addEventListener('submit', guardarEdicionViaje);
    document.getElementById('formCobro').addEventListener('submit', guardarPagoCliente);
    document.getElementById('formPagoProv').addEventListener('submit', guardarPagoProveedor);

    // Auto-completar cliente al seleccionar folio
    document.querySelectorAll('.select-folios').forEach(select => {
        select.addEventListener('change', (e) => {
            const folioId = e.target.value;
            const viaje = viajesData.find(v => v.folio == folioId);
            if (viaje) {
                if(e.target.id === 'cobroFolio') document.getElementById('cobroCliente').value = viaje.cliente;
                if(e.target.id === 'provFolio') document.getElementById('provCliente').value = viaje.cliente;
            }
        });
    });
});

// --- AUTENTICACIÓN POR PIN ---

async function verificarPin(e) {
    e.preventDefault();
    const pin = document.getElementById('inputPin').value;
    const errorEl = document.getElementById('loginError');
    const btnLogin = document.getElementById('btnLogin');
    
    errorEl.classList.add('d-none');
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...';

    try {
        const res = await enviarPost('loginPin', { pin: pin });
        if (res && res.success) {
            sessionStorage.setItem('adminUnlocked', 'true');
            mostrarDashboard();
        } else {
            errorEl.innerText = (res && res.error) ? res.error : 'PIN incorrecto. Intenta de nuevo.';
            errorEl.classList.remove('d-none');
        }
    } catch (err) {
        console.error(err);
        errorEl.innerText = 'Error de conexión con la base de datos.';
        errorEl.classList.remove('d-none');
    } finally {
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Ingresar';
    }
}

function mostrarDashboard() {
    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('app-content').classList.remove('d-none');
    cargarDatos();
}

function cerrarSesion() {
    sessionStorage.removeItem('adminUnlocked');
    location.reload();
}

// --- CARGA DE DATOS ---

async function cargarDatos() {
    try {
        // Cargar Resumen
        const resResumen = await fetch(`${API_URL}?action=getResumen`);
        const dataResumen = await resResumen.json();
        
        document.getElementById('dashboard-resumen').innerHTML = `
            <div class="col-md-3 mb-3">
                <div class="card card-resumen bg-white p-4 h-100 border-start border-4 border-info">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-muted mb-0 fw-bold">VENTAS TOTALES</h6>
                        <i class="bi bi-graph-up-arrow text-info icon-large"></i>
                    </div>
                    <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.ventas || 0}</h3>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card card-resumen bg-white p-4 h-100 border-start border-4 border-success">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-muted mb-0 fw-bold">COBRADO</h6>
                        <i class="bi bi-wallet2 text-success icon-large"></i>
                    </div>
                    <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.recibido || 0}</h3>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card card-resumen bg-white p-4 h-100 border-start border-4 border-warning">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-muted mb-0 fw-bold">PAGADO A PROV.</h6>
                        <i class="bi bi-send-check text-warning icon-large"></i>
                    </div>
                    <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.pagado || 0}</h3>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card card-resumen bg-white p-4 h-100 border-start border-4 border-primary">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-muted mb-0 fw-bold">EN CAJA (RETENIDO)</h6>
                        <i class="bi bi-safe text-primary icon-large"></i>
                    </div>
                    <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.retenido || 0}</h3>
                </div>
            </div>
        `;

        // Cargar Viajes
        const resViajes = await fetch(`${API_URL}?action=getViajes`);
        const dataViajes = await resViajes.json();
        viajesData = dataViajes.data || [];
        
        let htmlTabla = '';
        let htmlOpciones = '<option value="">Selecciona un folio...</option>';

        if (viajesData.length === 0) {
            htmlTabla = `<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-3 d-block mb-2"></i>No hay registros de viajes activos</td></tr>`;
        } else {
            viajesData.forEach(v => {
                let fCliente = v.fechaCliente ? v.fechaCliente : '-';
                let fProv = v.fechaProveedor ? v.fechaProveedor : '-';

                htmlTabla += `
                    <tr class="clickable-row" ondblclick="verHistorial('${v.folio}')">
                        <td class="fw-bold text-primary">${v.folio}</td>
                        <td class="fw-semibold">${v.cliente}</td>
                        <td><i class="bi bi-geo-alt text-danger me-1"></i>${v.destino}</td>
                        <td class="text-secondary">$${v.totalViaje}</td>
                        <td class="text-danger fw-bold">$${v.faltaPagar}</td>
                        <td class="text-warning fw-bold">$${v.saldoProveedor}</td>
                        <td class="small text-muted"><i class="bi bi-calendar3 me-1"></i>${fCliente}</td>
                        <td class="small text-muted"><i class="bi bi-calendar3 me-1"></i>${fProv}</td>
                        <td class="text-center" onclick="event.stopPropagation()">
                            <button class="btn btn-sm btn-outline-warning me-1" title="Editar" onclick="abrirEditarModal('${v.folio}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="eliminarRegistroViaje('${v.folio}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>`;
                htmlOpciones += `<option value="${v.folio}">${v.folio} - ${v.cliente}</option>`;
            });
        }

        document.getElementById('tabla-viajes').innerHTML = htmlTabla;
        document.querySelectorAll('.select-folios').forEach(el => el.innerHTML = htmlOpciones);
    } catch (e) {
        console.error("Error cargando los datos:", e);
    }
}

// --- EDICIÓN Y ELIMINACIÓN ---

function abrirEditarModal(folio) {
    const viaje = viajesData.find(v => v.folio == folio);
    if (!viaje) return;

    document.getElementById('eFolio').value = viaje.folio;
    document.getElementById('eCliente').value = viaje.cliente;
    document.getElementById('eDestino').value = viaje.destino;
    document.getElementById('eProveedor').value = viaje.proveedor;
    document.getElementById('eTotal').value = viaje.totalViaje;
    document.getElementById('eCosto').value = viaje.costoProveedor || 0;

    const modal = new bootstrap.Modal(document.getElementById('modalEditarViaje'));
    modal.show();
}

async function guardarEdicionViaje(e) {
    e.preventDefault();
    const payload = {
        folio: document.getElementById('eFolio').value,
        cliente: document.getElementById('eCliente').value,
        destino: document.getElementById('eDestino').value,
        proveedor: document.getElementById('eProveedor').value,
        totalViaje: document.getElementById('eTotal').value,
        costoProveedor: document.getElementById('eCosto').value,
        fechaCliente: document.getElementById('eFechaC').value,
        fechaProveedor: document.getElementById('eFechaP').value
    };

    await enviarPost('editarViaje', payload);
    alert('Viaje actualizado correctamente.');
    location.reload();
}

async function eliminarRegistroViaje(folio) {
    if (confirm(`¿Estás seguro de que deseas eliminar el viaje con folio ${folio}?`)) {
        await enviarPost('eliminarViaje', { folio: folio });
        alert('Registro eliminado.');
        location.reload();
    }
}

// --- HISTORIAL Y GENERACIÓN DE TICKET PDF ---

async function verHistorial(folio) {
    document.getElementById('historialFolioText').innerText = folio;
    const modal = new bootstrap.Modal(document.getElementById('modalHistorial'));
    modal.show();

    document.getElementById('lista-historial').innerHTML = '<li class="list-group-item p-4 text-center"><div class="spinner-border text-primary" role="status"></div><br>Cargando movimientos...</li>';
    
    const res = await fetch(`${API_URL}?action=getHistorial&id=${folio}`);
    const data = await res.json();
    
    let html = '';
    if(!data.data || data.data.length === 0) {
        html = '<li class="list-group-item p-4 text-center text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No hay movimientos registrados.</li>';
    } else {
        data.data.forEach((pago) => {
            let esCliente = pago.tipo === 'Cliente';
            let colorMonto = esCliente ? 'text-success' : 'text-warning';
            let etiquetaIcono = esCliente ? 'bi-person-down text-success' : 'bi-building-up text-warning';
            let bgEtiqueta = esCliente ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-dark';
            let signo = esCliente ? '+' : '-';
            
            let botonPdf = esCliente ? 
                `<button class="btn btn-sm btn-outline-primary mt-2" onclick="generarTicketPdf('${pago.folio}', '${pago.cliente}', '${pago.concepto}', '${pago.monto}', '${pago.metodo}', '${pago.fecha}')">
                    <i class="bi bi-file-earmark-pdf me-1"></i> Ver Ticket PDF
                </button>` : '';

            html += `
            <li class="list-group-item p-3 d-flex justify-content-between align-items-center">
                <div>
                    <strong class="d-block text-dark">${pago.concepto}</strong>
                    <span class="badge ${bgEtiqueta} border-0 mb-1 rounded-pill"><i class="bi ${etiquetaIcono} me-1"></i>${pago.tipo}</span>
                    <br><small class="text-muted"><i class="bi bi-calendar me-1"></i>${pago.fecha} &bull; <i class="bi bi-credit-card me-1"></i>${pago.metodo}</small>
                    <br>${botonPdf}
                </div>
                <h5 class="mb-0 fw-bold ${colorMonto}">${signo}$${pago.monto}</h5>
            </li>`;
        });
    }
    document.getElementById('lista-historial').innerHTML = html;
}

function generarTicketPdf(folio, cliente, concepto, monto, metodo, fecha) {
    const ventana = window.open('', '_blank');
    ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket de Pago - ${folio}</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #333; max-width: 450px; margin: auto; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 15px; margin-bottom: 20px; }
                .header h2 { margin: 0; color: #2c5364; }
                .header p { margin: 5px 0 0 0; font-size: 14px; color: #777; }
                .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; }
                .label { color: #666; font-weight: bold; }
                .value { font-weight: 500; text-align: right; }
                .total-box { background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center; margin-top: 20px; }
                .total-title { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
                .total-amount { font-size: 26px; color: #27ae60; font-weight: bold; margin-top: 5px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 15px; }
                @media print {
                    body { border: none; box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>AGENCIA DE VIAJES</h2>
                <p>Comprobante Oficial de Pago</p>
            </div>
            <div class="row"><span class="label">Folio del Viaje:</span><span class="value">${folio}</span></div>
            <div class="row"><span class="label">Fecha:</span><span class="value">${fecha}</span></div>
            <div class="row"><span class="label">Cliente:</span><span class="value">${cliente}</span></div>
            <div class="row"><span class="label">Concepto:</span><span class="value">${concepto}</span></div>
            <div class="row"><span class="label">Método de Pago:</span><span class="value">${metodo}</span></div>
            
            <div class="total-box">
                <div class="total-title">Monto Recibido</div>
                <div class="total-amount">$${monto}</div>
            </div>

            <div class="footer">
                ¡Gracias por tu preferencia!<br>Conserva este ticket para cualquier aclaración.
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    ventana.document.close();
}

// --- UTILIDADES POST ---

async function enviarPost(action, payload) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: action, payload: payload })
    });
    return response.json();
}

async function guardarNuevoViaje(e) {
    e.preventDefault();
    const payload = {
        folio: document.getElementById('vFolio').value,
        cliente: document.getElementById('vCliente').value,
        destino: document.getElementById('vDestino').value,
        proveedor: document.getElementById('vProveedor').value,
        totalViaje: document.getElementById('vTotal').value,
        costoProveedor: document.getElementById('vCosto').value,
        fechaCliente: document.getElementById('vFechaC').value,
        fechaProveedor: document.getElementById('vFechaP').value
    };
    await enviarPost('nuevoViaje', payload);
    alert('Viaje aperturado con éxito.');
    location.reload(); 
}

async function guardarPagoCliente(e) {
    e.preventDefault();
    const payload = {
        folio: document.getElementById('cobroFolio').value,
        cliente: document.getElementById('cobroCliente').value,
        monto: document.getElementById('cobroMonto').value,
        concepto: document.getElementById('cobroConcepto').value,
        metodo: document.getElementById('cobroMetodo').value
    };
    await enviarPost('pagoCliente', payload);
    alert('Cobro a cliente registrado correctamente.');
    location.reload();
}

async function guardarPagoProveedor(e) {
    e.preventDefault();
    const payload = {
        folio: document.getElementById('provFolio').value,
        cliente: document.getElementById('provCliente').value,
        monto: document.getElementById('provMonto').value,
        concepto: document.getElementById('provConcepto').value,
        metodo: document.getElementById('provMetodo').value
    };
    await enviarPost('pagoProveedor', payload);
    alert('Pago a proveedor registrado correctamente.');
    location.reload();
}
