/*
  Renombrador masivo de series/subtítulos.
  - Puede usarse como módulo (require) desde Electron o como script CLI.
  - Acepta un objeto con: root (carpeta) ó files (array de rutas),
    searchPrefix, extension, finalPrefix, startIndex, padLength, dryRun.
  - Retorna un array de logs con cada acción realizada.
*/

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Core rename function — usable from GUI or CLI.
 * @param {object} options
 * @returns {string[]} logs
 */
async function renameSeries(options) {
  const {
    root,
    files,
    searchPrefix = '',
    extension = '',
    finalPrefix = '',
    startIndex = 1,
    padLength = 3,
    dryRun = false,
  } = options;

  const logs = [];
  const log = (msg) => { logs.push(msg); console.log(msg); };

  if (!searchPrefix) {
    log('⚠️ Se requiere un prefijo de búsqueda.');
    return logs;
  }

  const matches = [];

  // MODE A: files were dropped directly (array of paths)
  if (files && files.length > 0) {
    for (const f of files) {
      const name = path.basename(f);
      const okPrefix = name.startsWith(searchPrefix);
      const okExt = extension ? name.endsWith(extension) : true;
      if (okPrefix && okExt) matches.push(f);
    }
  }
  // MODE B: scan a root directory recursively
  else if (root) {
    if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory()) {
      log('⚠️ La ruta raíz no existe o no es una carpeta.');
      return logs;
    }
    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith(searchPrefix)) matches.push(fullPath);
          walk(fullPath);
        } else {
          const okPrefix = entry.name.startsWith(searchPrefix);
          const okExt = extension ? entry.name.endsWith(extension) : true;
          if (okPrefix && okExt) matches.push(fullPath);
        }
      }
    }
    walk(root);
  } else {
    log('⚠️ No se proporcionó carpeta raíz ni archivos.');
    return logs;
  }

  if (matches.length === 0) {
    log('📁 No se encontraron archivos que coincidan con los criterios.');
    return logs;
  }

  log(`🔎 Encontrados ${matches.length} archivo(s).`);
  // Sort deeper paths first so we rename files before their parent dirs
  matches.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);

  let idx = startIndex;
  for (const oldPath of matches) {
    const dir = path.dirname(oldPath);
    const ext = path.extname(oldPath);
    const newName = `${finalPrefix}${String(idx).padStart(padLength, '0')}${ext}`;
    const newPath = path.join(dir, newName);
    try {
      if (dryRun) {
        log(`🔸 [SIMULADO] ${path.basename(oldPath)} → ${newName}`);
      } else {
        fs.renameSync(oldPath, newPath);
        log(`✅ ${path.basename(oldPath)} → ${newName}`);
      }
    } catch (e) {
      log(`❌ Error: ${path.basename(oldPath)}: ${e.message}`);
    }
    idx++;
  }
  log('✅ Proceso completado.');
  return logs;
}

module.exports = renameSeries;

// ─── CLI mode: if executed directly with `node rename_series.js` ───
if (require.main === module) {
  (async () => {
    function ask(question) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
    }
    console.log('=== Renombrador Masivo de Series / Subtítulos ===');
    const root = await ask('Ubicación raíz (ruta completa): ');
    const searchPrefix = await ask('Prefijo que identificará los archivos (ej: "S01E"): ');
    const extension = await ask('Extensión a filtrar (ej: .mkv, .srt) o dejar vacío para todas: ');
    const finalPrefix = await ask('Prefijo final para los nuevos nombres (ej: "Serie_X_"): ');
    const startIdxStr = await ask('Número inicial del índice (default 1): ');
    const startIndex = parseInt(startIdxStr) || 1;
    const padLengthStr = await ask('Número de dígitos para el índice (default 3): ');
    const padLength = parseInt(padLengthStr) || 3;
    const dryRunAnswer = await ask('¿Ejecutar en modo simulación? (s/n, default n): ');
    const dryRun = dryRunAnswer.toLowerCase().startsWith('s');
    await renameSeries({ root, searchPrefix, extension, finalPrefix, startIndex, padLength, dryRun });
  })();
}
