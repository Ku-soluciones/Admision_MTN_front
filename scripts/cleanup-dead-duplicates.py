#!/usr/bin/env python3
"""
FASE 1: Limpiar archivos duplicados que NADIE importa en su propio MF.

Aplica los siguientes filtros de seguridad:
  - Excluye archivos de configuracion (tsconfig.json, package.json, vercel.json,
    tailwind.config.js, vite.config.ts, metadata.json, nginx.conf, vite-env.d.ts)
    que el toolchain lee directamente sin import.
  - Excluye entrypoints (index.tsx, App.tsx, main.tsx).
  - Excluye index.ts barrels (los marca como dead pero pueden ser leidos por bundler).
  - Para grupos OWNER: solo borra las copias en MFs que NO son el owner.
"""
import hashlib, os, re, sys
from collections import defaultdict

ROOT = "microfrontends/apps"
EXCLUDE_DIRS = {"node_modules", "dist", ".next", "build", ".turbo"}
CODE_EXTS = {".ts", ".tsx", ".js", ".jsx"}
EXTS = CODE_EXTS | {".json", ".css"}

# Archivos que el toolchain lee sin "import": NUNCA borrar
TOOLCHAIN_FILES = {
    "tsconfig.json", "tsconfig.node.json", "tsconfig.app.json",
    "package.json", "package-lock.json",
    "vercel.json", "metadata.json",
    "tailwind.config.js", "tailwind.config.ts",
    "postcss.config.js", "postcss.config.cjs",
    "vite.config.ts", "vite.config.js",
    "nginx.conf", "Dockerfile",
    "vite-env.d.ts", "env.d.ts",
}
# Entrypoints/barrels: nunca borrar
ENTRY_BASENAMES = {"index", "App", "main"}

DRY_RUN = "--apply" not in sys.argv

# 1) Group duplicates
groups = defaultdict(list)
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for f in filenames:
        ext = os.path.splitext(f)[1]
        if ext not in EXTS:
            continue
        p = os.path.join(dirpath, f)
        try:
            with open(p, "rb") as fh:
                data = fh.read()
            if len(data) < 50:
                continue
            h = hashlib.md5(data).hexdigest()
            groups[h].append(p)
        except Exception:
            pass

dup_groups = [(h, files) for h, files in groups.items() if len(files) >= 2]

# 2) Per-MF source index for reference detection
mf_sources = {}
for mf in sorted(os.listdir(ROOT)):
    mf_dir = os.path.join(ROOT, mf)
    if not os.path.isdir(mf_dir):
        continue
    mf_sources[mf] = {}
    for dirpath, dirnames, filenames in os.walk(mf_dir):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for f in filenames:
            ext = os.path.splitext(f)[1]
            if ext not in CODE_EXTS:
                continue
            p = os.path.join(dirpath, f)
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as fh:
                    mf_sources[mf][p] = fh.read()
            except Exception:
                pass

# 2b) Indexa tambien microfrontends/packages/* (codigo compartido).
# Si un archivo del paquete compartido importa "Foo", entonces "Foo"
# esta vivo en cualquier MF que aun lo tenga como stub.
PKG_ROOT = "microfrontends/packages"
shared_sources = {}
if os.path.isdir(PKG_ROOT):
    for dirpath, dirnames, filenames in os.walk(PKG_ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for f in filenames:
            ext = os.path.splitext(f)[1]
            if ext not in CODE_EXTS:
                continue
            p = os.path.join(dirpath, f)
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as fh:
                    shared_sources[p] = fh.read()
            except Exception:
                pass

def is_thin_stub(text: str) -> bool:
    """True si el archivo es un re-export delgado generado por extract-shared.py."""
    lines = [l for l in text.splitlines() if l.strip() and not l.strip().startswith("//")]
    if len(lines) > 4:
        return False
    return all(re.match(r"^\s*export\s+", l) for l in lines)

def is_referenced(mf_name, target_path):
    base = os.path.splitext(os.path.basename(target_path))[0]
    if base in ENTRY_BASENAMES:
        return True
    pat = re.compile(
        r"""(?:from|import)\s*\(?\s*['"`]([^'"`]*?/)?""" + re.escape(base) +
        r"""(?:\.tsx?|\.jsx?|\.css|\.json)?['"`]""",
        re.MULTILINE,
    )
    # Buscar en el propio MF
    for src_path, text in mf_sources.get(mf_name, {}).items():
        if src_path == target_path:
            continue
        if pat.search(text):
            return True
    # Buscar tambien en el codigo compartido (paquete shared-ui/shared-utils)
    for src_path, text in shared_sources.items():
        if pat.search(text):
            return True
    return False

def mf_of(p):
    return p.split(os.sep)[2]

def is_safe_to_delete(p):
    """No borrar archivos del toolchain ni entrypoints ni stubs delgados."""
    base = os.path.basename(p)
    if base in TOOLCHAIN_FILES:
        return False
    name = os.path.splitext(base)[0]
    if name in ENTRY_BASENAMES:
        return False
    # Nunca borrar stubs delgados: son la fachada de retrocompatibilidad
    try:
        with open(p, "r", encoding="utf-8", errors="ignore") as fh:
            head = fh.read()
        if is_thin_stub(head):
            return False
    except Exception:
        pass
    return True
    return True

# 3) Decide what to delete
to_delete = []
skipped_toolchain = []

for h, files in dup_groups:
    used_mfs, dead_mfs = [], []
    for p in files:
        mf = mf_of(p)
        if is_referenced(mf, p):
            used_mfs.append((mf, p))
        else:
            dead_mfs.append((mf, p))

    if not used_mfs:
        # All copies are dead -> only safe-to-delete copies are removed.
        for _, p in dead_mfs:
            if is_safe_to_delete(p):
                to_delete.append(p)
            else:
                skipped_toolchain.append(p)
    elif len(used_mfs) == 1:
        # Owner exists -> delete dead copies in non-owner MFs
        for _, p in dead_mfs:
            if is_safe_to_delete(p):
                to_delete.append(p)
            else:
                skipped_toolchain.append(p)
    else:
        # SHARED: skip in this phase
        pass

to_delete = sorted(set(to_delete))
skipped_toolchain = sorted(set(skipped_toolchain))

print(f"Archivos a BORRAR (dead duplicates seguros): {len(to_delete)}")
print(f"Archivos OMITIDOS (toolchain/entrypoints):    {len(skipped_toolchain)}")
print()

if DRY_RUN:
    print("=== DRY RUN === (usa --apply para borrar)\n")
    print("Primeros 30 a borrar:")
    for p in to_delete[:30]:
        print(f"  - {p}")
    if len(to_delete) > 30:
        print(f"  ... y {len(to_delete)-30} mas")
    print()
    print("Primeros 20 omitidos por toolchain:")
    for p in skipped_toolchain[:20]:
        print(f"  ~ {p}")
else:
    deleted = 0
    for p in to_delete:
        try:
            os.remove(p)
            deleted += 1
        except Exception as e:
            print(f"  ! Error borrando {p}: {e}")
    print(f"Borrados: {deleted}/{len(to_delete)}")

# Save list anyway
with open("/tmp/phase1_deleted.txt", "w") as fh:
    fh.write("\n".join(to_delete))
print()
print("Lista guardada en /tmp/phase1_deleted.txt")

