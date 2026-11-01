class_name ManagerSim
extends RefCounted
## Match simulation for the manager campaign. Possession by possession, both teams' event
## counts are generated from their capacities (0 to 100), then scored with the real Indice
## Njangi. Goals come out of the same chain (final third, box, shot, on target, goal), so a
## team that trains possession with intention scores more, and a team with a strong reprise
## suffocates the opponent. No hidden result die: everything is built from the events.

const CAP_KEYS := ["controle", "progression", "penetration", "fixation", "reprise", "defense", "gk", "finishing"]


static func _poisson(rng: RandomNumberGenerator, lam: float) -> int:
	var l := exp(-lam)
	var k := 0
	var p := 1.0
	while true:
		p *= rng.randf()
		if p <= l:
			break
		k += 1
	return k


## caps: {controle, progression, penetration, fixation, reprise, defense, gk, finishing, fitness(0..1), morale(0..1)}
static func simulate(a: Dictionary, b: Dictionary, home_side: int, rng: RandomNumberGenerator) -> Dictionary:
	var teams := [a, b]
	var counts := [Njangi.empty_counts(), Njangi.empty_counts()]
	var goals := [0, 0]
	var events: Array = []
	# effective capacities: fitness and morale scale everything, home advantage adds a touch
	var eff := []
	for i in range(2):
		var t: Dictionary = teams[i]
		var mult: float = (0.82 + 0.18 * float(t.get("fitness", 1.0))) * (0.92 + 0.08 * float(t.get("morale", 0.7)))
		if i == home_side:
			mult *= 1.04
		var e := {}
		for k in CAP_KEYS:
			e[k] = clampf(float(t.get(k, 40.0)) * mult, 5.0, 100.0)
		eff.append(e)
	# number of possessions each: 44 to 64, shifted by control vs the opponent's pressure
	var poss := []
	for i in range(2):
		var me: Dictionary = eff[i]
		var op: Dictionary = eff[1 - i]
		var n: float = 54.0 + (float(me["controle"]) - float(op["reprise"])) * 0.12 + rng.randf_range(-4.0, 4.0)
		poss.append(int(clampf(n, 36.0, 72.0)))
	var total_poss: int = poss[0] + poss[1]
	# interleave possessions in time
	var order: Array = []
	for i in range(2):
		for k in range(poss[i]):
			order.append(i)
	for i in range(order.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = order[i]
		order[i] = order[j]
		order[j] = tmp
	for idx in range(order.size()):
		var side: int = order[idx]
		var minute := int(1 + 89.0 * idx / maxf(1.0, total_poss - 1))
		_possession(side, eff[side], eff[1 - side], counts[side], counts[1 - side], goals, events, minute, rng)
	var ia := Njangi.from_counts(counts[0])
	var ib := Njangi.from_counts(counts[1])
	return {"counts": counts, "score": goals, "events": events, "indice": [ia, ib]}


static func _possession(side: int, me: Dictionary, op: Dictionary, c: Dictionary, oc: Dictionary, goals: Array, events: Array, minute: int, rng: RandomNumberGenerator) -> void:
	# passes in this possession, conservation per pass
	var keep_p: float = clampf(0.56 + float(me["controle"]) / 100.0 * 0.36 - float(op["reprise"]) / 100.0 * 0.10 - float(op["defense"]) / 100.0 * 0.05, 0.35, 0.93)
	var prog_p: float = clampf(0.12 + float(me["progression"]) / 100.0 * 0.42 - float(op["defense"]) / 100.0 * 0.10, 0.05, 0.6)
	var fix_p: float = clampf(0.04 + float(me["fixation"]) / 100.0 * 0.30 - float(op["defense"]) / 100.0 * 0.06, 0.02, 0.35)
	var passes := 0
	var progressed := 0
	var lost := false
	var reached_final3 := false
	var in_box := false
	var max_passes: int = 2 + _poisson(rng, 1.6 + float(me["controle"]) / 100.0 * 4.0)
	while passes < max_passes:
		passes += 1
		if rng.randf() < keep_p:
			c["PASS_OK"] += 1
			if rng.randf() < prog_p:
				progressed += 1
				if rng.randf() < 0.42:
					c["LINE"] += 1
				else:
					c["PROG"] += 1
			if rng.randf() < fix_p:
				if rng.randf() < 0.6:
					c["FIX2"] += 1
				else:
					c["SWITCH"] += 1
		else:
			c["PASS_LOST"] += 1
			lost = true
			break
		# entering the final third needs progression; the box needs penetration
		if not reached_final3 and progressed >= 1 and rng.randf() < clampf(0.18 + float(me["penetration"]) / 100.0 * 0.5 - float(op["defense"]) / 100.0 * 0.22, 0.05, 0.75):
			reached_final3 = true
			c["FINAL3"] += 1
		if reached_final3 and not in_box and rng.randf() < clampf(0.15 + float(me["penetration"]) / 100.0 * 0.45 - float(op["defense"]) / 100.0 * 0.25, 0.04, 0.6):
			in_box = true
			c["BOX"] += 1
			break
	if lost:
		_after_loss(side, me, op, c, oc, rng)
		return
	# end of the possession: a shot (more likely from the box), a dribble loss, or the ball dies
	var shot_p: float = 0.85 if in_box else (0.3 if reached_final3 else 0.05)
	if rng.randf() < shot_p:
		c["SHOT"] += 1
		var on_target_p: float = clampf(0.30 + float(me["finishing"]) / 100.0 * 0.38 - float(op["defense"]) / 100.0 * 0.12 + (0.12 if in_box else -0.08), 0.1, 0.8)
		if rng.randf() < on_target_p:
			c["SHOT_IN"] += 1
			var goal_p: float = clampf(0.27 + float(me["finishing"]) / 100.0 * 0.30 - float(op["gk"]) / 100.0 * 0.28 + (0.12 if in_box else -0.1), 0.05, 0.6)
			if rng.randf() < goal_p:
				c["GOAL"] += 1
				goals[side] += 1
				events.append({"minute": minute, "side": side, "kind": "goal", "box": in_box})
			else:
				events.append({"minute": minute, "side": side, "kind": "save"})
		else:
			events.append({"minute": minute, "side": side, "kind": "miss"})
	else:
		c["LOSS"] += 1
		_after_loss(side, me, op, c, oc, rng)


static func _after_loss(side: int, me: Dictionary, op: Dictionary, c: Dictionary, oc: Dictionary, rng: RandomNumberGenerator) -> void:
	# counter-pressing: regain within five seconds (REGAIN5) or later (REGAIN)
	var r5: float = clampf(0.08 + float(me["reprise"]) / 100.0 * 0.42 - float(op["controle"]) / 100.0 * 0.15, 0.03, 0.55)
	if rng.randf() < r5:
		c["REGAIN5"] += 1
	elif rng.randf() < 0.25:
		c["REGAIN"] += 1


## Capacities (0..100) of a squad from its players' ten Njangi skills and the team's
## familiarity with the five intentions (0..1 each). Players: [{role, skills{...}, fatigue, injured}].
static func caps_from_squad(players: Array, familiarity: Dictionary) -> Dictionary:
	var xi := starting_eleven(players)
	if xi.is_empty():
		return {"controle": 30, "progression": 30, "penetration": 30, "fixation": 30, "reprise": 30, "defense": 30, "gk": 30, "finishing": 30, "fitness": 1.0, "morale": 0.6}
	var acc := {}
	for k in ["controle", "progression", "penetration", "fixation", "reprise", "defense", "finishing"]:
		acc[k] = 0.0
	var n := 0
	var fatigue := 0.0
	var gk := 30.0
	var def_n := 0
	var fin_n := 0
	var defense := 0.0
	var finishing := 0.0
	for p in xi:
		var s: Dictionary = p["skills"]
		if p["role"] == "GK":
			gk = float(s["protection"]) * 0.3 + float(s["decision"]) * 0.35 + float(s["communication"]) * 0.2 + float(s["scan"]) * 0.15
			continue
		n += 1
		fatigue += float(p.get("fatigue", 0.0))
		acc["controle"] += float(s["controle"]) * 0.4 + float(s["passe"]) * 0.35 + float(s["protection"]) * 0.25
		acc["progression"] += float(s["passe"]) * 0.35 + float(s["scan"]) * 0.35 + float(s["appels"]) * 0.3
		acc["penetration"] += float(s["conduite"]) * 0.3 + float(s["dribble"]) * 0.3 + float(s["decision"]) * 0.2 + float(s["appels"]) * 0.2
		acc["fixation"] += float(s["dribble"]) * 0.35 + float(s["passe"]) * 0.25 + float(s["decision"]) * 0.4
		acc["reprise"] += float(s["contrepression"]) * 0.6 + float(s["communication"]) * 0.4
		if p["role"] in ["DEF", "MID"]:
			defense += float(s["protection"]) * 0.4 + float(s["contrepression"]) * 0.3 + float(s["communication"]) * 0.3
			def_n += 1
		if p["role"] in ["FWD", "MID"]:
			finishing += float(s["decision"]) * 0.4 + float(s["scan"]) * 0.2 + float(s["conduite"]) * 0.2 + float(s["appels"]) * 0.2
			fin_n += 1
	var out := {}
	for k in ["controle", "progression", "penetration", "fixation", "reprise"]:
		out[k] = acc[k] / maxf(1.0, n)
	out["defense"] = defense / maxf(1.0, def_n)
	out["finishing"] = finishing / maxf(1.0, fin_n)
	out["gk"] = gk
	# intentions trained during the week sharpen the matching capacity
	var fam := func(k: String) -> float: return 0.80 + 0.20 * clampf(float(familiarity.get(k, 0.0)), 0.0, 1.0)
	out["controle"] *= fam.call("respirer")
	out["progression"] *= fam.call("progresser")
	out["penetration"] *= fam.call("finir")
	out["fixation"] *= fam.call("fixer")
	out["reprise"] *= fam.call("reprendre")
	out["defense"] *= fam.call("reprendre") * 0.5 + 0.5
	out["finishing"] *= fam.call("finir")
	out["fitness"] = clampf(1.0 - fatigue / maxf(1.0, n) * 0.6, 0.4, 1.0)
	return out


## The best eleven by overall skill respecting 1 GK, 4 DEF, 3 MID, 3 FWD when possible.
static func starting_eleven(players: Array) -> Array:
	var fit := players.filter(func(p): return int(p.get("injured", 0)) <= 0)
	fit.sort_custom(func(a, b): return overall(a) > overall(b))
	var need := {"GK": 1, "DEF": 4, "MID": 3, "FWD": 3}
	var xi := []
	for p in fit:
		var r: String = p["role"]
		if need.get(r, 0) > 0:
			need[r] -= 1
			xi.append(p)
	for p in fit:
		if xi.size() >= 11:
			break
		if not xi.has(p) and p["role"] != "GK":
			xi.append(p)
	return xi


static func overall(p: Dictionary) -> float:
	var s: Dictionary = p["skills"]
	var t := 0.0
	for k in s.keys():
		t += float(s[k])
	return t / maxf(1.0, s.size())
