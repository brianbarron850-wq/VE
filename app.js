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
        <div class="col-md-3"><div class="card bg-info text-white p-3"><h5>Ventas Totales</h5><h3>$${dataResumen.ventas}</h3></div></div>
        <div class="col-md-3"><div class="card bg-success text-white p-3"><h5>Cobrado a Clientes</h5><h3>$${dataResumen.recibido}</h3></div></div>
        <div class="col-md-3"><div class="card bg-warning text-dark p-3"><h5>Pagado a Prov.</h5><h3>$${dataResumen.pagado}</h3></div></div>
        <div class="col-md-3"><div class="card bg-primary text-white p-3"><h5>Retenido (Caja)</h5><h3>$${dataResumen.retenido}</h3></div></div>
    `;

    // Cargar Viajes
    const resViajes = await fetch(`${API_URL}?action=getViajes`);
    const dataViajes = await resViajes.json();
    viajesData = dataViajes.data;
    
    let htmlTabla = '';
    let htmlOpciones = '<option value="">Selecciona un folio...</option>';

    viajesData.forEach(v => {
        htmlTabla += `
            <tr class="clickable-row" ondblclick="verHistorial('${v.folio}')">
                <td>${v.folio}</td><td>${v.cliente}</td><td>${v.destino}</td>
                <td>$${v.totalViaje}</td>
                <td class="text-danger fw-bold">$${v.faltaPagar}</td>
                <td class="text-warning fw-bold">$${v.saldoProveedor}</td>
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

    document.getElementById('lista-historial').innerHTML = '<li class="list-group-item">Cargando...</li>';
    
    const res = await fetch(`${API_URL}?action=getHistorial&id=${folio}`);
    const data = await res.json();
    
    let html = '';
    if(data.data.length === 0) {
        html = '<li class="list-group-item text-muted">No hay pagos registrados aún.</li>';
    } else {
        data.data.forEach(pago => {
            html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                <div><strong>${pago.concepto}</strong><br><small>${pago.fecha} | ${pago.metodo}</small></div>
                <span class="badge bg-success rounded-pill">+$${pago.monto}</span>
            </li>`;
        });
    }
    document.getElementById('lista-historial').innerHTML = html;
}

// Función general para hacer POST
async function enviarPost(action, payload) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Evita errores CORS en Apps Script
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
    alert('Viaje guardado');
    location.reload(); // Recarga para actualizar tablas
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
    alert('Pago de cliente registrado');
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
    alert('Pago a proveedor registrado');
    location.reload();
}