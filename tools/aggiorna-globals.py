#!/usr/bin/env python3
"""Rigenera globals.json: tutte le funzioni e costanti globali dei file caricati da index.html.

I file di Nembo sono script globali senza import: ogni nome dichiarato in cima a un file
(function, const, let, var, anche con destrutturazione) è visibile negli altri.
ESLint (.eslintrc.cjs) legge globals.json per la regola no-undef.
Uso, dalla radice del repository:  python3 tools/aggiorna-globals.py
"""
import json, re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
order = [f for f in re.findall(r'<script src="([^"]+\.js)"', (root / 'index.html').read_text(encoding='utf-8')) if not f.startswith('vendor/')]
names = {}
for f in order:
    s = (root / f).read_text(encoding='utf-8')
    found = re.findall(r'^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)', s, re.M)
    found += re.findall(r'^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=', s, re.M)
    for grp in re.findall(r'^(?:const|let|var)\s+\{([^}]*)\}\s*=', s, re.M):
        for part in grp.split(','):
            part = part.strip()
            if part:
                found.append(part.split(':')[-1].split('=')[0].strip())
    for n in found:
        names.setdefault(n, 'readonly')
(root / 'globals.json').write_text(json.dumps(dict(sorted(names.items(), key=lambda x: x[0].lower())), indent=0, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'globals.json: {len(names)} nomi da {len(order)} file')
