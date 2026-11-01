extends Node
## Content autoload: teams, stadiums, surfaces, pitch geometry, player names.
## Everything is data in res://content (generated from /content at the repo root).

var teams: Dictionary = {}        # id -> team dict
var team_index: Array = []
var stadiums: Dictionary = {}     # id -> stadium dict
var stadium_index: Array = []
var surfaces: Dictionary = {}
var pitch: Dictionary = {}
var skin_tones: Dictionary = {}
var hair_colours: Dictionary = {}
var palette_keys: Dictionary = {}


func _ready() -> void:
	_load_all()


func _load_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("missing content file: " + path)
		return null
	var txt := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(txt)
	if parsed == null:
		push_error("bad JSON: " + path)
	return parsed


func _load_all() -> void:
	team_index = _load_json("res://content/teams/index.json") as Array
	for t in team_index:
		teams[t["id"]] = _load_json("res://content/teams/%s.json" % t["id"])
	stadium_index = _load_json("res://content/stadiums/index.json") as Array
	for s in stadium_index:
		stadiums[s["id"]] = _load_json("res://content/stadiums/%s.json" % s["id"])
	surfaces = _load_json("res://content/stadiums/surfaces.json")
	pitch = _load_json("res://content/stadiums/pitch.json")
	var pal: Dictionary = _load_json("res://content/palettes.json")
	skin_tones = pal["skin_tones"]
	hair_colours = pal["hair_colours"]
	palette_keys = pal["keys"]


func team(id: String) -> Dictionary:
	return teams.get(id, {})


func stadium(id: String) -> Dictionary:
	return stadiums.get(id, {})


func surface(name: String) -> Dictionary:
	return surfaces.get(name, surfaces["terre"])


func player_of(team_id: String, player_id: String) -> Dictionary:
	for p in team(team_id).get("players", []):
		if p["id"] == player_id:
			return p
	return {}


func lineup(team_id: String) -> Array:
	var t := team(team_id)
	var out: Array = []
	for pid in t.get("lineup", []):
		out.append(player_of(team_id, pid))
	return out


func bench(team_id: String) -> Array:
	var t := team(team_id)
	var out: Array = []
	for p in t.get("players", []):
		if not t.get("lineup", []).has(p["id"]):
			out.append(p)
	return out


func display_name(p: Dictionary) -> String:
	if p.get("nick", "") != "":
		return p["given"]
	return p["given"]


func full_name(p: Dictionary) -> String:
	var n: String = p["given"]
	if p.get("nick", "") != "":
		n += " \"%s\"" % p["nick"]
	if p.get("family", "") != "":
		n += " " + p["family"]
	return n


## Pitch rectangle in world pixels.
func pitch_rect() -> Rect2:
	var p: Dictionary = pitch["pitch"]
	return Rect2(p["x"], p["y"], p["w"], p["h"])


func world_size() -> Vector2:
	return Vector2(pitch["world"][0], pitch["world"][1])


func ppm() -> float:
	return float(pitch["ppm"])


func goal_half_width() -> float:
	return float(pitch["goal_width_m"]) * ppm() * 0.5


func goal_height() -> float:
	return float(pitch["goal_height_m"]) * ppm()
