#!/usr/bin/env python3
"""
FASE 2: Mover archivos SHARED a un paquete compartido y dejar las copias
en cada MF como un thin re-export.

  - Para cada archivo SHARED (mismo MD5 en >=2 MFs y al menos uno lo importa):
      1) Copiar el contenido a microfrontends/packages/shared-ui/src/<rel-path>
         (preservando estructura).
      2) Reemplazar todas las copias en los MFs por:
            export * from '<rel-import>';
            export { default } from '<rel-import>';
         (segun corresponda; solo el wildcard si no hay default).
  - Conserva imports relativos hacia OTROS archivos shared (porque se moveran
    en la misma operacion al mismo arbol).

Cero cambios en consumidores: cada MF sigue importando desde su ruta original.
"""
import hashlib, os, re, shutil, sys
from collections import defaultdict

ROOT = "microfrontends/apps"
PKG_ROOT = "microfrontends/packages/shared-ui"
PKG_SRC = os.path.join(PKG_ROOT, "src")
EXCLUDE_DIRS = {"node_modules", "dist", ".next", "build", ".turbo"}
CODE_EXTS = {".ts", ".tsx", ".js", ".jsx"}
EXTS = CODE_EXTS | {".json", ".css"}

DRY_RUN = "--apply" not in sys.argv

# Solo migrar archivos cuya ruta empiece por uno de estos prefijos.
# Vacio = todos. Pasar --only types,utils,config para acotar.
ONLY_PREFIXES = []
for arg in sys.argv:
    if arg.startswith("--only="):
        ONLY_PREFIXES = arg.split("=", 1)[1].split(",")

def matches_prefix_filter(rel: str) -> bool:
    if not ONLY_PREFIXES:
        return True
    for pref in ONLY_PREFIXES:
        if rel == pref or rel.startswith(pref.rstrip("/") + "/"):
            return True
    return False

def is_already_stub(text: str) -> bool:
    """Detecta archivos que ya son re-exports thin (4-6 lineas, solo export *)."""
    lines = [l for l in text.splitlines() if l.strip() and not l.strip().startswith("//")]
    if len(lines) > 4:
        return False
    return all(re.match(r"^\s*export\s+", l) for l in lines)

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

# 2) Per-MF source for usage detection
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

ENTRY_BASENAMES = {"index", "App", "main"}

def is_referenced(mf_name, target_path):
    base = os.path.splitext(os.path.basename(target_path))[0]
    if base in ENTRY_BASENAMES:
        return True
    pat = re.compile(
        r"""(?:from|import)\s*\(?\s*['"`]([^'"`]*?/)?""" + re.escape(base) +
        r"""(?:\.tsx?|\.jsx?|\.css|\.json)?['"`]""",
        re.MULTILINE,
    )
    for src_path, text in mf_sources.get(mf_name, {}).items():
        if src_path == target_path:
            continue
        if pat.search(text):
            return True
    return False

def mf_of(p):
    return p.split(os.sep)[2]

def rel_in_mf(p):
    """Devuelve la ruta relativa dentro del MF.
    e.g. microfrontends/apps/mf-admin/components/ui/Card.tsx -> components/ui/Card.tsx
    """
    return os.sep.join(p.split(os.sep)[3:])

# Toolchain files we never touch (only relevant if some leaked into SHARED group):
TOOLCHAIN_FILES = {
    "tsconfig.json","package.json","vercel.json","metadata.json",
    "tailwind.config.js","tailwind.config.ts","postcss.config.js",
    "vite.config.ts","vite.config.js","nginx.conf","Dockerfile",
    "vite-env.d.ts","env.d.ts",
}

