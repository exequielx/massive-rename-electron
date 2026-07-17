/*
  Renombrador masivo de series/subtítulos.
  - Pregunta la ubicación raíz.
  - Pregunta el prefijo que identifica los archivos a renombrar.
  - Opcionalmente filtra por extensión.
  - Pregunta el prefijo final del nuevo nombre.
  - Genera nombres con un índice creciente (padded a 3 dígitos).
  - Renombra archivos (y directorios que coincidan) de forma recursiva.
*/

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('=== Renombrador Masivo de Series / Subtítulos ===');
  const root = await ask('Ubicación raíz (ruta completa): ');
  const searchPrefix = await ask('Prefijo que identificará los archivos (ej: "S01E"): ');
  const extension = await ask('Extensión a filtrar (ej: .mkv, .srt) o dejar vacío para todas: ');
  const finalPrefix = await ask('Prefijo final para los nuevos nombres (ej: "Serie_X_"): ');
  const startIdxStr = await ask('Número inicial del índice (default 1): ');
  const startIndex = parseInt(startIdxStr) || 1;
  const padLengthStr = await ask('Número de dígitos para el índice (default 3): ');
  const padLength = parseInt(padLengthStr) || 3;
  const dryRunAnswer = await ask('¿Ejecutar en modo simulación sin cambios reales? (s/n, default n): ');
  const dryRun = dryRunAnswer.toLowerCase().startsWith('s');

  if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory()) {
    console.error('⚠️ La ruta raíz no existe o no es una carpeta.');
    process.exit(1);
  }

  const matches = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // If it's a directory, optionally include it if it matches the prefix
      if (entry.isDirectory()) {
        if (entry.name.startsWith(searchPrefix)) {
          matches.push(fullPath);
        }
        // Recurse into the directory regardless to find nested matches
        walk(fullPath);
      } else {
        const matchesPrefix = entry.name.startsWith(searchPrefix);
        const matchesExt = extension ? entry.name.endsWith(extension) : true;
        if (matchesPrefix && matchesExt) {
          matches.push(fullPath);
        }
      }
    }
  }
  walk(root);

  if (matches.length === 0) {
    console.log('📁 No se encontraron archivos que coincidan con los criterios.');
    return;
  }

  console.log(`🔎 Encontrados ${matches.length} archivo(s).`);
  // Ordenar por profundidad (más profundo primero) para renombrar archivos antes de directorios contenedores
  matches.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);

  let idx = startIndex;
  for (const oldPath of matches) {
    const dir = path.dirname(oldPath);
    const ext = path.extname(oldPath);
    const newName = `${finalPrefix}${String(idx).padStart(padLength, '0')}${ext}`;
    const newPath = path.join(dir, newName);
    try {
      if (dryRun) {
        console.log(`🔸 [SIMULADO] Renombrado: ${path.basename(oldPath)} → ${newName}`);
      } else {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ Renombrado: ${path.basename(oldPath)} → ${newName}`);
      }
    } catch (e) {
      console.error(`❌ Error renombrando ${oldPath}: ${e.message}`);
    }
    idx++;
  }
  console.log('✅ Proceso completado.');
}

main();
