#!/usr/bin/env python3
"""Detecta stubs de re-export en un MF que NO reexportan default pero
son importados como default por algun archivo del MF.
Es un bug introducido por extract-shared.py cuando el archivo original
tenia `export default` y el stub solo hizo `export *`."""
import os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."

def is_stub(text):
    lines = [l for l in text.splitlines() if l.strip() and not l.strip().startswith("//")]
    if len(lines) > 5:
        return False
    return all(l.strip().startswith("export") for l in lines)

def has_default_reexport(text):
    return "export { default }" in text or "export default" in text

def get_target_default_export(stub_text, stub_path):
    """Si el stub hace `export * from 'X'`, busca X.tsx y mira si X tiene
    `export default`."""
    m = re.search(r"export\s+\*\s+from\s+['\"]([^'\"]+)['\"]", stub_text)
    if not m:
        return None
    target = m.group(1)
    base = os.path.normpath(os.path.join(os.path.dirname(stub_path), target))
    for ext in ("", ".tsx", ".ts", ".jsx", ".js"):
        if os.path.isfile(base + ext):
            with open(base + ext, "r", encoding="utf-8", errors="ignore") as fh:
                src = fh.read()
            return base + ext if "export default" in src else None
    return None

default_imports = {}
for dirpath, _, files in os.walk(ROOT):
    if "node_modules" in dirpath or "dist" in dirpath:
        continue
    for f in files:
        if not f.endswith((".ts", ".tsx", ".js", ".jsx")):
            continue
        p = os.path.join(dirpath, f)
        with open(p, "r", encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
        # Match: import Name from '...'
        # NO match: import { X } from '...'
        for m in re.finditer(
            r"^\s*import\s+(\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s+['\"]([^'\"]+)['\"]",
            text, re.MULTILINE
        ):
            imported_path = m.group(2)
            if imported_path.startswith(".") or imported_path.startswith("/"):
                base = os.path.normpath(os.path.join(os.path.dirname(p), imported_path))
                target = None
                for ext in ("", ".tsx", ".ts", ".jsx", ".js"):
                    if os.path.isfile(base + ext):
                        target = base + ext
                        break
                if target:
                    default_imports.setdefault(target, []).append(p)

problems = []
for target, importers in default_imports.items():
    try:
        with open(target, "r", encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
    except Exception:
        continue
    if not is_stub(text) or has_default_reexport(text):
        continue
    # El stub no tiene default. Pero el origen real podria no tener default
    # tampoco (en cuyo caso el `import X from 'Foo'` siempre fue invalido y
    # tampoco lo introdujimos nosotros).
    real = get_target_default_export(text, target)
    if real:
        problems.append((target, real, importers))

print(f"BUGS DETECTADOS: {len(problems)}\n")
for target, real, importers in problems:
    print(f"  STUB:  {target}")
    print(f"  REAL:  {real}  (tiene export default)")
    print(f"  IMPORTADO COMO DEFAULT POR:")
    for imp in importers[:5]:
        print(f"    - {imp}")
    print()

# Save list for fixing
with open("/tmp/missing_default_reexport.txt", "w") as fh:
    for target, _, _ in problems:
        fh.write(target + "\n")
print(f"Lista guardada en /tmp/missing_default_reexport.txt")

