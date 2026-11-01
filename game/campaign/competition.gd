class_name Competition
extends RefCounted
## League and cup campaigns played in the match engine: the player's team plays its fixture,
## the other fixtures are quick-simulated. State is a plain Dictionary saved in a SaveStore slot
## ("league" or "cup").

const LEAGUE_TEAMS := ["lionceaux_bonamoussadi", "requins_bepanda", "pantheres_deido", "mokolo_etoiles", "aigles_akwa", "port_bonaberi", "carrefour_ndokoti", "rois_new_bell"]
const CUP_ROUNDS := ["qf", "sf", "final"]

var kind: String = "league"        # league | cup
var state: Dictionary = {}
var rng := RandomNumberGenerator.new()


func _init(p_kind: String = "league") -> void:
	kind = p_kind


func slot() -> String:
	return kind


static func has_save(p_kind: String) -> bool:
	return Game.save.exists(p_kind)


func save() -> void:
	state["rng_state"] = rng.state
	Game.save.write(slot(), state)


func load_game() -> bool:
	var d: Variant = Game.save.read(slot())
	if typeof(d) != TYPE_DICTIONARY or not d.has("team"):
		return false
	state = d
	rng.state = int(state.get("rng_state", 0))
	return true


## options: {format, half_minutes, difficulty}
func new_game(team_id: String, options: Dictionary, seed_value: int = -1) -> void:
	if seed_value < 0:
		rng.randomize()
	else:
		rng.seed = seed_value
	state = {
		"kind": kind, "team": team_id, "format": options.get("format", "11v11"),
		"half_minutes": float(options.get("half_minutes", 3.0)), "difficulty": int(options.get("difficulty", 2)),
		"teams": LEAGUE_TEAMS.duplicate(), "week": 1, "fixtures": [], "table": {}, "done": false,
		"results": [], "rounds": [], "alive": true, "champion": "",
	}
	if kind == "league":
		for id in state["teams"]:
			state["table"][id] = {"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0}
		state["fixtures"] = _round_robin(state["teams"])
	else:
		var ids: Array = state["teams"].duplicate()
		# seeded shuffle with our rng
		for i in range(ids.size() - 1, 0, -1):
			var j := rng.randi_range(0, i)
			var tmp = ids[i]
			ids[i] = ids[j]
			ids[j] = tmp
		var ties := []
		for i in range(0, ids.size(), 2):
			ties.append({"home": ids[i], "away": ids[i + 1], "score": [0, 0], "pens": [], "played": false, "winner": ""})
		state["rounds"] = [{"name": "qf", "ties": ties}]


static func _round_robin(members: Array) -> Array:
	var ids: Array = members.duplicate()
	var n := ids.size()
	var rounds: Array = []
	for r in range(n - 1):
		var pairs := []
		for i in range(n / 2):
			var a: String = ids[i]
			var b: String = ids[n - 1 - i]
			if (r + i) % 2 == 0:
				pairs.append([a, b])
			else:
				pairs.append([b, a])
		rounds.append(pairs)
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


func total_weeks() -> int:
	var w := 0
	for f in state["fixtures"]:
		w = maxi(w, int(f["week"]))
	return w


# ---------------------------------------------------------------- the player's next match

## The fixture the player has to play now, or {} when the campaign is over / eliminated.
func next_fixture() -> Dictionary:
	if state.get("done", false):
		return {}
	if kind == "league":
		for f in state["fixtures"]:
			if int(f["week"]) == int(state["week"]) and (f["home"] == state["team"] or f["away"] == state["team"]):
				return f
		return {}
	if not state.get("alive", true):
		return {}
	var rd: Dictionary = state["rounds"][-1]
	for t in rd["ties"]:
		if not t["played"] and (t["home"] == state["team"] or t["away"] == state["team"]):
			return t
	return {}


func round_name() -> String:
	if kind != "cup" or state["rounds"].is_empty():
		return ""
	return state["rounds"][-1]["name"]


## Ground for a fixture: the home team's ground, or a full stadium for 11v11.
static func stadium_for(home_team: String, format: String) -> String:
	var t := Content.team(home_team)
	var sid: String = t.get("stadium", "bonamoussadi_terre")
	var allowed: Array = Content.layouts.get(Content.layout_of_stadium(sid), {}).get("formats", ["5v5"])
	if allowed.has(format):
		return sid
	# pick a ground of the right layout in the same city when possible
	var want_layout := "full" if format == "11v11" else "street"
	var best := ""
	for s in Content.stadium_index:
		if s.get("layout", "street") == want_layout:
			if best == "" or s.get("city", "") == t.get("city", ""):
				best = s["id"]
	return best if best != "" else sid


## Fill Game.match_config for the player's fixture and return the scene to return to.
func configure_match(f: Dictionary, return_scene: String) -> void:
	var c := Game.match_config
	c["home"] = f["home"]
	c["away"] = f["away"]
	c["format"] = state["format"]
	c["stadium"] = stadium_for(f["home"], state["format"])
	c["half_minutes"] = float(state["half_minutes"])
	c["difficulty"] = int(state["difficulty"])
	c["human_home"] = f["home"] == state["team"]
	c["human_away"] = f["away"] == state["team"]
	c["weather"] = "rain" if rng.randf() < 0.15 else "dry"
	c["competition"] = kind
	c["kickoff_home"] = true
	c["label"] = Loc.t("league.matchday", {"n": state["week"]}) if kind == "league" else Loc.t("cup." + round_name())
	c["return_to"] = return_scene
	Game.pending = {"kind": kind, "home": f["home"], "away": f["away"], "needs_winner": kind == "cup"}


## Apply the player's played result ({score:[h,a], pens:[h,a] optional}) and simulate the rest.
func apply_result(home: String, away: String, score: Array, pens: Array = []) -> Dictionary:
	var summary := {"played": {"home": home, "away": away, "score": score, "pens": pens}, "others": []}
	if kind == "league":
		for f in state["fixtures"]:
			if int(f["week"]) != int(state["week"]) or f["played"]:
				continue
			var sc: Array
			if f["home"] == home and f["away"] == away:
				sc = score
			else:
				sc = QuickSim.play(f["home"], f["away"], rng)
				summary["others"].append({"home": f["home"], "away": f["away"], "score": sc})
			f["score"] = sc
			f["played"] = true
			_apply_table(f["home"], f["away"], sc)
		state["results"].append(summary["played"])
		state["week"] = int(state["week"]) + 1
		if int(state["week"]) > total_weeks():
			state["done"] = true
			state["champion"] = standings()[0]["id"]
	else:
		var rd: Dictionary = state["rounds"][-1]
		for t in rd["ties"]:
			if t["played"]:
				continue
			var sc: Array
			var pn: Array = []
			if t["home"] == home and t["away"] == away:
				sc = score
				pn = pens
			else:
				sc = QuickSim.play(t["home"], t["away"], rng)
				if sc[0] == sc[1]:
					pn = QuickSim.shootout(t["home"], t["away"], rng)
				summary["others"].append({"home": t["home"], "away": t["away"], "score": sc, "pens": pn})
			t["score"] = sc
			t["pens"] = pn
			t["played"] = true
			var hw: bool = sc[0] > sc[1] or (sc[0] == sc[1] and pn.size() == 2 and pn[0] > pn[1])
			t["winner"] = t["home"] if hw else t["away"]
		state["results"].append(summary["played"])
		var winners := []
		for t in rd["ties"]:
			winners.append(t["winner"])
		if not winners.has(state["team"]):
			state["alive"] = false
			state["done"] = true
		if winners.size() == 1:
			state["champion"] = winners[0]
			state["done"] = true
		elif state["alive"]:
			var ties := []
			for i in range(0, winners.size(), 2):
				ties.append({"home": winners[i], "away": winners[i + 1], "score": [0, 0], "pens": [], "played": false, "winner": ""})
			state["rounds"].append({"name": CUP_ROUNDS[state["rounds"].size()], "ties": ties})
	return summary


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
		if rows[i]["id"] == state["team"]:
			return i + 1
	return rows.size()
