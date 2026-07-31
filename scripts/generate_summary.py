import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
with open(os.path.join(ROOT, 'manifest_exports.json'), 'r', encoding='utf-8') as f:
    manifest = json.load(f)

counts = {}
files_by_top = {}
for f in manifest['files']:
    parts = f['file'].split('/')
    top = parts[0] if parts else ''
    counts.setdefault(top, {'files':0, 'symbols':0})
    counts[top]['files'] += 1
    counts[top]['symbols'] += len(f['symbols'])
    files_by_top.setdefault(top, []).append(f)

# produce summary json
out = {'root': manifest['generated_from'], 'file_count': manifest['file_count'], 'symbols_count': manifest['symbols_count'], 'by_top': counts}
with open(os.path.join(ROOT, 'summary_by_top.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2)

# produce human readable markdown for main folders
md_lines = []
md_lines.append('# Project Module Summary')
md_lines.append('')
for top, data in sorted(counts.items(), key=lambda x: -x[1]['symbols']):
    md_lines.append(f'## {top} — {data["files"]} files, {data["symbols"]} symbols')
    # list up to 10 top files by symbol count
    files_sorted = sorted(files_by_top[top], key=lambda x: -len(x['symbols']))[:10]
    for fi in files_sorted:
        md_lines.append(f'- {fi["file"]}: {len(fi["symbols"])} symbols')
    md_lines.append('')

with open(os.path.join(ROOT, 'SUMMARY.md'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(md_lines))

print('Wrote summary_by_top.json and SUMMARY.md')
