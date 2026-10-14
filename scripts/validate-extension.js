// Sanity-checks the extension before packaging:
//  - manifest.json parses
//  - every file the manifest references exists
//  - data/default_lexicon.json is a valid JSON array
const fs = require('fs');

function fail(msg) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
}

let manifest;
try {
    manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
} catch (e) {
    console.error('FAIL: manifest.json is missing or not valid JSON: ' + e.message);
    process.exit(1);
}

const referenced = new Set();
const add = (f) => {
    if (typeof f === 'string' && f && !f.includes('*')) referenced.add(f);
};

for (const cs of manifest.content_scripts || []) {
    (cs.js || []).forEach(add);
    (cs.css || []).forEach(add);
}
if (manifest.background) {
    add(manifest.background.service_worker);
    (manifest.background.scripts || []).forEach(add);
}
const action = manifest.action || manifest.browser_action || {};
add(action.default_popup);
if (typeof action.default_icon === 'string') add(action.default_icon);
else Object.values(action.default_icon || {}).forEach(add);
Object.values(manifest.icons || {}).forEach(add);
add(manifest.options_page);
for (const war of manifest.web_accessible_resources || []) {
    if (typeof war === 'string') add(war);
    else (war.resources || []).forEach(add);
}

let ok = 0;
for (const f of [...referenced].sort()) {
    if (fs.existsSync(f)) {
        ok++;
    } else {
        fail('manifest references a missing file: ' + f);
    }
}

try {
    const lex = JSON.parse(fs.readFileSync('data/default_lexicon.json', 'utf8'));
    if (!Array.isArray(lex)) fail('data/default_lexicon.json is not a JSON array');
    else console.log('default_lexicon.json: ' + lex.length + ' entries');
} catch (e) {
    fail('data/default_lexicon.json problem: ' + e.message);
}

console.log(`manifest "${manifest.name}" v${manifest.version}: ${ok}/${referenced.size} referenced files found`);
if (!process.exitCode) console.log('OK');
