class_name Career
extends RefCounted
## The manager campaign: a club trained week after week with Code Njangi drills, from Ligue 3
## to Ligue 1 and on to the continental cup. Everything lives in `state` (a plain Dictionary)
## so it saves as JSON through SaveStore.

const SLOT := "manager"
const SKILLS := ["scan", "controle", "passe", "conduite", "dribble", "appels", "communication", "protection", "contrepression", "decision"]
const SKILL_ALIAS := {"dribble-njangi": "dribble", "contre-pression": "contrepression"}
const INTENTIONS := ["progresser", "finir", "fixer", "reprendre", "respirer"]
const INTENSITY := {"low": 0.5, "medium": 1.0, "high": 1.3, "very-high": 1.5}
const DIVISION_SIZE := {1: 14, 2: 12, 3: 10}
const PROMOTED := 2
const RELEGATED := 2
const SESSIONS := 4
const INCOME := {1: 900, 2: 380, 3: 140}       # per week, in thousands of francs (fictional economy)
const FACILITY_COST := [0, 1500, 4000, 9000, 18000]
const CUP_ROUNDS := ["r16", "qf", "sf", "final"]
const CUP_PRIZE := [600, 1200, 2500, 6000]
const CUP_WEEKS := [6, 12, 18, 24]

var state: Dictionary = {}
var clubs: Dictionary = {}      # id -> static club dict (from content)
var drills: Dictionary = {}     # id -> drill dict
var drill_list: Array = []
var names: Dictionary = {}
var rng := RandomNumberGenerator.new()


func _init() -> void:
	_load_content()


func _load_content() -> void:
	var cl: Variant = _json("res://content/manager/clubs.json")
	if typeof(cl) == TYPE_ARRAY:
		for c in cl:
			clubs[c["id"]] = c
	names = _json("res://content/manager/names.json")
	var dl: Variant = _json("res://content/academy/drills_index.json")
	if typeof(dl) == TYPE_ARRAY:
		drill_list = dl
		for d in dl:
			drills[d["id"]] = d


static func _json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("missing " + path)
		return null
	return JSON.parse_string(FileAccess.get_file_as_string(path))


# ---------------------------------------------------------------- new game / save

func new_game(club_id: String, seed_value: int = -1) -> void:
	if seed_value < 0:
		rng.randomize()
	else:
		rng.seed = seed_value
	var club: Dictionary = clubs[club_id]
	state = {
		"club": club_id,
		"season": 1,
		"week": 1,
		"division": int(club["division"]),
		"budget": 800,
		"facilities": 1,
		"squad": [],
		"familiarity": {},
		"plan": [],
		"clubs": {},
		"table": {},
		"fixtures": [],
		"cup": {"active": false, "round": 0, "alive": false, "won": false},
		"history": [],
		"last_report": {},
		"reports": [],
		"market": [],
		"won_continental": false,
		"titles": {"l1": 0, "continental": 0},
		"rng_state": 0,
		"next_pid": 1,
	}
	for k in INTENTIONS:
		state["familiarity"][k] = 0.1
	for id in clubs.keys():
		var c: Dictionary = clubs[id]
		state["clubs"][id] = {"division": int(c["division"]), "strength": float(c["strength"])}
	state["squad"] = _make_squad(float(club["strength"]), 16)
	_start_season()
	auto_plan()


func save() -> void:
	state["rng_state"] = rng.state
	Game.save.write(SLOT, state)


func load_game() -> bool:
	var d: Variant = Game.save.read(SLOT)
	if typeof(d) != TYPE_DICTIONARY or not d.has("club"):
		return false
	state = d
	rng.state = int(state.get("rng_state", 0))
	return true


static func has_save() -> bool:
	return Game.save.exists(SLOT)


# ---------------------------------------------------------------- squads

