// Genera una CARPETA_RAIZ con datos FICTICIOS para pruebas.
// Uso: node generar_datos.js <carpeta>
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const COMPRADORES = { uno: 'Comprador Uno', dos: 'Comprador Dos' };
const CONFIG = [
  ['proveedor', 'contacto', 'celular', 'nombre_whatsapp', 'comprador'],
  ['AYCO LTDA', 'Carlos', '3001112233', 'AYCO - Carlos', COMPRADORES.uno],
  ['NESTOR BRAVO S.A', 'Ana', '3002223344', 'NESTOR BRAVO - Ana', COMPRADORES.uno],
  ['NUVANT SAS', 'Luis', '3003334455', 'NUVANT - Luis', COMPRADORES.uno],
  ['AGOFER S A S', 'Marta', '3004445566', 'AGOFER - Marta', COMPRADORES.uno],
  ['MAZDEL PLAZAS RODRIGUEZ S EN C', 'Pedro', '3005556677', 'MAZDEL - Pedro', COMPRADORES.dos],
  ['ROPIM S.A.S', 'Sofía', '3006667788', 'ROPIM - Sofía', COMPRADORES.dos],
  ['BANOS BRASILIA SAS', 'Jorge', '3007778899', 'BAÑOS BRASILIA - Jorge', COMPRADORES.dos],
];

// [Nro orden, proveedor, item, descripción, U.M., pendiente, Nro solicitud]
function lineasOC({ sinRopim = false } = {}) {
  const L = [
    ['OC-00051420', 'AYCO LTDA', '0226167', 'LÁMINA ALUMINIO 1.5mm LISA', 'Und', '500,00', '001-SC-00010001'],
    ['OC-00051420', 'AYCO LTDA', '0226168', 'ÁNGULO ALUMINIO 1X1X1/8', 'Und', '200,00', '001-SC-00010002'],
    ['OC-00051420', 'AYCO LTDA', '0226169', 'PERFIL U ALUMINIO 2"', 'm', '1.250,50', '001-SC-00010003'],
    ['OC-00051421', 'AYCO LTDA', '0300001', 'TORNILLO AUTOPERF 8X1"', 'Und', '50,00', '001-SC-00010004'],
    ['OC-00051500', 'NESTOR BRAVO S.A', '0400001', 'CAÑERÍA COBRE 3/8', 'm', '30,00', '001-SC-00010010'],
    ['OC-00051500', 'NESTOR BRAVO S.A', '0400002', 'CODO COBRE 3/8', 'Und', '12,00', '001-SC-00010011'],
    ['OC-00051600', 'MAZDEL PLAZAS RODRIGUEZ S EN C', '0500001', 'ESPUMA ASIENTO TIPO A', 'Und', '40,00', '001-SC-00010020'],
    ['OC-00051601', 'MAZDEL PLAZAS RODRIGUEZ S EN C', '0500002', 'ESPUMA ESPALDAR TIPO B', 'Und', '40,00', '001-SC-00010021'],
    ['OC-00051700', 'NUVANT SAS', '0600001', 'ITEM EN GESTIÓN', 'Und', '1,00', '001-SC-00010030'],
    ['OC-00051700', 'NUVANT SAS', '0600002', 'ITEM EXCLUIDO', 'Und', '1,00', '001-SC-00010031'],
    ['OC-00051700', 'NUVANT SAS', '0600003', 'ITEM SIN NECESIDAD', 'Und', '1,00', '001-SC-00010032'],
    ['OC-00051700', 'NUVANT SAS', '0600004', 'ITEM FUERA DE HORIZONTE', 'Und', '1,00', '001-SC-00010033'],
    ['OC-00051700', 'NUVANT SAS', '0600005', 'ITEM NO ESTA EN EXPLOSION', 'Und', '1,00', '001-SC-00010034'],
    ['OC-00051700', 'NUVANT SAS', '0600006', 'SELLO PUERTA EPDM', 'm', '80,00', '001-SC-00010035'],
    ['OCI-00010520', 'AGOFER S A S', '0700001', 'IMPORTADO NO VA', 'Und', '5,00', '001-OCI-10126'],
    ['OC-00051800', 'AGOFER S A S', '0700002', 'PENDIENTE CERO', 'Und', '0,00', '001-SC-00010040'],
    ['OC-00051900', 'ROPIM S.A.S', '0800001', 'PINTURA GRIS RAL 7016', 'gal', '15,00', '001-SC-00010050'],
    ['OC-00051999', 'PROVEEDOR AJENO SAS', '0999999', 'OTRO PROVEEDOR', 'Und', '3,00', '001-SC-00010060'],
  ];
  for (let i = 1; i <= 17; i++) L.push(['OC-00052000', 'BANOS BRASILIA SAS', '09000' + String(i).padStart(2, '0'), 'ACCESORIO BAÑO REF ' + i, 'Und', '2,00', '001-SC-0001' + (100 + i)]);
  return L.filter(l => !(sinRopim && l[1] === 'ROPIM S.A.S'));
}
function textoOC(lineas) {
  const enc = ['Fecha orden', 'Nro orden', 'Razón social proveedor', 'Bodega', 'Item', 'Desc. item', 'U.M.', 'Cant. ordenada', 'Cant. entrada', 'Cant. pendiente', 'Precio unit.', 'Estado', 'Fecha entrega', 'comprador', 'Nro solicitud', 'Notas movto.', 'Fecha actualización', 'Usuario actualización', 'Usuario anulación', 'Fecha cumplido', 'Usuario cumplido', 'Notas documento', ''];
  const filas = [enc.join('\t'), 'Gran total\t\t\t\t\t\t\t1.000,00\t0,00\t1.000,00\t\t\t\t\t\t\t\t\t\t\t\t\t'];
  for (const [orden, prov, item, desc, um, pend, sol] of lineas)
    filas.push(['01/11/2026', orden, prov, '001  ', item, desc, um, pend, '0,00', pend, '1.000', 'Aprobado', '20/11/2026', 'COMPRADOR SIESA', sol, '', '01/11/2026 8:00 a. m.', 'usuario', '', '', '', '', ''].join('\t'));
  return Buffer.from(filas.join('\r\n') + '\r\n', 'latin1');   // Windows-1252
}

