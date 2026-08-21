// AQUI PEGA TU URL IMPLEMENTADA DE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbwIIgViY2Ri6dJ405xN-ypFh0duymToANtfZxDoWUU9GbD6JUxTw2YEGsVPXJYloc56/exec"; 

let viajesData = [];
let proveedoresData = [];

document.addEventListener("DOMContentLoaded", () => {
    // Verificar sesión previa
    if (sessionStorage.getItem('adminUnlocked') === 'true') {
        mostrarDashboard();
    }

    // Event Listener para Login
    document.getElementById('formLogin').addEventListener('submit', verificarPin);

    // Event Listeners para formularios de viajes
    document.getElementById('formNuevoViaje').addEventListener('submit', guardarNuevoViaje);
    document.getElementById('formEditarViaje').addEventListener('submit', guardarEdicionViaje);
    document.getElementById('formCobro').addEventListener('submit', guardarPagoCliente);
    document.getElementById('formPagoProv').addEventListener('submit', guardarPagoProveedor);
    document.getElementById('formEditarPago').addEventListener('submit', guardarEdicionPago);
    
    // Event Listeners para Proveedores
    document.getElementById('formNuevoProveedor').addEventListener('submit', guardarNuevoProveedor);
    document.getElementById('formEditarProveedor').addEventListener('submit', guardarEdicionProveedor);

    // Buscadores (Filtros)
    document.getElementById('buscarPendientes').addEventListener('input', function() {
        filtrarTabla('tabla-viajes', this.value);
    });
    document.getElementById('buscarCompletados').addEventListener('input', function() {
        filtrarTabla('tabla-viajes-completados', this.value);
    });
    document.getElementById('buscarProveedores').addEventListener('input', function() {
        filtrarTabla('tabla-proveedores', this.value);
    });

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

// --- LÓGICA DE FILTRADO ---
function filtrarTabla(idTabla, texto) {
    const filas = document.getElementById(idTabla).getElementsByTagName('tr');
    const filtro = texto.toLowerCase();
    for (let i = 0; i < filas.length; i++) {
        const contenido = filas[i].textContent.toLowerCase();
        filas[i].style.display = contenido.includes(filtro) ? '' : 'none';
    }
}

function formatoFechaLimpia(strFecha) {
    if (!strFecha) return "";
    if (strFecha.includes('T')) strFecha = strFecha.split('T')[0];
    if (strFecha.includes(' ')) strFecha = strFecha.split(' ')[0];
    
    let partes = strFecha.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return strFecha;
}

function formatoParaInputDate(strFecha) {
    if (!strFecha) return "";
    let partes = strFecha.split('/');
    if (partes.length === 3 && partes[2].length === 4) {
        return `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
    }
    return strFecha;
}

// --- AUTENTICACIÓN ---

async function verificarPin(e) {
    e.preventDefault();
    const pin = document.getElementById('inputPin').value;
    const errorEl = document.getElementById('loginError');
    const btnLogin = document.getElementById('btnLogin');
    
    errorEl.classList.add('d-none');
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Validando...';

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
        btnLogin.innerHTML = '<i class="bi bi-shield-lock-fill me-2"></i>Ingresar al Panel';
    }
}

function mostrarDashboard() {
    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('app-content').classList.remove('d-none');
    cargarDatos();
    cargarProveedores();
}

function cerrarSesion() {
    sessionStorage.removeItem('adminUnlocked');
    location.reload();
}

// --- CARGA DE DATOS Y RENDERIZADO ---

async function cargarDatos() {
    try {
        const resResumen = await fetch(`${API_URL}?action=getResumen`);
        const dataResumen = await resResumen.json();
        
        document.getElementById('dashboard-resumen').innerHTML = `
            <div class="col-md-3 mb-3">
                <div class="card card-resumen p-4 h-100 border-start border-4" style="border-color: #5B8A88 !important;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-muted mb-0 fw-bold small">VENTAS TOTALES</h6>
                        <i class="bi bi-graph-up-arrow fs-3" style="color: #5B8A88;"></i>
                    </div>
                    <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.ventas || 0}</h3>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card card-resumen p-4 h-100 border-start border-4" style="border-color: #2D4341 !important;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-muted mb-0 fw-bold small">TOTAL COBRADO</h6>
                        <i class="bi bi-wallet2 fs-3" style="color: #2D4341;"></i>
                    </div>
                    <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.recibido || 0}</h3>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card card-resumen p-4 h-100 border-start border-4" style="border-color: #C5AA83 !important;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-muted mb-0 fw-bold small">PAGADO A PROVEEDOR</h6>
                        <i class="bi bi-send-check fs-3" style="color: #C5AA83;"></i>
                    </div>
                    <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.pagado || 0}</h3>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card card-resumen p-4 h-100 border-start border-4" style="border-color: #7A9F9C !important;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-muted mb-0 fw-bold small">EN CAJA (RETENIDO)</h6>
                        <i class="bi bi-safe fs-3" style="color: #7A9F9C;"></i>
                    </div>
                    <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.retenido || 0}</h3>
                </div>
            </div>
        `;

        const resViajes = await fetch(`${API_URL}?action=getViajes`);
        const dataViajes = await resViajes.json();
        viajesData = dataViajes.data || [];
        
        let htmlPendientes = '';
        let htmlCompletados = '';
        let htmlOpciones = '<option value="">Selecciona un folio...</option>';

        viajesData.forEach(v => {
            let fCliente = v.fechaCliente ? v.fechaCliente : '-';
            let fProv = v.fechaProveedor ? v.fechaProveedor : '-';
            
            let fila = `
                <tr class="clickable-row" ondblclick="verHistorial('${v.folio}')">
                    <td class="fw-bold" style="color: var(--ve-teal);">${v.folio}</td>
                    <td class="fw-semibold">${v.cliente}</td>
                    <td><i class="bi bi-geo-alt me-1" style="color: var(--ve-sand);"></i>${v.destino}</td>
                    <td class="text-secondary">$${v.totalViaje}</td>
                    <td class="text-danger fw-bold">$${v.faltaPagar}</td>
                    <td class="fw-bold" style="color: var(--ve-sand);">$${v.saldoProveedor}</td>
                    <td class="small text-muted"><i class="bi bi-calendar3 me-1"></i>${fCliente}</td>
                    <td class="small text-muted"><i class="bi bi-calendar3 me-1"></i>${fProv}</td>
                    <td class="text-center" onclick="event.stopPropagation()">
                        ${v.estado === 'Pendiente' ? `
                        <button class="btn btn-sm btn-outline-warning me-1 mb-1" title="Editar" onclick="abrirEditarModal('${v.folio}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary me-1 mb-1" title="Cancelar Viaje" onclick="cancelarRegistroViaje('${v.folio}')">
                            <i class="bi bi-x-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger mb-1" title="Eliminar" onclick="eliminarRegistroViaje('${v.folio}')">
                            <i class="bi bi-trash"></i>
                        </button>` : `<span class="badge ${v.estado === 'Cancelado' ? 'bg-danger' : 'bg-success'}">${v.estado}</span>`}
                    </td>
                </tr>`;

            if (v.estado === 'Pendiente') {
                htmlPendientes += fila;
                htmlOpciones += `<option value="${v.folio}">${v.folio} - ${v.cliente}</option>`;
            } else {
                htmlCompletados += fila;
            }
        });

        if (htmlPendientes === '') htmlPendientes = `<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No hay registros de viajes pendientes</td></tr>`;
        if (htmlCompletados === '') htmlCompletados = `<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-check-circle fs-2 d-block mb-2"></i>No hay viajes completados ni cancelados</td></tr>`;

        document.getElementById('tabla-viajes').innerHTML = htmlPendientes;
        document.getElementById('tabla-viajes-completados').innerHTML = htmlCompletados;
        document.querySelectorAll('.select-folios').forEach(el => el.innerHTML = htmlOpciones);
    } catch (e) {
        console.error("Error cargando datos:", e);
    }
}