func _new_name(female: bool) -> Dictionary:
	var given_pool: Array = names["given_f"] if female else names["given_m"]
	var fam_pool: Array = names["family"]
	for _i in range(20):
		var g: String = given_pool[rng.randi_range(0, given_pool.size() - 1)]
		var f: String = fam_pool[rng.randi_range(0, fam_pool.size() - 1)]
		var bad := false
		for pair in names["forbidden"]:
			if pair[0] == g and pair[1] == f:
				bad = true
		if not bad:
			return {"given": g, "family": f}
	return {"given": given_pool[0], "family": fam_pool[0]}


func _make_player(role: String, strength: float, age: int = -1) -> Dictionary:
	var female := rng.randf() < 0.12
	var n := _new_name(female)
	if age < 0:
		age = rng.randi_range(17, 33)
	var skills := {}
	for k in SKILLS:
		var bias := 0.0
		match role:
			"GK":
				bias = 6.0 if k in ["protection", "decision", "communication"] else -4.0
			"DEF":
				bias = 6.0 if k in ["protection", "contrepression", "communication", "scan"] else -2.0
			"MID":
				bias = 5.0 if k in ["passe", "controle", "scan", "decision"] else 0.0
			"FWD":
				bias = 6.0 if k in ["dribble", "conduite", "appels", "decision"] else -2.0
		var v: float = strength + bias + rng.randfn(0.0, 7.0)
		skills[k] = clampf(v, 15.0, 96.0)
	var avg := ManagerSim.overall({"skills": skills})
	var headroom: float = maxf(0.0, 26.0 - (age - 17) * 1.6)
	var potential: float = clampf(avg + rng.randf_range(headroom * 0.4, headroom), avg, 97.0)
	var pid: int = int(state.get("next_pid", 1))
	state["next_pid"] = pid + 1
	return {
		"id": "p%d" % pid, "given": n["given"], "family": n["family"], "female": female, "role": role,
		"age": age, "skills": skills, "potential": potential, "fatigue": 0.0, "morale": 0.7,
		"injured": 0, "apps": 0, "goals": 0,
	}


func _make_squad(strength: float, n: int) -> Array:
	var roles := ["GK", "GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD", "FWD", "MID"]
	var out := []
	for i in range(n):
		out.append(_make_player(roles[i % roles.size()], strength))
	return out


func player_name(p: Dictionary) -> String:
	return "%s %s" % [p["given"], p["family"]]


func squad_strength() -> float:
	var xi := ManagerSim.starting_eleven(state["squad"])
	if xi.is_empty():
		return 20.0
	var t := 0.0
	for p in xi:
		t += ManagerSim.overall(p)
	return t / xi.size()


func club_name(id: String) -> String:
	return clubs.get(id, {}).get("name", id)


func club_short(id: String) -> String:
	return clubs.get(id, {}).get("short", id.substr(0, 3).to_upper())


# ---------------------------------------------------------------- season setup

func _division_members(div: int) -> Array:
	var out := []
	for id in state["clubs"].keys():
		if int(state["clubs"][id]["division"]) == div:
			out.append(id)
	out.sort()
	return out


