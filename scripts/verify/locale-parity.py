"""Check that en/am/or locale files have identical key sets with no duplicates."""
import re
from pathlib import Path

LOCALES = ["en", "am", "or"]
KEY_RE = re.compile(r"^  ([a-zA-Z0-9_]+):", re.MULTILINE)

sets = {}
for lang in LOCALES:
    text = Path(f"src/lib/locales/{lang}.ts").read_text()
    keys = KEY_RE.findall(text)
    dupes = {k for k in keys if keys.count(k) > 1}
    sets[lang] = set(keys)
    print(f"{lang}: {len(keys)} keys, {len(dupes)} duplicates {sorted(dupes) if dupes else ''}")

base = sets["en"]
ok = True
for lang in LOCALES[1:]:
    missing = base - sets[lang]
    extra = sets[lang] - base
    if missing or extra:
        ok = False
        print(f"{lang} missing={sorted(missing)} extra={sorted(extra)}")

print("counts:", {k: len(v) for k, v in sets.items()})
print("PARITY_OK" if ok and all(len(s) == len(sets["en"]) for s in sets.values()) else "PARITY_FAIL")
