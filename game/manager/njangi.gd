class_name Njangi
extends RefCounted
## The Indice Njangi, ported from the Ndamba app (app/src/lib/njangi.ts, chapter 32 of Le Code
## Njangi). Five sub-indices of 0 to 20 points (progression, penetration, fixation, reprise,
## contrôle), total 0 to 100. Event codes are the app's live-tagging codes.

const CODES := ["PASS_OK", "PASS_LOST", "PROG", "LINE", "FINAL3", "BOX", "FIX2", "SWITCH", "LOSS", "REGAIN5", "REGAIN", "SHOT", "SHOT_IN", "GOAL"]
const SUBS := ["progression", "penetration", "fixation", "reprise", "controle"]

## Reference values of chapter 32 (internal benchmarks).
const TARGETS := {
	"progression": 0.35,   # (PROG + LINE) per pass attempted for 20 points
	"penetration": 1.0,    # (FINAL3 + 2 BOX) per possession for 20 points
	"fixation": 0.25,      # (FIX2 + SWITCH) per possession for 20 points
	"reprise": 0.4,        # REGAIN5 per loss for 20 points
	"controle_min": 0.55,  # conservation rate K that scores 0
	"controle_span": 0.3,  # K = 0.85 scores 20
}

## Drills that train each sub-index (chapter 32 table), as in the app.
const DRILLS_FOR := {
	"progression": ["P05", "S07", "L02", "R06"],
	"penetration": ["F03", "F05", "G05", "G01"],
	"fixation": ["R02", "S04", "P07", "F04"],
	"reprise": ["R08", "T01", "T03", "F06"],
	"controle": ["R01", "R07", "P01", "P10"],
}

const SUB_INTENTION := {"progression": "progresser", "penetration": "finir", "fixation": "fixer", "reprise": "reprendre", "controle": "respirer"}


static func empty_counts() -> Dictionary:
	var c := {}
	for k in CODES:
		c[k] = 0
	return c


static func _cap(v: float) -> float:
	return clampf(v, 0.0, 20.0)


static func _r1(v: float) -> float:
	return roundf(v * 10.0) / 10.0


static func _ratio(a: float, b: float) -> float:
	return a / b if b > 0.0 else 0.0


static func from_counts(c: Dictionary) -> Dictionary:
	var passes: float = c["PASS_OK"] + c["PASS_LOST"]
	var losses: float = c["PASS_LOST"] + c["LOSS"]
	var possessions: float = c["PASS_LOST"] + c["LOSS"] + c["SHOT"]
	var actions: float = c["PASS_OK"] + c["PASS_LOST"] + c["LOSS"]
	var conservation := _ratio(c["PASS_OK"], actions)
	var progression := _cap(20.0 * (c["PROG"] + c["LINE"]) / (TARGETS["progression"] * passes)) if passes > 0 else 0.0
	var penetration := _cap(20.0 * (c["FINAL3"] + 2 * c["BOX"]) / (TARGETS["penetration"] * possessions)) if possessions > 0 else 0.0
	var fixation := _cap(20.0 * (c["FIX2"] + c["SWITCH"]) / (TARGETS["fixation"] * possessions)) if possessions > 0 else 0.0
	var reprise := _cap(20.0 * c["REGAIN5"] / (TARGETS["reprise"] * losses)) if losses > 0 else 0.0
	var controle := _cap(20.0 * (conservation - TARGETS["controle_min"]) / TARGETS["controle_span"]) if actions > 0 else 0.0
	var sub := {"progression": _r1(progression), "penetration": _r1(penetration), "fixation": _r1(fixation), "reprise": _r1(reprise), "controle": _r1(controle)}
	var total := 0.0
	for k in SUBS:
		total += sub[k]
	return {
		"total": _r1(total), "sub": sub, "counts": c, "passes": int(passes), "pass_accuracy": _ratio(c["PASS_OK"], passes),
		"possessions": int(possessions), "losses": int(losses), "actions": int(actions), "conservation": conservation,
		"reprise_rate": _ratio(c["REGAIN5"], losses), "progression_rate": _ratio(c["PROG"] + c["LINE"], passes),
		"penetration_rate": _ratio(c["FINAL3"] + 2 * c["BOX"], possessions), "fixation_rate": _ratio(c["FIX2"] + c["SWITCH"], possessions),
	}


## Reading bands of chapter 32: 0 under 35, 1 to 50, 2 to 65, 3 to 80, 4 above.
static func band(total: float) -> int:
	if total < 35.0:
		return 0
	if total < 50.0:
		return 1
	if total < 65.0:
		return 2
	if total < 80.0:
		return 3
	return 4


## Sub-indices from weakest to strongest.
static func rank_subs(r: Dictionary) -> Array:
	var subs: Array = SUBS.duplicate()
	subs.sort_custom(func(a, b): return r["sub"][a] < r["sub"][b])
	return subs
