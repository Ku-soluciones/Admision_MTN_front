#!/usr/bin/env python3
"""Consolida la version mayoritaria de los 2 servicios divergentes en
packages/shared-ui, dejando stub en los MFs que comparten esa version
y conservando la variante local en los MFs outliers (mf-evaluations,
mf-reports).
"""
import os, re, shutil

ROOT = "microfrontends/apps"
PKG_SRC = "microfrontends/packages/shared-ui/src"

CONSOLIDATIONS = [
    {
        "filename": "services/interviewService.ts",
        "majority_source": "mf-admissions",  # tiene la version sin newline final
        "majority_mfs": [
            "mf-admin",       # difiere solo por newline final
            "mf-admissions",
            "mf-coordinator",
            "mf-guardian",
            "mf-interviews",
            "mf-student",
        ],
        "outliers": ["mf-evaluations", "mf-reports"],  # variante intencional
    },
    {
        "filename": "services/interviewerScheduleService.ts",
        "majority_source": "mf-admissions",
        "majority_mfs": [
            "mf-admin",
            "mf-admissions",
            "mf-coordinator",
            "mf-guardian",
            "mf-interviews",
            "mf-student",
        ],
        "outliers": ["mf-evaluations", "mf-reports"],
    },
]

STUB_TEMPLATE_WITH_DEFAULT = (
    "// Re-export desde paquete compartido (version mayoritaria del servicio)\n"
    "// Fuente: microfrontends/packages/shared-ui/src/{rel}\n"
    "// Variante local conservada en: {outliers}\n"
    "export * from '../../../packages/shared-ui/src/{rel_no_ext}';\n"
    "export {{ default }} from '../../../packages/shared-ui/src/{rel_no_ext}';\n"
)
STUB_TEMPLATE_NO_DEFAULT = (
    "// Re-export desde paquete compartido (version mayoritaria del servicio)\n"
    "// Fuente: microfrontends/packages/shared-ui/src/{rel}\n"
    "// Variante local conservada en: {outliers}\n"
    "export * from '../../../packages/shared-ui/src/{rel_no_ext}';\n"
)

def has_default_export(text: str) -> bool:
    return bool(re.search(r"^\s*export\s+default\b", text, re.MULTILINE))

for c in CONSOLIDATIONS:
    rel = c["filename"]
    rel_no_ext = os.path.splitext(rel)[0]
    src = os.path.join(ROOT, c["majority_source"], rel)
    dst = os.path.join(PKG_SRC, rel)

    # Defensivo: verificar que el origen NO es ya un stub delgado
    with open(src, "r", encoding="utf-8", errors="ignore") as fh:
        src_text = fh.read()
    non_comment_lines = [
        l for l in src_text.splitlines()
        if l.strip() and not l.strip().startswith("//")
    ]
    if len(non_comment_lines) <= 4 and all(
        l.strip().startswith("export") for l in non_comment_lines
    ):
        print(f"⚠️  SKIP: {src} ya es un stub. Saltando para evitar copiar basura.")
        continue

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    print(f"Copied {src} -> {dst}")

    # Elegir el template segun el origen tenga export default o no
    template = (STUB_TEMPLATE_WITH_DEFAULT if has_default_export(src_text)
                else STUB_TEMPLATE_NO_DEFAULT)
    stub = template.format(
        rel=rel,
        rel_no_ext=rel_no_ext,
        outliers=", ".join(c["outliers"]),
    )
    for mf in c["majority_mfs"]:
        target = os.path.join(ROOT, mf, rel)
        with open(target, "w", encoding="utf-8") as fh:
            fh.write(stub)
        print(f"  stub: {target}")

    print(f"  outliers conservados: {', '.join(c['outliers'])}\n")


