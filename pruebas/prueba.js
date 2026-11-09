// Pruebas automáticas con datos FICTICIOS. Uso: cd pruebas && npm install && node prueba.js
const fs = require('fs');
const path = require('path');
const { abrir, cerrar, leerRegistro, revisar, resumen } = require('./utilidades');
const G = require('./generar_datos');

const DIR = path.join(__dirname, 'carpeta_prueba');
const IMG = path.join(__dirname, '..', 'docs', 'img');
const UNO = [G.COMPRADORES.uno], DOS = [G.COMPRADORES.dos], AMBOS = [G.COMPRADORES.uno, G.COMPRADORES.dos];

const botones = p => p.$$eval('#envios button.grande', bs => bs.map(b => b.textContent));
const llamadas = p => p.$$eval('#llamadas tbody tr', trs => trs.map(t => t.textContent));
const lineas = () => leerRegistro(DIR).lineas;
const linea = item => lineas().find(l => l['ítem'] === item);
const estados = prov => lineas().filter(l => l.proveedor === prov).map(l => l.estado);
async function enviarA(p, nombre) {
  const antes = await p.evaluate(() => window.__abiertos.length);
  await p.click(`#envios button.grande:has-text("Enviar a ${nombre} (")`);
  await p.waitForFunction(n => window.__abiertos.length > n && !document.querySelector('#envios button.grande:disabled'), antes);
  await p.waitForTimeout(150);
  const url = await p.evaluate(() => window.__abiertos[window.__abiertos.length - 1]);
  return { url, msg: decodeURIComponent(url.split('?text=')[1]) };
}
async function leer(p, texto) { await p.fill('#pegado', texto); await p.click('#btnLeer'); return p.textContent('#lectura'); }
async function confirmar(p) { await p.click('#btnConfirmar'); await p.waitForSelector('#lectura .aviso.info'); }