func _start_season() -> void:
	var div: int = state["division"]
	var members := _division_members(div)
	state["table"] = {}
	for id in members:
		state["table"][id] = {"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0}
	state["fixtures"] = _round_robin(members)
	state["week"] = 1
	# continental cup: the reigning Ligue 1 champion (us) enters it during the next season
	var in_cup: bool = state["cup"].get("qualified", false)
	state["cup"] = {"active": in_cup, "round": 0, "alive": in_cup, "won": false, "qualified": false, "results": []}
	if in_cup:
		state["cup"]["survivors"] = _division_members(0).duplicate()
	state["market"] = _make_market()
	state["season_reports"] = []


## Double round robin (circle method). Returns [{week, home, away, score, played}].
func _round_robin(members: Array) -> Array:
	var ids: Array = members.duplicate()
	if ids.size() % 2 == 1:
		ids.append("")
	var n := ids.size()
	var rounds: Array = []
	for r in range(n - 1):
		var pairs := []
		for i in range(n / 2):
			var a: String = ids[i]
			var b: String = ids[n - 1 - i]
			if a == "" or b == "":
				continue
			if (r + i) % 2 == 0:
				pairs.append([a, b])
			else:
				pairs.append([b, a])
		rounds.append(pairs)
		# rotate all but the first
		var last: String = ids[n - 1]
		for i in range(n - 1, 1, -1):
			ids[i] = ids[i - 1]
		ids[1] = last
	var fixtures := []
	var week := 1
	for pairs in rounds:
		for pr in pairs:
			fixtures.append({"week": week, "home": pr[0], "away": pr[1], "score": [0, 0], "played": false})
		week += 1
	for pairs in rounds:
		for pr in pairs:
			fixtures.append({"week": week, "home": pr[1], "away": pr[0], "score": [0, 0], "played": false})
		week += 1
	return fixtures


func season_weeks() -> int:
	var w := 0
	for f in state["fixtures"]:
		w = maxi(w, int(f["week"]))
	return w


func our_fixture(week: int) -> Dictionary:
	for f in state["fixtures"]:
		if int(f["week"]) == week and (f["home"] == state["club"] or f["away"] == state["club"]):
			return f
	return {}


## True when this week is a cup week (a cup tie is played after the league match).
func cup_tie_this_week() -> bool:
	var cup: Dictionary = state["cup"]
	if not cup.get("active", false) or not cup.get("alive", false):
		return false
	var r: int = cup["round"]
	return r < CUP_ROUNDS.size() and int(state["week"]) == CUP_WEEKS[r]


func _make_market() -> Array:
	var out := []
	var base: float = squad_strength()
	var roles := ["DEF", "MID", "FWD", "GK", "MID"]
	for i in range(4):
		var p := _make_player(roles[i], base + rng.randf_range(2.0, 10.0), rng.randi_range(19, 29))
		var price := int(pow(ManagerSim.overall(p) / 10.0, 2.4) * 18.0)
		out.append({"player": p, "price": price})
	return out


# ---------------------------------------------------------------- training plan

func drills_for_session(md: int) -> Array:
	## Drills that fit a matchday-minus slot: MD-4 loads, MD-3 intensity, MD-2 tactics, MD-1 sharp and short.
	var out := []
	for d in drill_list:
		var inten: String = d["intensity"]
		var ok := true
		match md:
			4:
				ok = inten != "low"
			3:
				ok = inten in ["high", "very-high"]
			2:
				ok = d["family"] in ["phase", "lsg", "position", "ssg", "transition"]
			1:
				ok = inten in ["low", "medium"] or d["family"] in ["finishing", "rondo"]
		if ok:
			out.append(d["id"])
	return out


func set_plan(ids: Array) -> void:
	state["plan"] = ids.duplicate()


## Choose drills that attack the weakest Indice sub-index (or a balanced start).
func auto_plan() -> void:
	var weakest := weakest_subs()
	var plan := []
	for md in [4, 3, 2, 1]:
		var pool := drills_for_session(md)
		var pick := ""
		for sub in weakest:
			for did in Njangi.DRILLS_FOR[sub]:
				if pool.has(did) and not plan.has(did):
					pick = did
					break
			if pick != "":
				break
		if pick == "":
			# any drill of the pool we have not planned yet
			for did in pool:
				if not plan.has(did):
					pick = did
					break
		plan.append(pick)
	state["plan"] = plan


func weakest_subs() -> Array:
	var rep: Dictionary = state.get("last_report", {})
	if rep.is_empty() or not rep.has("indice"):
		return ["controle", "progression", "reprise", "penetration", "fixation"]
	return Njangi.rank_subs(rep["indice"])


# ---------------------------------------------------------------- the week

## Train, play, update. Returns the week report (also stored in state.last_report).
func advance() -> Dictionary:
	var report := {"season": state["season"], "week": state["week"], "training": [], "match": {}, "cup": {}, "notes": []}
	_apply_training(report)
	_play_league_week(report)
	if cup_tie_this_week():
		_play_cup_tie(report)
	_weekly_upkeep(report)
	state["last_report"] = report
	state["reports"].append(report)
	if state["reports"].size() > 60:
		state["reports"] = state["reports"].slice(state["reports"].size() - 60)
	state["week"] = int(state["week"]) + 1
	if int(state["week"]) > season_weeks():
		_end_season(report)
	else:
		auto_plan()
	return report


func _skill_key(s: String) -> String:
	return SKILL_ALIAS.get(s, s)


func _apply_training(report: Dictionary) -> void:
	var plan: Array = state["plan"]
	var fac: float = 0.85 + 0.15 * float(state["facilities"])
	var gains := {}
	for k in SKILLS:
		gains[k] = 0.0
	for did in plan:
		if not drills.has(did):
			continue
		var d: Dictionary = drills[did]
		var inten: float = INTENSITY.get(d["intensity"], 1.0)
		for p in state["squad"]:
			if int(p["injured"]) > 0:
				continue
			var age_f: float = 1.25 if p["age"] <= 20 else (1.0 if p["age"] <= 26 else (0.7 if p["age"] <= 30 else 0.45))
			var s: Dictionary = p["skills"]
			for sk in d["skills"]:
				var k := _skill_key(sk)
				if not s.has(k):
					continue
				var cur: float = s[k]
				var room: float = clampf((float(p["potential"]) + 6.0 - cur) / 30.0, 0.0, 1.0)
				var g: float = 0.5 * inten * age_f * pow(1.0 - cur / 100.0, 0.8) * fac * (0.3 + 0.7 * room)
				s[k] = minf(96.0, cur + g)
				gains[k] += g
			p["fatigue"] = clampf(float(p["fatigue"]) + 0.05 * inten, 0.0, 1.0)
		for it in d["intentions"]:
			if state["familiarity"].has(it):
				state["familiarity"][it] = minf(1.0, float(state["familiarity"][it]) + 0.08)
		report["training"].append({"drill": did, "title_fr": d["title_fr"], "title_en": d["title_en"], "intensity": d["intensity"]})
	for k in INTENTIONS:
		state["familiarity"][k] = maxf(0.0, float(state["familiarity"][k]) - 0.03)
	var n := maxi(1, state["squad"].size())
	for k in SKILLS:
		gains[k] = gains[k] / n
	report["gains"] = gains


func our_caps() -> Dictionary:
	var caps := ManagerSim.caps_from_squad(state["squad"], state["familiarity"])
	var morale := 0.0
	for p in state["squad"]:
		morale += float(p["morale"])
	caps["morale"] = morale / maxi(1, state["squad"].size())
	return caps


func _caps_for_club(id: String) -> Dictionary:
	var s: float = float(state["clubs"][id]["strength"])
	var out := {}
	for k in ManagerSim.CAP_KEYS:
		out[k] = clampf(s + rng.randf_range(-5.0, 5.0), 10.0, 98.0)
	out["fitness"] = 1.0
	out["morale"] = 0.7
	return out


func _play_league_week(report: Dictionary) -> void:
	var week: int = state["week"]
	for f in state["fixtures"]:
		if int(f["week"]) != week or f["played"]:
			continue
		var ours: bool = f["home"] == state["club"] or f["away"] == state["club"]
		var ca: Dictionary = our_caps() if f["home"] == state["club"] else _caps_for_club(f["home"])
		var cb: Dictionary = our_caps() if f["away"] == state["club"] else _caps_for_club(f["away"])
		var res := ManagerSim.simulate(ca, cb, 0, rng)
		f["score"] = res["score"]
		f["played"] = true
		_apply_table(f["home"], f["away"], res["score"])
		if ours:
			var side: int = 0 if f["home"] == state["club"] else 1
			report["match"] = _match_report(f["home"], f["away"], res, side, "league")
			_after_our_match(res, side, report)


func _apply_table(home: String, away: String, score: Array) -> void:
	var th: Dictionary = state["table"][home]
	var ta: Dictionary = state["table"][away]
	th["p"] += 1
	ta["p"] += 1
	th["gf"] += score[0]
	th["ga"] += score[1]
	ta["gf"] += score[1]
	ta["ga"] += score[0]
	if score[0] > score[1]:
		th["w"] += 1
		ta["l"] += 1
		th["pts"] += 3
	elif score[0] < score[1]:
		ta["w"] += 1
		th["l"] += 1
		ta["pts"] += 3
	else:
		th["d"] += 1
		ta["d"] += 1
		th["pts"] += 1
		ta["pts"] += 1


func _match_report(home: String, away: String, res: Dictionary, side: int, kind: String) -> Dictionary:
	var ind: Array = res["indice"]
	return {
		"kind": kind, "home": home, "away": away, "score": res["score"], "side": side,
		"indice": ind[side], "indice_opp": ind[1 - side], "events": res["events"],
		"counts": res["counts"][side],
	}


func _after_our_match(res: Dictionary, side: int, report: Dictionary) -> void:
	var gf: int = res["score"][side]
	var ga: int = res["score"][1 - side]
	var swing := 0.06 if gf > ga else (-0.05 if gf < ga else 0.01)
	var xi := ManagerSim.starting_eleven(state["squad"])
	var scorers := []
	for p in state["squad"]:
		p["morale"] = clampf(float(p["morale"]) + swing, 0.2, 1.0)
	for p in xi:
		p["apps"] += 1
		p["fatigue"] = clampf(float(p["fatigue"]) + 0.22, 0.0, 1.0)
		if rng.randf() < 0.012 * (1.0 + 2.0 * float(p["fatigue"])):
			p["injured"] = rng.randi_range(1, 4)
			report["notes"].append({"kind": "injury", "player": player_name(p), "weeks": p["injured"]})
	# credit goals to attackers, weighted by finishing-type skills
	var att := xi.filter(func(p): return p["role"] != "GK")
	for ev in res["events"]:
		if ev["kind"] == "goal" and ev["side"] == side and not att.is_empty():
			var best: Dictionary = att[rng.randi_range(0, att.size() - 1)]
			if rng.randf() < 0.6:
				var fwds := att.filter(func(p): return p["role"] == "FWD")
				if not fwds.is_empty():
					best = fwds[rng.randi_range(0, fwds.size() - 1)]
			best["goals"] += 1
			scorers.append(player_name(best))
	report["match"]["scorers"] = scorers


func _play_cup_tie(report: Dictionary) -> void:
	var cup: Dictionary = state["cup"]
	var r: int = cup["round"]
	var survivors: Array = cup["survivors"]
	if survivors.is_empty():
		cup["alive"] = false
		return
	var opp: String = survivors[rng.randi_range(0, survivors.size() - 1)]
	survivors.erase(opp)
	var home := r % 2 == 0
	var ca := our_caps() if home else _caps_for_club(opp)
	var cb := _caps_for_club(opp) if home else our_caps()
	var res := ManagerSim.simulate(ca, cb, 0, rng)
	var side := 0 if home else 1
	var gf: int = res["score"][side]
	var ga: int = res["score"][1 - side]
	var won := gf > ga
	if gf == ga:
		# penalties: a coin weighted by decision + keeper
		var ours := our_caps()
		var theirs := _caps_for_club(opp)
		var p_win: float = 0.5 + (ours["finishing"] - theirs["finishing"] + ours["gk"] - theirs["gk"]) / 400.0
		won = rng.randf() < clampf(p_win, 0.2, 0.8)
		res["pens"] = won
	var mr := _match_report(state["club"] if home else opp, opp if home else state["club"], res, side, "cup")
	mr["round"] = CUP_ROUNDS[r]
	mr["won"] = won
	mr["pens"] = res.get("pens", null)
	report["cup"] = mr
	cup["results"].append({"round": CUP_ROUNDS[r], "opp": opp, "score": res["score"], "side": side, "won": won})
	_after_our_match(res, side, report)
	if won:
		state["budget"] = int(state["budget"]) + CUP_PRIZE[r]
		cup["round"] = r + 1
		if cup["round"] >= CUP_ROUNDS.size():
			cup["won"] = true
			cup["alive"] = false
			state["won_continental"] = true
			state["titles"]["continental"] = int(state["titles"]["continental"]) + 1
			report["notes"].append({"kind": "continental_won"})
		else:
			# the other survivors knock each other out: keep roughly half, the strong more often
			var keep := []
			var target: int = int(pow(2, 3 - cup["round"])) - 1
			var sorted := survivors.duplicate()
			sorted.sort_custom(func(a, b): return float(state["clubs"][a]["strength"]) + rng.randf() * 20.0 > float(state["clubs"][b]["strength"]) + rng.randf() * 20.0)
			for i in range(mini(target, sorted.size())):
				keep.append(sorted[i])
			cup["survivors"] = keep
	else:
		cup["alive"] = false
		report["notes"].append({"kind": "cup_out", "round": CUP_ROUNDS[r]})


func _weekly_upkeep(report: Dictionary) -> void:
	state["budget"] = int(state["budget"]) + INCOME[int(state["division"])]
	for p in state["squad"]:
		p["fatigue"] = maxf(0.0, float(p["fatigue"]) - 0.30)
		if int(p["injured"]) > 0:
			p["injured"] = int(p["injured"]) - 1
	report["budget"] = state["budget"]


# ---------------------------------------------------------------- the table

func standings() -> Array:
	var rows := []
	for id in state["table"].keys():
		var r: Dictionary = state["table"][id].duplicate()
		r["id"] = id
		r["gd"] = int(r["gf"]) - int(r["ga"])
		rows.append(r)
	rows.sort_custom(func(a, b):
		if a["pts"] != b["pts"]:
			return a["pts"] > b["pts"]
		if a["gd"] != b["gd"]:
			return a["gd"] > b["gd"]
		if a["gf"] != b["gf"]:
			return a["gf"] > b["gf"]
		return a["id"] < b["id"])
	return rows


func our_position() -> int:
	var rows := standings()
	for i in range(rows.size()):
		if rows[i]["id"] == state["club"]:
			return i + 1
	return rows.size()


# ---------------------------------------------------------------- season end

func _end_season(report: Dictionary) -> void:
	var div: int = state["division"]
	var rows := standings()
	var pos := our_position()
	var summary := {"season": state["season"], "division": div, "position": pos, "points": state["table"][state["club"]]["pts"],
		"champion": rows[0]["id"], "promoted": false, "relegated": false, "cup": state["cup"].duplicate(true)}
	# movements for every club of this division
	var up := []
	var down := []
	for i in range(rows.size()):
		var id: String = rows[i]["id"]
		if i < PROMOTED and div > 1:
			up.append(id)
		elif i >= rows.size() - RELEGATED and div < 3:
			down.append(id)
	# mirror moves: the division above sends its bottom two down, the one below sends its top two up.
	# Other divisions are not simulated match by match; their movers are picked by strength.
	for id in up:
		state["clubs"][id]["division"] = div - 1
	for id in down:
		state["clubs"][id]["division"] = div + 1
	if div > 1:
		var above := _division_members(div - 1).filter(func(id): return not up.has(id))
		above.sort_custom(func(a, b): return float(state["clubs"][a]["strength"]) < float(state["clubs"][b]["strength"]))
		for i in range(mini(RELEGATED, above.size())):
			state["clubs"][above[i]]["division"] = div
	if div < 3:
		var below := _division_members(div + 1).filter(func(id): return not down.has(id))
		below.sort_custom(func(a, b): return float(state["clubs"][a]["strength"]) > float(state["clubs"][b]["strength"]))
		for i in range(mini(PROMOTED, below.size())):
			state["clubs"][below[i]]["division"] = div
	_rebalance_divisions()
	if up.has(state["club"]):
		summary["promoted"] = true
		state["division"] = div - 1
		state["budget"] = int(state["budget"]) + (3000 if div == 2 else 1200)
	elif down.has(state["club"]):
		summary["relegated"] = true
		state["division"] = div + 1
	if div == 1 and pos == 1:
		state["titles"]["l1"] = int(state["titles"]["l1"]) + 1
		state["cup"]["qualified"] = true
		state["budget"] = int(state["budget"]) + 5000
		summary["l1_title"] = true
	# other clubs drift a little; strength of the AI clubs follows their division
	for id in state["clubs"].keys():
		if id == state["club"]:
			continue
		var c: Dictionary = state["clubs"][id]
		c["strength"] = clampf(float(c["strength"]) + rng.randf_range(-3.0, 3.0), 25.0, 95.0)
	# ageing, retirements, youth intake
	var kept := []
	for p in state["squad"]:
		p["age"] = int(p["age"]) + 1
		if p["age"] >= 34 and rng.randf() < 0.6:
			summary["retired"] = summary.get("retired", []) + [player_name(p)]
			continue
		if p["age"] > 29:
			for k in SKILLS:
				p["skills"][k] = maxf(15.0, float(p["skills"][k]) - rng.randf_range(0.5, 2.0))
		p["fatigue"] = 0.0
		p["injured"] = 0
		kept.append(p)
	var youth := []
	for i in range(2):
		var yp := _make_player(["DEF", "MID", "FWD"][rng.randi_range(0, 2)], squad_strength() - 12.0, rng.randi_range(16, 18))
		kept.append(yp)
		youth.append(player_name(yp))
	summary["youth"] = youth
	state["squad"] = kept
	state["history"].append(summary)
	state["season"] = int(state["season"]) + 1
	report["season_end"] = summary
	_start_season()
	auto_plan()


## Keep every division at its nominal size (strength decides who fills gaps).
func _rebalance_divisions() -> void:
	for div in [1, 2, 3]:
		var members := _division_members(div)
		var want: int = DIVISION_SIZE[div]
		while members.size() > want:
			var weakest := ""
			var ws := 999.0
			for id in members:
				if id == state["club"]:
					continue
				if float(state["clubs"][id]["strength"]) < ws:
					ws = float(state["clubs"][id]["strength"])
					weakest = id
			if weakest == "":
				break
			state["clubs"][weakest]["division"] = mini(3, div + 1)
			members = _division_members(div)
		while members.size() < want and div < 3:
			var below := _division_members(div + 1)
			var best := ""
			var bs := -1.0
			for id in below:
				if id == state["club"]:
					continue
				if float(state["clubs"][id]["strength"]) > bs:
					bs = float(state["clubs"][id]["strength"])
					best = id
			if best == "":
				break
			state["clubs"][best]["division"] = div
			members = _division_members(div)


# ---------------------------------------------------------------- club actions

func upgrade_facilities() -> bool:
	var lvl: int = state["facilities"]
	if lvl >= 5:
		return false
	var cost: int = FACILITY_COST[lvl]
	if int(state["budget"]) < cost:
		return false
	state["budget"] = int(state["budget"]) - cost
	state["facilities"] = lvl + 1
	return true


func sign_player(index: int) -> bool:
	if index < 0 or index >= state["market"].size():
		return false
	var offer: Dictionary = state["market"][index]
	if int(state["budget"]) < int(offer["price"]) or state["squad"].size() >= 22:
		return false
	state["budget"] = int(state["budget"]) - int(offer["price"])
	state["squad"].append(offer["player"])
	state["market"].remove_at(index)
	return true


func release_player(pid: String) -> bool:
	if state["squad"].size() <= 13:
		return false
	for i in range(state["squad"].size()):
		if state["squad"][i]["id"] == pid:
			state["squad"].remove_at(i)
			return true
	return false


func season_indice_average() -> float:
	var t := 0.0
	var n := 0
	for r in state.get("reports", []):
		if int(r.get("season", 0)) == int(state["season"]) and r.has("match") and r["match"].has("indice"):
			t += float(r["match"]["indice"]["total"])
			n += 1
	return t / n if n > 0 else 0.0
