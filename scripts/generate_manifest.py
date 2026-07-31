import os
import re
import json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
EXTS_JS = {'.js', '.jsx', '.ts', '.tsx'}
EXTS_PY = {'.py'}
IGNORE_DIRS = {'node_modules', '.git', 'venv', 'env', '__pycache__', 'dist', 'build', 'frontend/node_modules'}

js_export_re = re.compile(r"export\s+default\s+function\s+([A-Za-z0-9_$]+)|export\s+default\s*(?:\w+)?|export\s+(?:function|class)\s+([A-Za-z0-9_$]+)|export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)|module\.exports\s*=\s*([A-Za-z0-9_$]+)|exports\.([A-Za-z0-9_$]+)\s*=", re.M)
py_def_re = re.compile(r"^\s*def\s+([A-Za-z0-9_]+)\s*\(|^\s*class\s+([A-Za-z0-9_]+)\s*[:\(]", re.M)

manifest = []
file_count = 0
symbols_count = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    # filter ignored directories
    dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
    for fname in filenames:
        _, ext = os.path.splitext(fname)
        if ext.lower() not in EXTS_JS and ext.lower() not in EXTS_PY:
            continue
        path = os.path.join(dirpath, fname)
        rel = os.path.relpath(path, ROOT).replace('\\', '/')
        try:
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
        except Exception as e:
            continue
        file_count += 1
        entry = {'file': rel, 'symbols': []}
        if ext.lower() in EXTS_JS:
            for m in js_export_re.finditer(text):
                # find the first non-None group
                name = None
                for g in m.groups():
                    if g:
                        name = g
                        break
                if name is None:
                    # could be `export default ...` anonymous
                    name = 'default'
                kind = 'export'
                entry['symbols'].append({'name': name, 'kind': kind, 'line': text[:m.start()].count('\n')+1})
        elif ext.lower() in EXTS_PY:
            for m in py_def_re.finditer(text):
                name = m.group(1) or m.group(2)
                kind = 'function' if m.group(1) else 'class'
                entry['symbols'].append({'name': name, 'kind': kind, 'line': text[:m.start()].count('\n')+1})
        symbols_count += len(entry['symbols'])
        manifest.append(entry)

out = {
    'generated_from': ROOT,
    'file_count': file_count,
    'symbols_count': symbols_count,
    'files': manifest
}

with open(os.path.join(ROOT, 'manifest_exports.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2)

print(f'Wrote manifest_exports.json with {file_count} files and {symbols_count} symbols')
