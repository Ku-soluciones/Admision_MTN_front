#!/usr/bin/env python3
"""
Repara imports relativos en archivos movidos a packages/shared-ui/src/.
Cuando un archivo que vivia en microfrontends/apps/<mf>/X importaba
'../../../packages/backend-sdk/src/index' (3 niveles arriba para llegar
a microfrontends/), tras moverlo a packages/shared-ui/src/X ese mismo
import deberia ser '../../../backend-sdk/src/index' o equivalente.

Reescribe imports relativos `'../../...'` calculando la ruta correcta
asumiendo que el archivo VIVIA en microfrontends/apps/<mf>/<rel> y ahora
vive en microfrontends/packages/shared-ui/src/<rel>.
"""
import os, re, sys

PKG_SRC = "microfrontends/packages/shared-ui/src"
# Ruta original de cualquier archivo (asumida): microfrontends/apps/<mf>/<rel>
# Para resolver imports usaremos el primer MF como referencia (todos los MFs
# tienen la misma estructura, asi que el resultado es el mismo).
REFERENCE_MF = "microfrontends/apps/mf-admissions"

import_re = re.compile(
    r"""(from|import)(\s*\(?\s*)(['"])(\.\.?(?:/[^'"]+)*)\3""",
    re.MULTILINE,
)

DRY_RUN = "--apply" not in sys.argv
fixed_files = 0
fixed_imports = 0
unresolved = []

for dirpath, _, filenames in os.walk(PKG_SRC):
    for f in filenames:
        if not f.endswith((".ts", ".tsx", ".js", ".jsx")):
            continue
        path = os.path.join(dirpath, f)
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            text = fh.read()

        # Compute the original location: replace prefix
        rel_in_pkg = os.path.relpath(path, PKG_SRC)  # e.g. services/api.ts
        original_dir = os.path.join(REFERENCE_MF, os.path.dirname(rel_in_pkg))
        # Current dir (in the package):
        new_dir = os.path.dirname(path)

        changes = []

        def repl(m):
            global fixed_imports
            kw, sp, q, target = m.group(1), m.group(2), m.group(3), m.group(4)

            # Try to resolve `target` from the CURRENT location (in the package).
            current_resolved = os.path.normpath(os.path.join(new_dir, target))

            def exists_with_ext(base):
                if os.path.exists(base):
                    return True
                for ext in (".ts", ".tsx", ".js", ".jsx", ".json", ".css"):
                    if os.path.exists(base + ext):
                        return True
                if os.path.isdir(base):
                    for ext in (".ts", ".tsx", ".js", ".jsx"):
                        if os.path.exists(os.path.join(base, "index" + ext)):
                            return True
                return False

            # If it already resolves correctly inside the package, leave it alone.
            if exists_with_ext(current_resolved):
                return m.group(0)

            # Otherwise, compute the equivalent path from the original location.
            old_resolved = os.path.normpath(os.path.join(original_dir, target))
            if not exists_with_ext(old_resolved):
                # Cannot resolve from the old location either: warn and skip
                unresolved.append((path, target))
                return m.group(0)

            # Re-express old_resolved relative to new_dir
            new_rel = os.path.relpath(old_resolved, new_dir)
            if not new_rel.startswith("."):
                new_rel = "./" + new_rel
            if new_rel == target:
                return m.group(0)
            changes.append((target, new_rel))
            fixed_imports += 1
            return f"{kw}{sp}{q}{new_rel}{q}"

        new_text = import_re.sub(repl, text)
        if new_text != text:
            fixed_files += 1
            if DRY_RUN:
                print(f"  WOULD FIX: {path}")
                for old, new in changes:
                    print(f"     {old}  ->  {new}")
            else:
                with open(path, "w", encoding="utf-8") as fh:
                    fh.write(new_text)

print(f"\nFixed files: {fixed_files}, fixed imports: {fixed_imports}")
if unresolved:
    print(f"\n⚠️  No se pudo resolver {len(unresolved)} imports:")
    for p, t in unresolved[:20]:
        print(f"   {p}  ->  {t}")
if DRY_RUN:
    print("=== DRY RUN === (usa --apply)")



