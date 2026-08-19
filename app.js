// AQUI PEGA LA URL QUE COPIASTE DE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbwIIgViY2Ri6dJ405xN-ypFh0duymToANtfZxDoWUU9GbD6JUxTw2YEGsVPXJYloc56/exec"; 

let viajesData = [];

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    // Event Listeners para formularios
    document.getElementById('formNuevoViaje').addEventListener('submit', guardarNuevoViaje);
    document.getElementById('formCobro').addEventListener('submit', guardarPagoCliente);
    document.getElementById('formPagoProv').addEventListener('submit', guardarPagoProveedor);

    // Auto-completar nombre de cliente al seleccionar folio en combos
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

async function cargarDatos() {
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
                <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.ventas}</h3>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card card-resumen bg-white p-4 h-100 border-start border-4 border-success">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="text-muted mb-0 fw-bold">COBRADO</h6>
                    <i class="bi bi-wallet2 text-success icon-large"></i>
                </div>
                <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.recibido}</h3>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card card-resumen bg-white p-4 h-100 border-start border-4 border-warning">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="text-muted mb-0 fw-bold">PAGADO A PROV.</h6>
                    <i class="bi bi-send-check text-warning icon-large"></i>
                </div>
                <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.pagado}</h3>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card card-resumen bg-white p-4 h-100 border-start border-4 border-primary">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="text-muted mb-0 fw-bold">EN CAJA (RETENIDO)</h6>
                    <i class="bi bi-safe text-primary icon-large"></i>
                </div>
                <h3 class="fw-bold text-dark text-start mb-0">$${dataResumen.retenido}</h3>
            </div>
        </div>
    `;

    // Cargar Viajes
    const resViajes = await fetch(`${API_URL}?action=getViajes`);
    const dataViajes = await resViajes.json();
    viajesData = dataViajes.data;
    
    let htmlTabla = '';
    let htmlOpciones = '<option value="">Selecciona un folio...</option>';

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
            </tr>`;
        htmlOpciones += `<option value="${v.folio}">${v.folio} - ${v.cliente}</option>`;
    });

    document.getElementById('tabla-viajes').innerHTML = htmlTabla;
    document.querySelectorAll('.select-folios').forEach(el => el.innerHTML = htmlOpciones);
}

async function verHistorial(folio) {
    document.getElementById('historialFolioText').innerText = folio;
    const modal = new bootstrap.Modal(document.getElementById('modalHistorial'));
    modal.show();

    document.getElementById('lista-historial').innerHTML = '<li class="list-group-item p-4 text-center"><div class="spinner-border text-primary" role="status"></div><br>Cargando movimientos...</li>';
    
    const res = await fetch(`${API_URL}?action=getHistorial&id=${folio}`);
    const data = await res.json();
    
    let html = '';
    if(data.data.length === 0) {
        html = '<li class="list-group-item p-4 text-center text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No hay movimientos registrados.</li>';
    } else {
        data.data.forEach(pago => {
            let esCliente = pago.tipo === 'Cliente';
            let colorMonto = esCliente ? 'text-success' : 'text-warning';
            let etiquetaIcono = esCliente ? 'bi-person-down text-success' : 'bi-building-up text-warning';
            let bgEtiqueta = esCliente ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-dark';
            let signo = esCliente ? '+' : '-';
            
            html += `
            <li class="list-group-item p-3 d-flex justify-content-between align-items-center">
                <div>
                    <strong class="d-block text-dark">${pago.concepto}</strong>
                    <span class="badge ${bgEtiqueta} border-0 mb-1 rounded-pill"><i class="bi ${etiquetaIcono} me-1"></i>${pago.tipo}</span>
                    <br><small class="text-muted"><i class="bi bi-calendar me-1"></i>${pago.fecha} &bull; <i class="bi bi-credit-card me-1"></i>${pago.metodo}</small>
                </div>
                <h5 class="mb-0 fw-bold ${colorMonto}">${signo}$${pago.monto}</h5>
            </li>`;
        });
    }
    document.getElementById('lista-historial').innerHTML = html;
}

// Función general para hacer POST
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
