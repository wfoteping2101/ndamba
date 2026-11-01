"""Copies the source content (content/teams, content/stadiums, content/strings, palettes)
into game/content so the Godot project reads the latest data. Run after editing content."""
import os, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "content")
DST = os.path.join(ROOT, "game", "content")
os.makedirs(DST, exist_ok=True)
for sub in ("teams", "stadiums", "academy", "manager"):
    s = os.path.join(SRC, sub)
    if os.path.isdir(s):
        d = os.path.join(DST, sub)
        shutil.rmtree(d, ignore_errors=True)
        shutil.copytree(s, d, ignore=shutil.ignore_patterns("*.py", "__pycache__"))
shutil.copy(os.path.join(ROOT, "art", "src", "palettes.json"), os.path.join(DST, "palettes.json"))
for f in os.listdir(SRC):
    if f.startswith("strings") and f.endswith(".json"):
        shutil.copy(os.path.join(SRC, f), os.path.join(DST, f))
print("synced content to", DST)