async function cargarProveedores() {
    try {
        const res = await fetch(`${API_URL}?action=getProveedores`);
        const data = await res.json();
        proveedoresData = data.data || [];
        
        let htmlTabla = '';
        let htmlSelect = '<option value="">Selecciona un proveedor...</option>';

        if (proveedoresData.length === 0) {
            htmlTabla = `<tr><td colspan="4" class="text-center py-4 text-muted">No hay proveedores registrados</td></tr>`;
        } else {
            proveedoresData.forEach(p => {
                htmlTabla += `
                    <tr>
                        <td class="fw-bold">${p.nombre}</td>
                        <td>${p.telefono}</td>
                        <td>${p.correo}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-warning me-1" title="Editar" onclick="abrirEditarProveedor('${p.id}')"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="eliminarProveedor('${p.id}')"><i class="bi bi-trash"></i></button>
                        </td>
                    </tr>`;
                htmlSelect += `<option value="${p.nombre}">${p.nombre}</option>`;
            });
        }
        
        document.getElementById('tabla-proveedores').innerHTML = htmlTabla;
        document.querySelectorAll('.select-proveedor').forEach(select => select.innerHTML = htmlSelect);

    } catch(e) {
        console.error("Error cargando proveedores:", e);
    }
}

// --- EDICIÓN, CANCELACIÓN Y ELIMINACIÓN DE VIAJES ---