# 3) Determine SHARED groups (copies in >=2 MFs that actually import them)
shared_to_move = []
for h, files in dup_groups:
    used_count = sum(1 for p in files if is_referenced(mf_of(p), p))
    if used_count < 2:
        continue
    base = os.path.basename(files[0])
    if base in TOOLCHAIN_FILES:
        continue
    name = os.path.splitext(base)[0]
    if name in ENTRY_BASENAMES:
        # entrypoints differ per MF; never share
        continue
    rel = rel_in_mf(files[0])
    if not matches_prefix_filter(rel):
        continue
    # Skip if any copy is already a thin stub (we already migrated this earlier)
    try:
        with open(files[0], "r", encoding="utf-8", errors="ignore") as fh:
            head = fh.read()
        if is_already_stub(head):
            continue
    except Exception:
        pass
    shared_to_move.append((rel, files))

# Group by rel path: in case the same logical file appears with different
# hashes in different MF subsets, we only consolidate the largest hash group.
by_rel = defaultdict(list)
for rel, files in shared_to_move:
    by_rel[rel].append(files)

print(f"Archivos SHARED unicos a mover a packages/shared-ui: {len(by_rel)}")
print(f"Total copias a reemplazar por re-export: {sum(len(f) for files_list in by_rel.values() for f in files_list)}")

# Detect potential conflicts where same rel path has multiple hash groups
conflicts = {rel: groups for rel, groups in by_rel.items() if len(groups) > 1}
if conflicts:
    print(f"\n⚠️  ATENCION: {len(conflicts)} rutas con MULTIPLES versiones (hashes distintos).")
    print("    Estas se OMITEN para evitar elegir version equivocada:")
    for rel, gs in list(conflicts.items())[:10]:
        print(f"    - {rel}  ({len(gs)} versiones)")

# Plan
plan = []
for rel, groups_list in by_rel.items():
    if len(groups_list) > 1:
        continue  # skip ambiguous
    files = groups_list[0]
    plan.append((rel, files))

print(f"\nPlan final: mover {len(plan)} archivos a packages/shared-ui/src/")

if DRY_RUN:
    print("\n=== DRY RUN === (usa --apply para ejecutar)\n")
    for rel, files in plan[:15]:
        print(f"  {rel}  ({len(files)} copias)")
    if len(plan) > 15:
        print(f"  ... y {len(plan)-15} mas")
    sys.exit(0)

# 4) Execute the plan
def make_relative_import(from_path: str, to_path: str) -> str:
    """Calcula el import relativo desde from_path (archivo en MF) hacia
    to_path (archivo en packages/shared-ui/src). Sin extension."""
    from_dir = os.path.dirname(from_path)
    rel = os.path.relpath(to_path, from_dir)
    # remove extension
    rel_no_ext = re.sub(r"\.(tsx?|jsx?)$", "", rel)
    if not rel_no_ext.startswith("."):
        rel_no_ext = "./" + rel_no_ext
    return rel_no_ext

def has_default_export(text: str) -> bool:
    return bool(re.search(r"^\s*export\s+default\b", text, re.MULTILINE))

moved = 0
re_exported = 0

for rel, files in plan:
    # Source file (use the first one; all have same MD5)
    src = files[0]
    with open(src, "r", encoding="utf-8", errors="ignore") as fh:
        content = fh.read()

    dst = os.path.join(PKG_SRC, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "w", encoding="utf-8") as fh:
        fh.write(content)
    moved += 1

    has_def = has_default_export(content)

    # Replace each copy in MFs with thin re-export
    for orig in files:
        rel_import = make_relative_import(orig, dst)
        if has_def:
            stub = (
                f"// Re-export desde paquete compartido (single source of truth)\n"
                f"// Fuente: {dst}\n"
                f"export * from '{rel_import}';\n"
                f"export {{ default }} from '{rel_import}';\n"
            )
        else:
            stub = (
                f"// Re-export desde paquete compartido (single source of truth)\n"
                f"// Fuente: {dst}\n"
                f"export * from '{rel_import}';\n"
            )
        with open(orig, "w", encoding="utf-8") as fh:
            fh.write(stub)
        re_exported += 1

print(f"\nCompletado: {moved} archivos movidos a packages/shared-ui/src/")
print(f"           {re_exported} stubs de re-export generados en MFs")



