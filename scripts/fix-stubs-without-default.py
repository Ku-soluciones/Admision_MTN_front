#!/usr/bin/env python3
"""Inverso de fix-all-stubs-default.py:
Quita la linea `export { default } from '...'` de los stubs cuyo origen
NO tenga `export default` (siguiendo cadenas de re-export). Esto evita
errores de runtime tipo "does not provide an export named 'default'"."""
import os, re

ROOT = "microfrontends/apps"

def resolve_target(stub_path, target_str):
    base = os.path.normpath(os.path.join(os.path.dirname(stub_path), target_str))
    for ext in (".tsx", ".ts", ".jsx", ".js", ""):
        if os.path.isfile(base + ext):
            return base + ext
    for ext in (".tsx", ".ts", ".jsx", ".js"):
        idx = os.path.join(base, "index" + ext)
        if os.path.isfile(idx):
            return idx
    return None

def file_has_default(path, visited=None):
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
    for m in re.finditer(r"export\s+\*\s+from\s+['\"]([^'\"]+)['\"]", text):
        target = resolve_target(path, m.group(1))
        if target and file_has_default(target, visited):
            return True
    return False

fixed = 0
default_re = re.compile(
    r"^\s*export\s*\{\s*default\s*\}\s*from\s+['\"]([^'\"]+)['\"]\s*;?\s*$",
    re.MULTILINE,
)

for dirpath, _, files in os.walk(ROOT):
    if "node_modules" in dirpath or "dist" in dirpath:
        continue
    for f in files:
        if not f.endswith((".ts", ".tsx", ".js", ".jsx")):
            continue
        p = os.path.join(dirpath, f)
        with open(p, "r", encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
        m = default_re.search(text)
        if not m:
            continue
        target_str = m.group(1)
        real = resolve_target(p, target_str)
        if not real or file_has_default(real):
            continue
        # El stub reexporta default pero el origen NO tiene default -> ROMPE
        new_text = default_re.sub("", text).rstrip() + "\n"
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(new_text)
        print(f"  fixed: {p}")
        print(f"    (origen sin default: {real})")
        fixed += 1

print(f"\nTotal stubs reparados: {fixed}")

