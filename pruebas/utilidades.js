// Utilidades de prueba: carpeta simulada (File System Access API sobre disco real) y lectura del registro.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { chromium } = require('playwright');

const RAIZ_REPO = path.resolve(__dirname, '..');
const SHEETJS = path.join(__dirname, 'node_modules/xlsx/dist/xlsx.full.min.js');

// Código que corre dentro de la página: imita los "handles" de carpeta/archivo del navegador.
const CARPETA_SIMULADA = `
window.__abiertos = [];
window.open = (u) => { window.__abiertos.push(u); return null; };
window.__carpetaPrueba = (function () {
  const aBytes = b => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  const aB64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const noExiste = () => new DOMException('no existe', 'NotFoundError');
  class Archivo { constructor(p, n) { this.kind = 'file'; this.name = n; this.p = p; }
    async getFile() { const st = await __fs_stat(this.p); if (!st.existe) throw noExiste(); return new File([aBytes(await __fs_leer(this.p))], this.name, { lastModified: st.mtime }); }
    async createWritable() { const partes = [], p = this.p; return { write: async d => { partes.push(d); }, close: async () => { const u = new Uint8Array(await new Blob(partes).arrayBuffer()); await __fs_escribir(p, aB64(u)); } }; } }
  class Carpeta { constructor(p, n) { this.kind = 'directory'; this.name = n; this.p = p; }
    async getDirectoryHandle(n, o = {}) { const p = this.p + '/' + n; const st = await __fs_stat(p); if (!st.existe) { if (!o.create) throw noExiste(); await __fs_mkdir(p); } return new Carpeta(p, n); }
    async getFileHandle(n, o = {}) { const p = this.p + '/' + n; const st = await __fs_stat(p); if (!st.existe && !o.create) throw noExiste(); return new Archivo(p, n); }
    async *entries() { for (const e of await __fs_listar(this.p)) yield [e.nombre, e.archivo ? new Archivo(this.p + '/' + e.nombre, e.nombre) : new Carpeta(this.p + '/' + e.nombre, e.nombre)]; }
    async queryPermission() { return 'granted'; } }
  return new Carpeta('', 'raiz');
})();`;

let navegador = null;
async function abrir(carpeta, { hoy, compradores, esperarCarga = true }) {
  if (!navegador) navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 1100, height: 900 }, locale: 'es-CO', deviceScaleFactor: 2 });
  await ctx.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ path: SHEETJS, contentType: 'application/javascript' }));
  const ruta = p => path.join(carpeta, p);
  await ctx.exposeFunction('__fs_stat', p => { try { const s = fs.statSync(ruta(p)); return { existe: true, mtime: Math.floor(s.mtimeMs) }; } catch (e) { return { existe: false }; } });
  await ctx.exposeFunction('__fs_leer', p => fs.readFileSync(ruta(p)).toString('base64'));
  await ctx.exposeFunction('__fs_escribir', (p, b) => { fs.writeFileSync(ruta(p), Buffer.from(b, 'base64')); return true; });
  await ctx.exposeFunction('__fs_mkdir', p => { fs.mkdirSync(ruta(p), { recursive: true }); return true; });
  await ctx.exposeFunction('__fs_listar', p => fs.readdirSync(ruta(p), { withFileTypes: true }).map(e => ({ nombre: e.name, archivo: e.isFile() })));
  await ctx.addInitScript(CARPETA_SIMULADA);
  await ctx.addInitScript(`localStorage.setItem('compradores', ${JSON.stringify(JSON.stringify(compradores || []))});`);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('   [error en página]', e.message));
  const url = 'file://' + path.join(RAIZ_REPO, 'index.html') + (hoy ? '?hoy=' + hoy : '');
  const t0 = Date.now();
  await page.goto(url);
  if (esperarCarga) await page.waitForFunction(() => !document.getElementById('principal').hidden || document.querySelector('.aviso.rojo'), null, { timeout: 180000 });
  page.__ms = Date.now() - t0;
  return page;
}
async function cerrar() { if (navegador) await navegador.close(); navegador = null; }

function leerRegistro(carpeta) {
  const f = path.join(carpeta, 'registro/fechas_prometidas.xlsx');
  if (!fs.existsSync(f)) return { lineas: [], historial: [] };
  const wb = XLSX.read(fs.readFileSync(f));
  return { lineas: XLSX.utils.sheet_to_json(wb.Sheets.lineas, { defval: '' }), historial: XLSX.utils.sheet_to_json(wb.Sheets.historial, { defval: '' }) };
}

let ok = 0, mal = 0;
function revisar(cond, texto, extra) {
  if (cond) { ok++; console.log('  OK   ' + texto); }
  else { mal++; console.log('  FALLA ' + texto + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function resumen() { console.log(`\nResultado: ${ok} OK, ${mal} fallas`); return mal; }

module.exports = { abrir, cerrar, leerRegistro, revisar, resumen, XLSX };