(async () => {
  G.crearCarpeta(DIR);
  fs.mkdirSync(IMG, { recursive: true });

  console.log('\n== DÍA 1 · lunes 09/11/2026: carga, alcance y envíos ==');
  let p = await abrir(DIR, { hoy: '2026-11-09', compradores: AMBOS });
  revisar(await p.evaluate(() => window.__fuenteExplosion) === 'archivo', 'Primera carga lee la explosión del archivo y genera cache');
  revisar(fs.existsSync(path.join(DIR, 'registro/cache/explosion.json')), 'Se creó registro/cache/explosion.json');
  const b1 = await botones(p);
  revisar(JSON.stringify(b1) === JSON.stringify(['Enviar a AYCO (4 líneas)', 'Enviar a NESTOR BRAVO (2 líneas)', 'Enviar a NUVANT (1 línea)', 'Enviar a MAZDEL (2 líneas)', 'Enviar a ROPIM (1 línea)', 'Enviar a BAÑOS BRASILIA (15 líneas)']), 'Botones por proveedor con su número de líneas', b1);
  revisar(!b1.some(b => b.includes('AGOFER')), 'AGOFER no aparece: OCI excluida y línea con pendiente 0');
  revisar(lineas().length === 27, 'Registro con 27 líneas en seguimiento (NUVANT: sin gestión/excluido/sin necesidad/fuera de horizonte/sin explosión)', lineas().length);
  revisar(await p.evaluate(() => document.getElementById('fechas').textContent.includes('Explosión del 09/11/2026 · OC del 09/11/2026')), 'Muestra la fecha de los archivos cargados');

  // Capturas para el README del comprador
  await p.evaluate(() => document.getElementById('fechaSimulada').remove());
  await p.click('#selComp summary'); await p.screenshot({ path: path.join(IMG, 'paso1_quien_eres.png'), clip: { x: 0, y: 0, width: 1100, height: 330 } }); await p.click('h2');

  let e = await enviarA(p, 'AYCO');
  revisar(e.url.startsWith('https://wa.me/573001112233?text='), 'Abre wa.me con 57 + celular');
  revisar(e.msg.startsWith('Buenos días Carlos, le escribe Compras Busscar. Estas son las entregas pendientes de AYCO LTDA:\n\nOC 51420\n1. ÁNGULO ALUMINIO 1X1X1/8 (cód. 0226168) · 200 und · Requerida hoy · Sin confirmar\n2. PERFIL U ALUMINIO 2" (cód. 0226169) · 1.250,5 m · Requerida 15 nov · Sin confirmar\n3. LÁMINA ALUMINIO 1.5mm LISA (cód. 0226167) · 500 und · Requerida 18 nov · Sin confirmar\n\nOC 51421\n1. TORNILLO AUTOPERF 8X1" (cód. 0300001) · 50 und · Requerida 20 nov · Sin confirmar\n'), 'Mensaje agrupado por OC, numerado, fecha más cercana primero, vencida = "hoy"', e.msg);
  revisar(e.msg.includes('"La 51420 llega el 25 de noviembre"') && e.msg.endsWith('no reemplaza la facturación en la plataforma de proveedores.'), 'Mensaje con ejemplos y cierre fijo');
  revisar(estados('AYCO LTDA').every(s => s === 'ENVIADO') && linea('0226167')['envíos sin respuesta'] === 1, 'AYCO queda ENVIADO con 1 envío');
  revisar(!(await botones(p)).some(b => b.includes('AYCO')), 'Un solo mensaje por proveedor por día (botón AYCO desaparece)');
  await enviarA(p, 'NESTOR BRAVO'); await enviarA(p, 'MAZDEL'); await enviarA(p, 'ROPIM'); await enviarA(p, 'NUVANT');
  e = await enviarA(p, 'BAÑOS BRASILIA');
  revisar(e.msg.includes('\n15. ') && !e.msg.includes('\n16. '), 'Máximo 15 líneas por mensaje');
  revisar(linea('0900016').estado === 'POR ENVIAR', 'Las líneas 16 y 17 de BAÑOS quedan para otro día');

  console.log('\n== DÍA 1: lectura de respuestas ==');
  let t = await leer(p, 'Todo igual');
  revisar(t.includes('No se ve el encabezado'), 'Pegado sin encabezado → bloquea');
  t = await leer(p, '[23:58, 9/11/2026] Fulano de Tal: todo igual');
  revisar(t.includes('Remitente desconocido'), 'Remitente desconocido → bloquea');
  t = await leer(p, '[23:58, 9/11/2026] AYCO - Carlos: La 51999 llega el 20');
  revisar(t.includes('BLOQUEADO') && t.includes('no es de AYCO LTDA'), 'OC de otro proveedor → bloquea', t);
  revisar(!(await p.$('#btnConfirmar')), 'Sin botón Confirmar cuando bloquea');

  t = await leer(p, '[11:40 p. m., 9/11/2026] Compras Busscar: Buenos días Ana, le escribe Compras Busscar...\n[11:58 p. m., 9/11/2026] NESTOR BRAVO - Ana: Buenas tardes\n[11:59 p. m., 9/11/2026] NESTOR BRAVO - Ana: Todo igual, gracias');
  revisar(t.includes('NESTOR BRAVO S.A') && t.includes('19/11/2026 (se mantiene)') && t.includes('26/11/2026 (se mantiene)'), '"Todo igual" mantiene todas las líneas (ignora mensajes propios de Busscar)', t);
  await confirmar(p);
  revisar(estados('NESTOR BRAVO S.A').every(s => s === 'CONFIRMADO') && linea('0400001')['fecha prometida'] === '2026-11-19', 'NESTOR queda CONFIRMADO');

  t = await leer(p, '[23:58, 9/11/2026] MAZDEL - Pedro: La 51600 llega el 25 de noviembre. El 1 de la 51601 llega el 21');
  revisar(t.includes('25/11/2026') && t.includes('21/11/2026'), 'Fecha en palabras y "el 1 de la 51601 llega el 21"', t);
  await confirmar(p);
  revisar(linea('0500001').estado === 'LLAMAR' && linea('0500002').estado === 'CONFIRMADO', 'Fecha tardía → LLAMAR; fecha a tiempo → CONFIRMADO');

  t = await leer(p, '[10:00, 8/11/2026] ROPIM - Sofía: la 51900 llega el 30/11\n[23:58, 9/11/2026] ROPIM - Sofía: La 51900 ya la entregamos');
  revisar(t.includes('ENTREGADO') && !t.includes('30/11/2026'), 'Entregado; ignora mensajes anteriores al último envío', t);
  await confirmar(p);
  revisar(linea('0800001').estado === 'ENTREGADO', 'ROPIM queda ENTREGADO');

  t = await leer(p, '[23:58, 9/11/2026] +57 300 7778899: la otra semana le confirmo');
  const amarillas = await p.$$eval('#lectura tr.amarilla', x => x.length);
  revisar(t.includes('BANOS BRASILIA SAS') && amarillas === 15, 'Fecha vaga → filas amarillas; proveedor reconocido por celular', amarillas);
  await p.fill('#lectura tr.amarilla input[type=date] >> nth=0', '2026-11-10');
  await p.dispatchEvent('#lectura tr.amarilla input[type=date] >> nth=0', 'change');
  await confirmar(p);
  revisar(linea('0900001').estado === 'CONFIRMADO' && linea('0900002').estado === 'ENVIADO', 'Solo la fila con fecha escrita se registra');

  const fx = await p.evaluate(() => ['25/11', '25-11', '25 de noviembre', '25 nov', 'el 25', 'el 5', 'mañana', 'hoy', 'la otra semana', 'pasado mañana']
    .map(s => { const r = extraerFecha(norm(s)); return r.fecha || (r.vaga ? 'VAGA' : null); }));
  revisar(JSON.stringify(fx) === JSON.stringify(['2026-11-25', '2026-11-25', '2026-11-25', '2026-11-25', '2026-11-25', '2026-12-05', '2026-11-10', '2026-11-09', 'VAGA', 'VAGA']), 'Formatos de fecha entendidos', fx);
  await p.context().close();

  console.log('\n== DÍA 2 · martes 10/11: reenvío y llamada por fecha tardía ==');
  p = await abrir(DIR, { hoy: '2026-11-10', compradores: AMBOS });
  revisar(await p.evaluate(() => window.__fuenteExplosion) === 'cache', 'Carga con cache (no relee la explosión)');
  const b2 = await botones(p);
  revisar(b2.includes('Enviar a AYCO (4 líneas)') && !b2.some(b => b.includes('NESTOR')), 'Reenvío al siguiente día hábil a quien no respondió', b2);
  let ll = await llamadas(p);
  revisar(ll.length === 1 && ll[0].includes('LLAMAR a MAZDEL') && ll[0].includes('Fecha no sirve'), 'Bloque LLAMAR por fecha tardía', ll);
  await p.evaluate(() => document.getElementById('fechaSimulada').remove());
  await p.screenshot({ path: path.join(IMG, 'paso2_enviar_y_llamar.png'), fullPage: true });
  await leer(p, '[23:59, 9/11/2026] AYCO - Carlos: La 51421 llega el 18 de noviembre. El 2 de la 51420 la otra semana');
  await p.screenshot({ path: path.join(IMG, 'paso3_pegar_respuesta.png'), fullPage: true });
  await p.fill('#pegado', ''); await p.evaluate(() => { document.getElementById('lectura').innerHTML = ''; });
  await enviarA(p, 'AYCO');
  revisar(linea('0226167')['envíos sin respuesta'] === 2, 'AYCO con 2 envíos sin respuesta');
  await p.fill('#llamadas input[type=date]', '2026-11-24');
  await p.click('#llamadas button');
  await p.waitForFunction(() => !document.querySelector('#llamadas tbody'));
  revisar(linea('0500001').estado === 'CONFIRMADO' && linea('0500001')['fecha prometida'] === '2026-11-24', 'Fecha acordada guardada desde LLAMAR');
  await p.context().close();

  console.log('\n== DÍA 3 · miércoles 11/11: alerta LLAMAR por 2 envíos sin respuesta ==');
  p = await abrir(DIR, { hoy: '2026-11-11', compradores: UNO });
  ll = await llamadas(p);
  revisar(ll.length === 4 && ll.every(x => x.includes('LLAMAR a AYCO LTDA') && x.includes('Sin respuesta')), 'AYCO pasa a LLAMAR (sin respuesta)', ll);
  revisar(!(await botones(p)).some(b => b.includes('AYCO')), 'No se reenvía a AYCO');
  await p.context().close();

  console.log('\n== DÍA 4 · jueves 12/11: seguimiento a 3 días hábiles y dos compradores a la vez ==');
  const pA = await abrir(DIR, { hoy: '2026-11-12', compradores: UNO });
  const pB = await abrir(DIR, { hoy: '2026-11-12', compradores: DOS });
  revisar((await botones(pA)).includes('Enviar a NESTOR BRAVO (2 líneas)'), 'Seguimiento "¿Se mantiene?" 3 días hábiles después de la respuesta');
  revisar((await botones(pB)).some(b => b.startsWith('Enviar a MAZDEL (1 línea)')), 'MAZDEL: solo la línea confirmada por WhatsApp (la acordada por llamada no)');
  const eA = await enviarA(pA, 'NESTOR BRAVO');
  revisar(eA.msg.includes('Confirmada: 19 nov'), 'El seguimiento muestra la fecha ya confirmada');
  await enviarA(pB, 'MAZDEL');       // pB tenía datos de antes del guardado de pA
  revisar(linea('0400001').estado === 'ENVIADO' && linea('0400001')['seguimiento 3 días hecho'] === 'SI' && linea('0500002').estado === 'ENVIADO', 'Dos compradores guardando seguido: se conservan ambos cambios');
  const h = leerRegistro(DIR).historial.filter(x => x.tipo === 'ENVÍO' && x.fecha === '2026-11-12');
  revisar(h.length === 2, 'El historial tiene los dos envíos', h.length);
  await pA.context().close(); await pB.context().close();

  console.log('\n== DÍA 5 · viernes 13/11: explosión dañada ==');
  const buena = fs.readFileSync(path.join(DIR, 'entrada/ABASTECIMIENTO_09112026.xlsx'));
  fs.writeFileSync(path.join(DIR, 'entrada/ABASTECIMIENTO_13112026.xlsx'), buena.subarray(0, Math.floor(buena.length * 0.6)));
  p = await abrir(DIR, { hoy: '2026-11-13', compradores: AMBOS });
  const av = await p.$$eval('.aviso.amarillo', x => x.map(a => a.textContent));
  revisar(av.some(a => a.includes('Se está usando la explosión del 09/11 porque la nueva está dañada')), 'Aviso amarillo y usa la explosión anterior', av);
  revisar(!(await p.$eval('#principal', x => x.hidden)), 'La pantalla sigue funcionando');
  await p.context().close();
  p = await abrir(DIR, { hoy: '2026-11-13', compradores: AMBOS });
  const avisosHist = leerRegistro(DIR).historial.filter(x => x.tipo === 'AVISO ARCHIVO');
  revisar(avisosHist.length === 1 && avisosHist[0].detalle.startsWith('ABASTECIMIENTO_13112026.xlsx'), 'Queda registrado una sola vez en el historial', avisosHist.length);
  revisar(await p.evaluate(() => window.__fuenteExplosion) === 'cache', 'Archivo dañado ya revisado: no se vuelve a leer');
  await p.context().close();

  console.log('\n== DÍA 6 · lunes 16/11: nueva explosión cambia fecha, OC cerrada, fallo al guardar ==');
  fs.writeFileSync(path.join(DIR, 'entrada/ABASTECIMIENTO_16112026.xlsx'), G.libroExplosion(G.filasExplosion({ cambio400001: '2026-11-23' })));
  fs.writeFileSync(path.join(DIR, 'entrada/OC_16112026.txt'), G.textoOC(G.lineasOC({ sinRopim: true })));
  p = await abrir(DIR, { hoy: '2026-11-16', compradores: AMBOS });
  revisar(await p.evaluate(() => window.__fuenteExplosion) === 'archivo', 'Explosión nueva → se regenera la cache');
  revisar(linea('0400001').estado === 'POR ENVIAR' && linea('0400001')['fecha requerida'] === '2026-11-23', 'Fecha requerida cambiada → enviar hoy');
  revisar((await botones(p)).includes('Enviar a NESTOR BRAVO (2 líneas)'), 'Botón NESTOR: línea cambiada + reenvío pendiente del seguimiento');
  revisar(linea('0800001').estado === 'CERRADA', 'Línea que ya no viene en el archivo de OC → CERRADA');
  revisar(fs.readdirSync(path.join(DIR, 'registro/respaldo')).length >= 5, 'Respaldo diario en registro/respaldo/');
  await p.evaluate(() => { escribirArchivo = async () => { throw new Error('archivo bloqueado'); }; });
  await p.click('#envios button.grande:has-text("Enviar a NESTOR BRAVO")');
  await p.waitForSelector('.aviso.rojo');
  revisar((await p.textContent('.aviso.rojo')).includes('NO SE GUARDÓ'), 'Si falla el guardado → aviso rojo');
  await p.context().close();

  console.log('\n== Sin archivos de entrada ==');
  const VACIA = path.join(__dirname, 'carpeta_prueba_vacia');
  G.crearCarpeta(VACIA); for (const f of fs.readdirSync(path.join(VACIA, 'entrada'))) fs.unlinkSync(path.join(VACIA, 'entrada', f));
  p = await abrir(VACIA, { hoy: '2026-11-09', compradores: AMBOS });
  revisar((await p.textContent('.aviso.rojo')).includes('Avise al analista: falta la explosión y el listado de OC') && await p.$eval('#principal', x => x.hidden), 'Sin archivos → mensaje claro y nada más');
  await p.context().close();

  await cerrar();
  process.exit(resumen() ? 1 : 0);
})().catch(async e => { console.error(e); await cerrar(); process.exit(1); });
