/*
  Renombrador masivo de series/subtítulos.
  - Puede usarse como módulo (require) desde Electron o como script CLI.
  - Acepta un objeto con: root (carpeta) ó files (array de rutas),
    seriesName, season, startIndex, padLength, dryRun.
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
    seriesName = '',
    season = '',
    startIndex = 1,
    padLength = 2,
    dryRun = false,
    // Legacy support for CLI
    searchPrefix = '',
    extension = '',
    finalPrefix = '',
  } = options;

  const logs = [];
  const log = (msg) => { logs.push(msg); console.log(msg); };

  const matches = [];

  // MODE A: files were dropped directly (array of paths)
  if (files && files.length > 0) {
    // Sort files alphabetically to ensure episode order matches alphabetical file order
    const sortedFiles = [...files].sort((a, b) => a.localeCompare(b));
    matches.push(...sortedFiles);
  }
  // MODE B: scan a root directory recursively (CLI / Legacy)
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
          if (searchPrefix && entry.name.startsWith(searchPrefix)) matches.push(fullPath);
          walk(fullPath);
        } else {
          const okPrefix = searchPrefix ? entry.name.startsWith(searchPrefix) : true;
          const okExt = extension ? entry.name.endsWith(extension) : true;
          if (okPrefix && okExt) matches.push(fullPath);
        }
      }
    }
    walk(root);
    // Sort deeper paths first so we rename files before their parent dirs
    matches.sort((a, b) => {
      const depthA = a.split(path.sep).length;
      const depthB = b.split(path.sep).length;
      if (depthA !== depthB) return depthB - depthA;
      return a.localeCompare(b);
    });
  } else {
    log('⚠️ No se proporcionó carpeta raíz ni archivos.');
    return logs;
  }

  if (matches.length === 0) {
    log('📁 No se encontraron archivos para renombrar.');
    return logs;
  }

  log(`🔎 Procesando ${matches.length} archivo(s)...`);

  let idx = startIndex;
  for (const oldPath of matches) {
    const dir = path.dirname(oldPath);
    const ext = path.extname(oldPath);

    // Construct new filename
    let newName = '';
    if (seriesName || season) {
      const paddedSeason = String(season).padStart(2, '0');
      const paddedEpisode = String(idx).padStart(padLength, '0');
      const namePart = seriesName ? `${seriesName} ` : '';
      newName = `${namePart}S${paddedSeason}E${paddedEpisode}${ext}`;
    } else {
      // Fallback to legacy finalPrefix pattern
      newName = `${finalPrefix}${String(idx).padStart(padLength, '0')}${ext}`;
    }

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
    console.log('=== Renombrador Masivo de Series / Subtítulos (CLI) ===');
    const root = await ask('Ubicación raíz (ruta completa): ');
    const seriesName = await ask('Nombre de la serie (ej: "Beacon 23"): ');
    const season = await ask('Temporada (ej: "1"): ');
    const startIdxStr = await ask('Episodio inicial (default 1): ');
    const startIndex = parseInt(startIdxStr) || 1;
    const padLengthStr = await ask('Dígitos para el episodio (default 2): ');
    const padLength = parseInt(padLengthStr) || 2;
    const dryRunAnswer = await ask('¿Ejecutar en modo simulación? (s/n, default n): ');
    const dryRun = dryRunAnswer.toLowerCase().startsWith('s');
    await renameSeries({ root, seriesName, season, startIndex, padLength, dryRun });
  })();
}