function abrirEditarModal(folio) {
    const viaje = viajesData.find(v => v.folio == folio);
    if (!viaje) return;

    document.getElementById('eFolio').value = viaje.folio;
    document.getElementById('eCliente').value = viaje.cliente;
    document.getElementById('eDestino').value = viaje.destino;
    document.getElementById('eProveedor').value = viaje.proveedor;
    document.getElementById('eTotal').value = viaje.totalViaje;
    document.getElementById('eCosto').value = viaje.costoProveedor || 0;
    document.getElementById('eFechaC').value = formatoParaInputDate(viaje.fechaCliente);
    document.getElementById('eFechaP').value = formatoParaInputDate(viaje.fechaProveedor);

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
        fechaCliente: formatoFechaLimpia(document.getElementById('eFechaC').value),
        fechaProveedor: formatoFechaLimpia(document.getElementById('eFechaP').value)
    };

    const res = await enviarPost('editarViaje', payload);
    if (res && res.success) {
        alert('Viaje actualizado correctamente.');
        location.reload();
    } else {
        alert('Error al actualizar viaje: ' + (res && res.error ? res.error : 'Ocurrió un error.'));
    }
}

async function cancelarRegistroViaje(folio) {
    if (confirm(`¿Estás seguro de que deseas CANCELAR el viaje con folio ${folio}?`)) {
        const res = await enviarPost('cancelarViaje', { folio: folio });
        if (res && res.success) {
            alert('Viaje marcado como cancelado.');
            location.reload();
        }
    }
}

