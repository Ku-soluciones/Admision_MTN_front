#!/usr/bin/env python3
"""Repara todos los stubs en mf-* asegurando que reexporten el default
del archivo original cuando el origen tenga `export default`.
Tambien anade `export { default }` cuando el archivo del paquete
re-exporta de otro archivo que tiene default."""
import os, re

ROOT = "microfrontends/apps"

def is_stub(text):
    lines = [l for l in text.splitlines() if l.strip() and not l.strip().startswith("//")]
    if len(lines) > 6:
        return False
    return all(l.strip().startswith("export") for l in lines) and len(lines) > 0

def has_default_reexport(text):
    return bool(re.search(r"export\s*\{\s*default\s*\}", text)) or "export default" in text

def resolve_target(stub_path, target_str):
    base = os.path.normpath(os.path.join(os.path.dirname(stub_path), target_str))
    for ext in (".tsx", ".ts", ".jsx", ".js", ""):
        if os.path.isfile(base + ext):
            return base + ext
    # Try as folder with index
    for ext in (".tsx", ".ts", ".jsx", ".js"):
        idx = os.path.join(base, "index" + ext)
        if os.path.isfile(idx):
            return idx
    return None

def file_has_default(path, visited=None):
    """True si `path` exporta default, siguiendo cadenas de re-export."""
    if visited is None:
        visited = set()
    if path in visited:
        return False
    visited.add(path)
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
    except Exception:
        return False
    if re.search(r"^\s*export\s+default\b", text, re.MULTILINE):
        return True
    if re.search(r"export\s*\{\s*default\s*\}", text):
        return True
    # Si tiene `export * from 'X'` y X tiene default, propaga
    for m in re.finditer(r"export\s+\*\s+from\s+['\"]([^'\"]+)['\"]", text):
        target = resolve_target(path, m.group(1))
        if target and file_has_default(target, visited):
            return True
    return False

fixed = 0
for dirpath, _, files in os.walk(ROOT):
    if "node_modules" in dirpath or "dist" in dirpath:
        continue
    for f in files:
        if not f.endswith((".ts", ".tsx", ".js", ".jsx")):
            continue
        p = os.path.join(dirpath, f)
        with open(p, "r", encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
        if not is_stub(text) or has_default_reexport(text):
            continue
        m = re.search(r"export\s+\*\s+from\s+['\"]([^'\"]+)['\"]", text)
        if not m:
            continue
        target_str = m.group(1)
        real = resolve_target(p, target_str)
        if not real:
            continue
        if not file_has_default(real):
            continue
        new_stub = text.rstrip() + f"\nexport {{ default }} from '{target_str}';\n"
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(new_stub)
        print(f"  fixed: {p}")
        fixed += 1

print(f"\nTotal stubs reparados: {fixed}")

