#!/usr/bin/env python3
"""Regenerate kernel/src/contract.ts from the ratified specification.

The contract types are never hand-written. They are extracted from
collab/SitePlanBrief.md so the code cannot drift from the document Sol ratified.
If the types need to change, change the spec, get it re-ratified, re-run this.

Usage (from the kernel/ directory):  python3 tools/extract-contract.py
Exits non-zero if the spec is missing or yields no blocks.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
KERNEL = HERE.parent
SPEC = KERNEL.parent / "collab" / "SitePlanBrief.md"
OUT = KERNEL / "src" / "contract.ts"

HEADER = """// ---------------------------------------------------------------------------
// UrbanOS geometry kernel — RATIFIED CONTRACT TYPES.
//
// MECHANICALLY EXTRACTED from collab/SitePlanBrief.md v3, ratified by Sol on
// 2026-07-25 (collab/SitePlanBrief-ratification-Sol.md). Do not hand-edit: change
// the spec, get it re-ratified, then re-extract. This file contains TYPES ONLY —
// zero logic — so it cannot encode a behavioural decision the spec did not make.
//
// Regenerate: python3 tools/extract-contract.py
// ---------------------------------------------------------------------------
import type { KERNEL_BRAND } from './brand.ts'

"""


def main() -> int:
    if not SPEC.exists():
        print(f"spec not found: {SPEC}", file=sys.stderr)
        return 1

    blocks = re.findall(r"```ts\n(.*?)```", SPEC.read_text(), re.S)
    if not blocks:
        print("no ```ts blocks found in the spec", file=sys.stderr)
        return 1

    body = "\n\n".join(b.rstrip() for b in blocks)

    # The brand symbol, the function signatures and the error class are RUNTIME
    # concerns. They live in brand.ts / errors.ts / index.ts. Strip every ambient
    # declaration from the type module: a `declare` here would assert that a
    # runtime value exists in a file that contains none, which is exactly the kind
    # of quiet untruth this contract exists to prevent.
    body = body.replace("declare const KERNEL_BRAND: unique symbol\n", "")
    body = re.sub(r"declare function \w+\([^)]*\)\s*:[^\n]*\n", "", body, flags=re.S)
    body = re.sub(r"declare function [\s\S]*?\n\):[^\n]*\n", "", body)
    body = re.sub(r"declare class \w+[^{]*\{[^}]*\}\n", "", body)

    leaked = re.findall(r"^\s*declare\b.*$", body, re.M)
    if leaked:
        print("ERROR: ambient declarations leaked into the types-only module:",
              file=sys.stderr)
        for line in leaked:
            print("   " + line.strip(), file=sys.stderr)
        return 1

    # Export every top-level declaration.
    body = re.sub(r"^(interface |type )", r"export \1", body, flags=re.M)

    OUT.write_text(HEADER + body + "\n")
    n = len(re.findall(r"^export (?:interface|type) ", body, re.M))
    print(f"wrote {OUT.relative_to(KERNEL)} — {len(blocks)} blocks, {n} exported types")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
