#!/usr/bin/env python3
"""
Para cada archivo duplicado en >=2 MFs, determina en cuáles MFs realmente
se importa. Clasifica:
  - DEAD  : nadie importa el archivo en ningún MF.
  - OWNER : solo 1 MF lo importa; el resto son copias muertas.
  - SHARED: varios MFs lo importan -> candidato a paquete compartido.
"""
import hashlib, os, re
from collections import defaultdict

ROOT = "microfrontends/apps"
EXCLUDE_DIRS = {"node_modules", "dist", ".next", "build", ".turbo"}
CODE_EXTS = {".ts", ".tsx", ".js", ".jsx"}
EXTS = CODE_EXTS | {".json", ".css"}

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

def is_referenced(mf_name, target_path):
    base = os.path.splitext(os.path.basename(target_path))[0]
    if base in {"index", "App"}:
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

def mf_of(path):
    return path.split(os.sep)[2]

print(f"{'STATUS':<7} {'COPIES':>6} {'USED':>5} {'DEAD':>5}  RELATIVE_PATH (used in MFs)")
print("-" * 130)

summary = {"all_dead": 0, "single_owner": 0, "shared": 0}
all_dead_files = []
single_owner_files = []
shared_files = []

dup_groups.sort(key=lambda x: -os.path.getsize(x[1][0]) * len(x[1]))

for h, files in dup_groups:
    used_mfs, dead_mfs = [], []
    for p in files:
        mf = mf_of(p)
        if is_referenced(mf, p):
            used_mfs.append((mf, p))
        else:
            dead_mfs.append((mf, p))

    rel = files[0].replace(ROOT + "/", "")
    rel_no_mf = "/".join(rel.split("/")[1:])

    if not used_mfs:
        status = "DEAD"
        summary["all_dead"] += 1
        all_dead_files.extend([p for _, p in dead_mfs])
        owners_str = "-"
    elif len(used_mfs) == 1:
        status = "OWNER"
        summary["single_owner"] += 1
        single_owner_files.append((used_mfs[0], [p for _, p in dead_mfs]))
        owners_str = used_mfs[0][0]
    else:
        status = "SHARED"
        summary["shared"] += 1
        shared_files.append((files, [m for m, _ in used_mfs]))
        owners_str = ",".join(sorted({m for m, _ in used_mfs}))

    print(f"{status:<7} {len(files):>6} {len(used_mfs):>5} {len(dead_mfs):>5}  {rel_no_mf:<70} [{owners_str}]")

print()
print("=" * 130)
print("RESUMEN:")
print(f"  DEAD   (todas las copias son codigo muerto): {summary['all_dead']:>4} grupos")
print(f"  OWNER  (1 MF lo usa, el resto son muertas): {summary['single_owner']:>4} grupos")
print(f"  SHARED (varios MFs lo usan de verdad)     : {summary['shared']:>4} grupos")
dead_total = len(all_dead_files) + sum(len(d) for _, d in single_owner_files)
print(f"  Archivos seguros para BORRAR              : {dead_total}")

with open("/tmp/dead_files.txt", "w") as fh:
    for p in all_dead_files:
        fh.write(p + "\n")
    for _, deads in single_owner_files:
        for p in deads:
            fh.write(p + "\n")

with open("/tmp/shared_groups.txt", "w") as fh:
    for files, used_mfs in shared_files:
        fh.write("|".join(used_mfs) + "::" + "::".join(files) + "\n")

print()
print("Listas guardadas en /tmp/dead_files.txt y /tmp/shared_groups.txt")

