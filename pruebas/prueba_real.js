// Prueba con los archivos REALES de Siesa (no se guardan en el repositorio).
// Uso: node prueba_real.js <OC_ddmmaaaa.txt> <ABASTECIMIENTO_ddmmaaaa.xlsx> [aaaa-mm-dd]
const fs = require('fs');
const path = require('path');
const { abrir, cerrar, leerRegistro, revisar, resumen, XLSX } = require('./utilidades');

const [oc, ex, hoy = '2026-10-31'] = process.argv.slice(2);
if (!oc || !ex) { console.log('Uso: node prueba_real.js <OC.txt> <ABASTECIMIENTO.xlsx> [aaaa-mm-dd]'); process.exit(1); }
const DIR = path.join(__dirname, 'carpeta_prueba_real');
const PROVS = ['BANOS BRASILIA SAS', 'NESTOR BRAVO S.A', 'NUVANT SAS', 'AGOFER S A S', 'ROPIM S.A.S', 'MAZDEL PLAZAS RODRIGUEZ S EN C', 'AYCO LTDA'];

(async () => {
  fs.rmSync(DIR, { recursive: true, force: true });
  for (const s of ['entrada', 'config', 'registro']) fs.mkdirSync(path.join(DIR, s), { recursive: true });
  const cfg = [['proveedor', 'contacto', 'celular', 'nombre_whatsapp', 'comprador']].concat(PROVS.map((p, i) => [p, 'Contacto ' + (i + 1), '300000000' + i, p.split(' ')[0] + ' - Contacto', 'Comprador Prueba']));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cfg), 'proveedores');
  XLSX.writeFile(wb, path.join(DIR, 'config/proveedores.xlsx'));
  const fecha = path.basename(oc).match(/(\d{8})/)[1];
  fs.copyFileSync(oc, path.join(DIR, 'entrada/OC_' + fecha + '.txt'));
  fs.copyFileSync(ex, path.join(DIR, 'entrada/ABASTECIMIENTO_' + fecha + '.xlsx'));

  console.log('\n== Archivos reales, fecha ' + hoy + ' ==');
  let p = await abrir(DIR, { hoy, compradores: ['Comprador Prueba'] });
  console.log('  Primera carga (lee explosión completa): ' + (p.__ms / 1000).toFixed(1) + ' s');
  const L = leerRegistro(DIR).lineas;
  const porProv = {}; for (const l of L) porProv[l.proveedor] = (porProv[l.proveedor] || 0) + 1;
  console.log('  Líneas en seguimiento: ' + L.length + ' ' + JSON.stringify(porProv));
  revisar(L.length === 86, 'Líneas en seguimiento = 86 (análisis previo, opción C)', L.length);
  const b = await p.$$eval('#envios button.grande', x => x.map(y => y.textContent));
  console.log('  Botones: ' + b.join(' | '));
  revisar(b.every(t => /\((\d+) l[ií]neas?\)/.exec(t) && +/\((\d+)/.exec(t)[1] <= 15), 'Ningún mensaje supera 15 líneas');
  await p.click('#envios button.grande >> nth=0');
  await p.waitForFunction(() => window.__abiertos.length === 1);
  console.log('\n--- Mensaje de ejemplo ---\n' + decodeURIComponent((await p.evaluate(() => window.__abiertos[0])).split('?text=')[1]) + '\n---');
  await p.context().close();

  p = await abrir(DIR, { hoy, compradores: ['Comprador Prueba'] });
  console.log('  Segunda carga (con cache): ' + (p.__ms / 1000).toFixed(1) + ' s');
  revisar(await p.evaluate(() => window.__fuenteExplosion) === 'cache', 'Segunda carga usa la cache');
  console.log('  Tamaño cache: ' + (fs.statSync(path.join(DIR, 'registro/cache/explosion.json')).size / 1024).toFixed(0) + ' KB');
  await p.context().close();

  const buena = fs.readFileSync(ex);
  const sig = new Date(hoy + 'T12:00:00'); sig.setDate(sig.getDate() + 1);
  const n = String(sig.getDate()).padStart(2, '0') + String(sig.getMonth() + 1).padStart(2, '0') + sig.getFullYear();
  fs.writeFileSync(path.join(DIR, 'entrada/ABASTECIMIENTO_' + n + '.xlsx'), buena.subarray(0, Math.floor(buena.length * 0.73)));
  p = await abrir(DIR, { hoy, compradores: ['Comprador Prueba'] });
  const av = await p.$$eval('.aviso.amarillo', x => x.map(a => a.textContent));
  console.log('  Carga con explosión real truncada: ' + (p.__ms / 1000).toFixed(1) + ' s · aviso: ' + av.join(' '));
  revisar(av.some(a => a.includes('porque la nueva está dañada')), 'Explosión real truncada → usa la anterior y avisa');
  await p.context().close();
  await cerrar();
  process.exit(resumen() ? 1 : 0);
})().catch(async e => { console.error(e); await cerrar(); process.exit(1); });