// [item, fecha planeación, necesidad (cant pendiente - inventario), gestión, excluido]
function filasExplosion({ cambio400001 } = {}) {
  const F = [
    [226167, '2026-11-18', 10, '', ''], [226167, '2026-11-12', 0, '', ''], [226167, '2026-11-25', 5, '', ''],
    [226168, '2026-10-20', 3, '', ''],
    [226169, '2026-11-15', 1, '', ''],
    [300001, '2026-11-20', 2, '', ''],
    [400001, cambio400001 || '2026-11-19', 4, '', ''], [400002, '2026-11-26', 4, '', ''],
    [500001, '2026-11-20', 4, '', ''], [500002, '2026-11-30', 4, '', ''],
    [600001, '2026-11-20', 1, 'Trasladar de Bogotá', ''], [600002, '2026-11-20', 1, '', 'Excluido'],
    [600003, '2026-11-20', 0, '', ''], [600004, '2027-01-15', 1, '', ''], [600006, '2026-11-24', 8, '', ''],
    [700001, '2026-11-20', 1, '', ''], [700002, '2026-11-20', 1, '', ''],
    [800001, '2026-11-17', 3, '', ''], [999999, '2026-11-20', 1, '', ''],
  ];
  for (let i = 1; i <= 17; i++) F.push([900000 + i, '2026-11-' + String(9 + i).padStart(2, '0'), 1, '', '']);
  return F;
}
function libroExplosion(filas) {
  const enc = ['Tipo Demanda', 'OP / DOC', 'EP', 'Item', 'Descripción', 'Und Inv', 'Cantidad Requerida', 'Cantidad Pendiente', 'Cant Penditiente - Inventario', 'Fecha Requerido', 'Fecha Planeación', 'ITEMS GESTION.GESTIÓN', 'Excluido', 'COMPRADOR.NEGOCIADOR'];
  const d = s => new Date(s + 'T00:00:00Z');
  const aoa = [enc];
  for (const [item, f, nec, ges, exc] of filas) aoa.push(['OPFI', 'MP1', 'EP1', item, 'desc', 'Und', nec, nec, nec, d(f), d(f), ges, exc, 'X']);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['tablero']]), 'DASHBOARD');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa, { cellDates: false }), 'Explosión');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function crearCarpeta(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  for (const s of ['entrada', 'config', 'registro']) fs.mkdirSync(path.join(dir, s), { recursive: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(CONFIG), 'proveedores');
  XLSX.writeFile(wb, path.join(dir, 'config/proveedores.xlsx'));
  fs.writeFileSync(path.join(dir, 'entrada/OC_09112026.txt'), textoOC(lineasOC()));
  fs.writeFileSync(path.join(dir, 'entrada/ABASTECIMIENTO_09112026.xlsx'), libroExplosion(filasExplosion()));
}

module.exports = { crearCarpeta, textoOC, lineasOC, libroExplosion, filasExplosion, COMPRADORES, CONFIG };
if (require.main === module) { crearCarpeta(path.resolve(process.argv[2] || 'carpeta_prueba')); console.log('Carpeta de prueba creada'); }
