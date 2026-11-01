"""Builds every shared player sheet: game/assets/players/<hair>_<pattern>.png (+ .json meta)
and the goalkeeper sheets gk_<hair>.png. Key colours only; the game recolours at runtime."""
import json, os, sys
import rig
OUT = os.path.join(rig.ROOT, "game", "assets", "players")
HAIRS = ["short", "afro", "fade", "braids", "wrap"]
PATTERNS = ["plain", "stripes", "hoops", "sash", "halves", "spots"]
OUTFIELD_ANIMS = ["idle", "walk", "run", "sprint", "kick", "tackle", "slide", "fall", "getup", "jump", "celebrate", "sad"]
GK_ANIMS = ["idle", "walk", "run", "sprint", "kick", "set", "catch", "dive_l", "dive_r", "fall", "getup", "jump", "celebrate", "sad"]
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    keys = rig.load_palette()["keys"]
    only = sys.argv[1:] 
    meta_written = False
    for hair in HAIRS:
        for pattern in PATTERNS:
            name = f"{hair}_{pattern}"
            if only and name not in only: continue
            img, meta = rig.build_sheet(rig.Look(hair=hair, pattern=pattern), keys, OUTFIELD_ANIMS)
            img.save(os.path.join(OUT, name + ".png"))
            if not meta_written:
                json.dump(meta, open(os.path.join(OUT, "outfield.json"), "w"), indent=1)
            print("sheet", name, img.size)
        name = f"gk_{hair}"
        if only and name not in only: continue
        img, meta = rig.build_sheet(rig.Look(hair=hair, pattern="plain", keeper=True), keys, GK_ANIMS)
        img.save(os.path.join(OUT, name + ".png"))
        json.dump(meta, open(os.path.join(OUT, "keeper.json"), "w"), indent=1)
        print("sheet", name, img.size)
