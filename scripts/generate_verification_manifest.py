import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INPATH = os.path.join(ROOT, 'manifest_exports.json')
OUTPATH = os.path.join(ROOT, 'verification_manifest.json')

with open(INPATH, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

verification = {
    'generated_from': manifest.get('generated_from'),
    'file_count': manifest.get('file_count'),
    'symbols_count': manifest.get('symbols_count'),
    'modules': {}
}

for entry in manifest['files']:
    file = entry['file']
    parts = file.split('/')
    top = parts[0] if parts else ''
    lang = 'py' if file.endswith('.py') else 'js'
    item = {
        'file': file,
        'language': lang,
        'symbol_count': len(entry['symbols']),
        'symbols': entry['symbols']
    }
    verification['modules'].setdefault(top, []).append(item)

# sort files in each module by symbol_count desc
for top, lst in verification['modules'].items():
    lst.sort(key=lambda x: -x['symbol_count'])

with open(OUTPATH, 'w', encoding='utf-8') as f:
    json.dump(verification, f, indent=2)

print('Wrote verification_manifest.json')
