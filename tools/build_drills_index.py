#!/usr/bin/env python3
"""Build content/academy/drills_index.json from coach/drills/*.json.

Everything bibliographic (titles, rules, measures, diagrams, numbers) is read
from the drill files; only the feasibility tier and the one-line game mission
hint are added here. Run with: python3 -I tools/build_drills_index.py
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRILLS = os.path.join(ROOT, "coach", "drills")
OUT = os.path.join(ROOT, "content", "academy", "drills_index.json")

# Drills whose core rule depends on a live coach signal (colour, number, call).
COACH_SIGNAL = {"C06", "R05", "P08", "T04"}

# One-line mission proposals for the NDAMBA academy (design input, not book text).
MISSION = {
    "C01": "Y pattern: pivot, one-touch lay-off, runner; 8 clean cycles.",
    "C02": "Diamond passing, follow your pass; 10 passes, no bounce.",
    "C03": "Receive through the called gate in one step; 12 clean receptions.",
    "C04": "Receive side-on, turn to the open gate before contact; 8 turns.",
    "C05": "First touch away from the charging defender, exit far gate; 8 escapes.",
    "C06": "Call the colour shown behind you, play to its gate; 10 correct.",
    "C07": "1v1: pin the defender, exit a free gate; 6 gates in 90 s.",
    "C08": "2v1: carry at the zone defender, release when he steps; score 5.",
    "C09": "Shield in an 8 m box for 6 s, then play to the far support.",
    "C10": "Three one-two shapes ending in a shot; 6 goals.",
    "C11": "One-touch finishing at three stations; 6 first-time goals.",
    "C12": "Keeper takes a back-pass under pressure, plays to the free side; 8 exits.",
    "C13": "Third-man run in a trio, then 3v2 to mini goals; 5 goals.",
    "C14": "Cushion thrown balls with thigh, chest, foot, then pass; 10 clean.",
    "F01": "GK plus 3 build out 3v2, find the free receiver; 6 exits.",
    "F02": "3-2 build-up with inverted full-back, 8v6; reach halfway 6 times.",
    "F03": "6v5 plus GK: enter the box via the half-space; 4 entries, 2 goals.",
    "F04": "Overload 5v4 one side, switch into a 2v1, finish; 4 goals.",
    "F05": "8v7 plus GK vs low block; cut-backs score bonus; 3 goals.",
    "F06": "Attack 7v6 with 3 plus 2 behind the ball; on loss defend the 4v3.",
    "G01": "Wide combination, half-space entry, cut-back to two runners; 6 goals.",
    "G02": "One-two then shoot in a 2v1, both sides; 8 goals in two touches.",
    "G03": "Pivot to striker, lay-off to the runner, shoot; 6 goals.",
    "G04": "4v3 pins one side, switch to the lone winger, 1v1, finish; 4 goals.",
    "G05": "4v3 plus GK in the box, shoot within two touches; 5 goals.",
    "G06": "Keeper to shot through at least eight players, naming each intention.",
    "L01": "8v8 with winger-only channels; score after a channel switch.",
    "L02": "9v9 in thirds; cross all three in under 8 passes, goal counts double.",
    "L03": "10v10: cross halfway in possession against a high press 5 times.",
    "L04": "Themed 11v11 with two model rules; bank bonus behaviour points.",
    "L05": "7v7 on half a pitch; touch both wide channels before each goal; 3 goals.",
    "L06": "10v10: hold the ball in the final third; one point per minute.",
    "P01": "4v4 plus 3 neutrals in a diamond; 8 passes is a point; score 5.",
    "P02": "5v5 plus 2 in five lanes, never two in a lane; 4 lane switches.",
    "P03": "Zone 1 to zone 3 through a one-touch middle lay-off; 6 times.",
    "P04": "GK plus 4 vs 3; cross the attackers' line to the relay; 6 exits.",
    "P05": "6v6 in three zones; receive in the middle pocket, turn, play forward; 5 times.",
    "P06": "7v7 plus 3 neutrals; points only if the pivot touched; score 5.",
    "P07": "4v3 draws the press for 6 passes, then release the 3v2 to score.",
    "P08": "Waves 2v1, 3v2, 4v3; create the superiority the coach calls; score 6.",
    "P09": "Four slow passes, then hit the end target within 3 s; 2 points.",
    "P10": "8v8 plus 4 on a big pitch while tired; keep the ball 45 s, three times.",
    "R01": "4v1 rondo, 10 m square, two touches; 10 passes without interception.",
    "R02": "5v2: hold a beat, draw a bull, play behind him for the bonus.",
    "R03": "4v2 with a central joker; a pass through him is a point; score 5.",
    "R04": "4v2; after 6 passes switch squares before the two chasers arrive.",
    "R05": "6v3: call the colour behind you before you play; 8 correct calls.",
    "R06": "4v2 across three zones; after 5 passes move the ball to the next zone.",
    "R07": "5v2: a point only when all five have touched; score 4.",
    "R08": "5v2: lose it, win it back within 5 s; 4 recoveries.",
    "S01": "3v3, four mini goals; score in the least protected one; 5 goals.",
    "S02": "4v4: score by carrying or receiving inside the end zone; 5 entries.",
    "S03": "5v5 plus two end supports; goals only after a lay-off; 4 goals.",
    "S04": "4v4 with keepers; a goal after a dribble that drew two counts double.",
    "S05": "6v6, three mini goals each; pin one side, score on the other; 5 goals.",
    "S06": "4v4 futsal: sole control, two touches in your half, scan; win 3-1.",
    "S07": "5v5 plus keepers; each pass breaking a line scores; reach 10 points.",
    "S08": "3v3 with a two-touch central zone; release before contact; win untackled.",
    "T01": "6v6 plus GKs; win the ball back within 5 s of losing it; 5 recoveries.",
    "T02": "4v4 in the middle; on recovery first pass forward into a 3v2; 4 goals.",
    "T03": "4v4 waves: lose and go off, waiting team enters; survive 3 transitions.",
    "T04": "6v6 plus GK mid-block; press on the trigger, finish within 10 s; 3 goals.",
    "T05": "3v2 then 4v3 with a recovering defender; finish within 8 s; 4 goals.",
    "T06": "Attack 5v4; after shot or loss defend 3v4 with the rest defence; concede none.",
}


def tier_of(d):
    pmin = d["players"]["min"]
    w, h = d["space"]["w"], d["space"]["h"]
    full_pitch = w >= 100 or (w >= 70 and h >= 68)
    if d["id"] in COACH_SIGNAL or pmin >= 15 or full_pitch:
        return 3
    if pmin <= 8 and w * h <= 1200:
        return 1
    return 2


def main():
    files = sorted(glob.glob(os.path.join(DRILLS, "*.json")))
    rows = []
    for f in files:
        with open(f, encoding="utf-8") as fh:
            d = json.load(fh)
        rows.append({
            "id": d["id"],
            "family": d["family"],
            "order": d["order"],
            "ages": d["ages"],
            "players": {"min": d["players"]["min"], "max": d["players"]["max"]},
            "space": {"w": d["space"]["w"], "h": d["space"]["h"]},
            "minutes": d["minutes"],
            "intensity": d["intensity"],
            "intentions": d["intentions"],
            "skills": d["skills"],
            "pieces": d["pieces"],
            "title_fr": d["fr"]["title"],
            "title_en": d["en"]["title"],
            "subtitle_fr": d["fr"]["subtitle"],
            "subtitle_en": d["en"]["subtitle"],
            "objective_fr": d["fr"]["objective"],
            "objective_en": d["en"]["objective"],
            "rules_fr": d["fr"]["rules"],
            "rules_en": d["en"]["rules"],
            "measure_fr": d["fr"]["measure"],
            "measure_en": d["en"]["measure"],
            "diagram": d["diagram"],
            "tier": tier_of(d),
            "mission_hint_en": MISSION[d["id"]],
        })
    family_order = ["technique", "rondo", "position", "ssg", "lsg", "phase", "transition", "finishing"]
    rows.sort(key=lambda r: (family_order.index(r["family"]), r["order"]))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    # validate
    with open(OUT, encoding="utf-8") as fh:
        back = json.load(fh)
    assert len(back) == 64, len(back)
    assert len({r["id"] for r in back}) == 64
    assert set(MISSION) == {r["id"] for r in back}
    tiers = {t: sum(1 for r in back if r["tier"] == t) for t in (1, 2, 3)}
    print(f"wrote {OUT}: {len(back)} drills, tiers {tiers}")
    if "--table" in sys.argv:
        for r in back:
            p = r["players"]
            pl = str(p["min"]) if p["min"] == p["max"] else f"{p['min']}..{p['max']}"
            INT = {"sortir": "So", "progresser": "Pr", "fixer": "Fx", "finir": "Fn", "respirer": "Re",
                   "reprendre": "Rp", "regarder-devant": "Rd"}
            SK = {"scan": "sc", "controle": "ct", "passe": "pa", "conduite": "cd", "dribble-njangi": "dn",
                  "appels": "ap", "communication": "cm", "protection": "pr", "contre-pression": "cp", "decision": "de"}
            PC = {"le cœur": "C", "la raison": "R", "les yeux": "Y", "la carte": "M", "le souffle": "S"}
            print("| {id} | {fam} | {tfr} | {ten} | {pl} | {w}x{h} | {ages} | {ints} | {sk} | {pc} | {m} |".format(
                id=r["id"], fam=r["family"], tfr=r["title_fr"], ten=r["title_en"], pl=pl,
                w=r["space"]["w"], h=r["space"]["h"], ages=r["ages"], ints=",".join(INT[i] for i in r["intentions"]),
                sk=",".join(SK[i] for i in r["skills"]), pc=",".join(PC[i] for i in r["pieces"]), m=r["mission_hint_en"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
