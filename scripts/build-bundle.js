const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const FILES = [
  { rel: 'index.html', type: 'text/html; charset=UTF-8', aliases: ['/', '/index', '/index.html'] },
  { rel: 'analyze.html', type: 'text/html; charset=UTF-8', aliases: ['/analyze', '/analyze.html'] },
  { rel: path.join('css', 'style.css'), type: 'text/css; charset=UTF-8', aliases: ['/css/style.css'] },
  { rel: path.join('css', 'dashboard.css'), type: 'text/css; charset=UTF-8', aliases: ['/css/dashboard.css'] },
  { rel: path.join('js', 'config.js'), type: 'application/javascript; charset=UTF-8', aliases: ['/js/config.js'] },
  { rel: path.join('js', 'camera.js'), type: 'application/javascript; charset=UTF-8', aliases: ['/js/camera.js'] },
  { rel: path.join('js', 'nutrition.js'), type: 'application/javascript; charset=UTF-8', aliases: ['/js/nutrition.js'] },
  { rel: path.join('js', 'dashboard.js'), type: 'application/javascript; charset=UTF-8', aliases: ['/js/dashboard.js'] },
  { rel: path.join('js', 'app.js'), type: 'application/javascript; charset=UTF-8', aliases: ['/js/app.js'] }
];

console.log('⚡ NutriVision AI: Synchronizing static assets and building in-memory bundle...');

// 1. Mirror all assets into public/
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(path.join(PUBLIC_DIR, 'css'), { recursive: true });
fs.mkdirSync(path.join(PUBLIC_DIR, 'js'), { recursive: true });

const bundleMap = {};

for (const item of FILES) {
  const srcPath = path.join(ROOT_DIR, item.rel);
  const destPath = path.join(PUBLIC_DIR, item.rel);

  if (!fs.existsSync(srcPath)) {
    console.error(`❌ Missing source asset: ${srcPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(srcPath);
  fs.writeFileSync(destPath, content);

  const b64 = content.toString('base64');
  for (const alias of item.aliases) {
    bundleMap[alias] = {
      type: item.type,
      b64: b64,
      size: content.length
    };
  }
}

// 2. Generate assets-bundle.js
const lines = [
  '// Auto-generated in-memory asset bundle for Vercel Serverless Function runtime',
  '// Generated at: ' + new Date().toISOString(),
  'const BUNDLE = {',
];

for (const [route, entry] of Object.entries(bundleMap)) {
  lines.push(`  ${JSON.stringify(route)}: {`);
  lines.push(`    contentType: ${JSON.stringify(entry.type)},`);
  lines.push(`    size: ${entry.size},`);
  lines.push(`    data: Buffer.from("${entry.b64}", "base64")`);
  lines.push('  },');
}

lines.push('};');
lines.push('');
lines.push('module.exports = BUNDLE;');
lines.push('');

const bundleDest = path.join(ROOT_DIR, 'assets-bundle.js');
fs.writeFileSync(bundleDest, lines.join('\n'), 'utf8');

console.log(`✅ Build complete: ${Object.keys(bundleMap).length} routes bundled into assets-bundle.js and public/ mirrored.`);