async function eliminarRegistroViaje(folio) {
    if (confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente el viaje con folio ${folio}?`)) {
        const res = await enviarPost('eliminarViaje', { folio: folio });
        if (res && res.success) {
            alert('Registro eliminado.');
            location.reload();
        }
    }
}

// --- CRUD PROVEEDORES ---

async function guardarNuevoProveedor(e) {
    e.preventDefault();
    const payload = {
        nombre: document.getElementById('pNombre').value,
        telefono: document.getElementById('pTelefono').value,
        correo: document.getElementById('pCorreo').value
    };
    
    const res = await enviarPost('nuevoProveedor', payload);
    if (res && res.success) {
        alert('Proveedor guardado exitosamente en la base de datos.');
        location.reload();
    } else {
        alert('Error al guardar el proveedor: ' + (res && res.error ? res.error : 'Ocurrió un problema de conexión.'));
    }
}

function abrirEditarProveedor(id) {
    const prov = proveedoresData.find(p => p.id == id);
    if (!prov) return;
    
    document.getElementById('epId').value = prov.id;
    document.getElementById('epNombre').value = prov.nombre;
    document.getElementById('epTelefono').value = prov.telefono;
    document.getElementById('epCorreo').value = prov.correo;
    
    const modal = new bootstrap.Modal(document.getElementById('modalEditarProveedor'));
    modal.show();
}

async function guardarEdicionProveedor(e) {
    e.preventDefault();
    const payload = {
        id: document.getElementById('epId').value,
        nombre: document.getElementById('epNombre').value,
        telefono: document.getElementById('epTelefono').value,
        correo: document.getElementById('epCorreo').value
    };
    
    const res = await enviarPost('editarProveedor', payload);
    if (res && res.success) {
        alert('Proveedor actualizado correctamente.');
        location.reload();
    } else {
        alert('Error al actualizar proveedor: ' + (res && res.error ? res.error : 'Ocurrió un problema.'));
    }
}

async function eliminarProveedor(id) {
    if (confirm(`¿Deseas eliminar a este proveedor?`)) {
        const res = await enviarPost('eliminarProveedor', { id: id });
        if (res && res.success) {
            alert('Proveedor eliminado.');
            location.reload();
        }
    }
}

// --- HISTORIAL, EDICIÓN DE PAGOS Y TICKET PDF ---

async function verHistorial(folio) {
    document.getElementById('historialFolioText').innerText = folio;
    const modal = new bootstrap.Modal(document.getElementById('modalHistorial'));
    modal.show();

    document.getElementById('lista-historial').innerHTML = '<li class="list-group-item p-4 text-center"><div class="spinner-border text-success" role="status"></div><br>Cargando movimientos...</li>';
    
    const res = await fetch(`${API_URL}?action=getHistorial&id=${folio}`);
    const data = await res.json();
    
    let html = '';
    if(!data.data || data.data.length === 0) {
        html = '<li class="list-group-item p-4 text-center text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No hay pagos registrados para este viaje.</li>';
    } else {
        data.data.forEach((pago) => {
            let esCliente = pago.tipo === 'Cliente';
            let colorMonto = esCliente ? 'text-success' : 'text-warning';
            let bgEtiqueta = esCliente ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-dark';
            let signo = esCliente ? '+' : '-';
            
            let botonPdf = esCliente ? 
                `<button class="btn btn-sm btn-outline-primary mt-2 me-1" onclick="generarTicketPdf('${pago.folio}', '${pago.cliente}', '${pago.concepto}', '${pago.monto}', '${pago.metodo}', '${pago.fecha}')">
                    <i class="bi bi-file-earmark-pdf me-1"></i> Ver Ticket PDF
                </button>` : '';

            // Botones añadidos para editar o eliminar pago
            let botonesAccion = `
                <div class="mt-2 text-end">
                    <button class="btn btn-sm btn-outline-warning py-0 px-2 me-1" onclick="abrirEditarPago('${pago.tipo}', ${pago.fila}, '${pago.folio}', '${pago.concepto}', ${pago.monto}, '${pago.metodo}')" title="Editar Pago"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="eliminarPagoRegistro('${pago.tipo}', ${pago.fila}, '${pago.folio}')" title="Eliminar Pago"><i class="bi bi-trash"></i></button>
                </div>
            `;

            html += `
            <li class="list-group-item p-3 d-flex justify-content-between align-items-center">
                <div>
                    <strong class="d-block text-dark">${pago.concepto}</strong>
                    <span class="badge ${bgEtiqueta} border-0 mb-1 rounded-pill">${pago.tipo}</span>
                    <br><small class="text-muted"><i class="bi bi-calendar me-1"></i>${pago.fecha} &bull; <i class="bi bi-credit-card me-1"></i>${pago.metodo}</small>
                    <br>${botonPdf}
                </div>
                <div class="text-end">
                    <h5 class="mb-0 fw-bold ${colorMonto}">${signo}$${pago.monto}</h5>
                    ${botonesAccion}
                </div>
            </li>`;
        });
    }
    document.getElementById('lista-historial').innerHTML = html;
}

function abrirEditarPago(tipo, fila, folio, concepto, monto, metodo) {
    document.getElementById('epagoTipo').value = tipo;
    document.getElementById('epagoFila').value = fila;
    document.getElementById('epagoFolio').value = folio;
    document.getElementById('epagoConcepto').value = concepto;
    document.getElementById('epagoMonto').value = monto;
    document.getElementById('epagoMetodo').value = metodo;
    
    const modal = new bootstrap.Modal(document.getElementById('modalEditarPago'));
    modal.show();
}

async function guardarEdicionPago(e) {
    e.preventDefault();
    const payload = {
        tipo: document.getElementById('epagoTipo').value,
        fila: document.getElementById('epagoFila').value,
        folio: document.getElementById('epagoFolio').value,
        concepto: document.getElementById('epagoConcepto').value,
        monto: document.getElementById('epagoMonto').value,
        metodo: document.getElementById('epagoMetodo').value
    };
    
    const res = await enviarPost('editarPago', payload);
    if (res && res.success) {
        bootstrap.Modal.getInstance(document.getElementById('modalEditarPago')).hide();
        verHistorial(payload.folio); 
        cargarDatos(); 
    } else {
        alert('Error al actualizar pago.');
    }
}

async function eliminarPagoRegistro(tipo, fila, folio) {
    if (confirm('¿Estás seguro de que deseas eliminar este pago? Los saldos se recalcularán automáticamente.')) {
        const res = await enviarPost('eliminarPago', { tipo: tipo, fila: fila, folio: folio });
        if (res && res.success) {
            verHistorial(folio);
            cargarDatos();
        } else {
            alert('Error al eliminar pago.');
        }
    }
}

function generarTicketPdf(folio, cliente, concepto, monto, metodo, fecha) {
    const ventana = window.open('', '_blank');
    ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comprobante de Pago - ${folio}</title>
            <style>
                body { 
                    font-family: 'Helvetica Neue', Arial, sans-serif; 
                    padding: 40px 30px; 
                    color: #2D3A3A; 
                    max-width: 480px; 
                    margin: auto; 
                    background-color: #FFFFFF;
                }
                .ticket-card {
                    border: 2px solid #C5AA83;
                    border-radius: 16px;
                    padding: 30px;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
                }
                .header { text-align: center; border-bottom: 2px dashed #C5AA83; padding-bottom: 20px; margin-bottom: 25px; }
                .brand-title { font-size: 22px; font-weight: bold; color: #5B8A88; margin: 10px 0 2px 0; letter-spacing: 1px; }
                .tagline { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #C5AA83; font-weight: bold; margin-bottom: 10px; }
                .subtitle { font-size: 13px; color: #6B7C7B; font-weight: 500; }
                
                .row { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 14px; }
                .label { color: #6B7C7B; font-weight: bold; }
                .value { font-weight: 600; text-align: right; color: #2D3A3A; }
                
                .total-box { 
                    background: #F7F5F0; 
                    border: 1px solid #E8DCB8;
                    border-radius: 12px; 
                    padding: 18px; 
                    text-align: center; 
                    margin-top: 25px; 
                }
                .total-title { font-size: 11px; color: #6B7C7B; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
                .total-amount { font-size: 30px; color: #5B8A88; font-weight: bold; margin-top: 5px; }
                
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #8C9B9A; border-top: 1px solid #F0ECE1; padding-top: 15px; }
                
                @media print {
                    body { padding: 0; background: white; }
                    .ticket-card { border: none; box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="ticket-card">
                <div class="header">
                    <div style="display:flex; justify-content:center; margin-bottom: 15px;">
                        <img src="https://lh3.googleusercontent.com/d/1ApOiGW9GcvtP__t9hXkl7OSjrzF_Hwt1" alt="Vania Escapes Logo" style="width: 120px; border-radius: 8px;">
                    </div>
                    
                    <div class="brand-title">VANIA ESCAPES</div>
                    <div class="tagline">TU VIAJE SEGURO, TU MENTE TRANQUILA</div>
                    <div class="subtitle">Comprobante Oficial de Pago</div>
                </div>

                <div class="row"><span class="label">Folio del Viaje:</span><span class="value">${folio}</span></div>
                <div class="row"><span class="label">Fecha de Pago:</span><span class="value">${fecha}</span></div>
                <div class="row"><span class="label">Cliente:</span><span class="value">${cliente}</span></div>
                <div class="row"><span class="label">Concepto:</span><span class="value">${concepto}</span></div>
                <div class="row"><span class="label">Método de Pago:</span><span class="value">${metodo}</span></div>
                
                <div class="total-box">
                    <div class="total-title">Monto Recibido</div>
                    <div class="total-amount">$${monto}</div>
                </div>

                <div class="footer">
                    ¡Gracias por elegir Vania Escapes!<br>Conserva este comprobante para cualquier duda o aclaración.
                </div>
            </div>

            <script>
                window.onload = function() { 
                    setTimeout(function() { window.print(); }, 300);
                }
            </script>
        </body>
        </html>
    `);
    ventana.document.close();
}

// --- PETICIONES API ---

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
        fechaCliente: formatoFechaLimpia(document.getElementById('vFechaC').value),
        fechaProveedor: formatoFechaLimpia(document.getElementById('vFechaP').value)
    };
    const res = await enviarPost('nuevoViaje', payload);
    if (res && res.success) {
        alert('Viaje guardado exitosamente.');
        location.reload(); 
    }
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
    const res = await enviarPost('pagoCliente', payload);
    if (res && res.success) {
        alert('Cobro registrado correctamente.');
        location.reload();
    }
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
    const res = await enviarPost('pagoProveedor', payload);
    if (res && res.success) {
        alert('Pago a proveedor registrado.');
        location.reload();
    }
}
