extends Node
## Game autoload: settings, the pending match configuration, results history, save slots.

const SAVE_VERSION := 1

var save := SaveStore.new(SAVE_VERSION, "user://saves")

var settings := {
	"lang": "fr",
	"music": 0.7,
	"sfx": 0.9,
	"commentary": true,
	"touch_scale": 1.0,
	"touch_opacity": 0.75,
	"touch_layout": "right",      # right | left (mirrors buttons/joystick)
	"simple_controls": false,     # young children: one button does pass/shoot by context
	"quality": "auto",            # auto | low | high
	"reduced_motion": false,
	"show_touch": "auto",         # auto | on | off
	"assist_aim": true,
	"assist_run": true,           # the controlled player runs to loose balls when the stick is released
	"pad_style": "auto",          # auto | xbox | playstation: button names in the hints
	"speed": "medium",            # slow | medium | fast: simulation pace of the match
	"names": true,                # name tags over the players
}

## Simulation pace multiplier for the chosen speed setting (tests pin it with sim_speed_override).
var sim_speed_override: float = -1.0


func speed_scale() -> float:
	if sim_speed_override > 0.0:
		return sim_speed_override
	match str(settings.get("speed", "medium")):
		"slow": return 0.70
		"fast": return 1.0
		_: return 0.85

## The next match to play. Filled by the setup screen (or by tests / QA mode).
var match_config := {
	"home": "lionceaux_bonamoussadi",
	"away": "requins_bepanda",
	"stadium": "stade_wouri",
	"half_minutes": 4.0,          # real minutes per half
	"difficulty": 1,              # 0 beginner .. 4 expert (casual by default: the family plays first)
	"human_home": true,           # human controls home? (false => human vs nothing: AI vs AI)
	"human_away": false,
	"extra_time": false,
	"penalties": false,
	"format": "11v11",
	"weather": "dry",             # dry | rain
	"kickoff_home": true,
	"competition": "friendly",
	"label": "",
}

var results: Array = []           # played match results, newest last
var pending: Dictionary = {}      # campaign fixture being played: {kind, home, away, needs_winner}
var last_result: Dictionary = {}
var qa_mode := false
var qa_dir := ""
var qa_intro := false             # QA: play the stadium intro instead of skipping it
var attract_mode := false
var stats := {"matches": 0, "wins": 0, "goals": 0}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_parse_args()
	load_settings()
	Loc.set_language(settings["lang"])
	apply_audio()


func _parse_args() -> void:
	var args := OS.get_cmdline_user_args()
	var i := 0
	while i < args.size():
		var a: String = args[i]
		if a == "--qa" and i + 1 < args.size():
			qa_mode = true
			qa_dir = args[i + 1]
			i += 1
		elif a == "--lang" and i + 1 < args.size():
			settings["lang"] = args[i + 1]
			i += 1
		elif a == "--half" and i + 1 < args.size():
			match_config["half_minutes"] = float(args[i + 1])
			i += 1
		elif a == "--teams" and i + 2 < args.size():
			match_config["home"] = args[i + 1]
			match_config["away"] = args[i + 2]
			i += 2
		elif a == "--stadium" and i + 1 < args.size():
			match_config["stadium"] = args[i + 1]
			i += 1
		elif a == "--difficulty" and i + 1 < args.size():
			match_config["difficulty"] = int(args[i + 1])
			i += 1
		elif a == "--competition" and i + 1 < args.size():
			match_config["competition"] = args[i + 1]
			i += 1
		elif a == "--weather" and i + 1 < args.size():
			match_config["weather"] = args[i + 1]
			i += 1
		elif a == "--intro":
			qa_intro = true
		elif a == "--format" and i + 1 < args.size():
			match_config["format"] = args[i + 1]
			i += 1
		elif a == "--speed" and i + 1 < args.size():
			settings["speed"] = args[i + 1]
			i += 1
		i += 1
	if qa_mode:
		match_config["human_home"] = false
		match_config["human_away"] = false


func load_settings() -> void:
	var d: Variant = save.read("settings")
	if typeof(d) == TYPE_DICTIONARY:
		for k in d.keys():
			if settings.has(k):
				settings[k] = d[k]
	var r: Variant = save.read("results")
	if typeof(r) == TYPE_DICTIONARY:
		results = r.get("results", [])
		stats = r.get("stats", stats)


func save_settings() -> void:
	settings["lang"] = Loc.lang
	save.write("settings", settings)


func apply_audio() -> void:
	var music_idx := AudioServer.get_bus_index("Music")
	var sfx_idx := AudioServer.get_bus_index("Sfx")
	if music_idx >= 0:
		AudioServer.set_bus_volume_db(music_idx, linear_to_db(clampf(settings["music"], 0.0001, 1.0)))
	if sfx_idx >= 0:
		AudioServer.set_bus_volume_db(sfx_idx, linear_to_db(clampf(settings["sfx"], 0.0001, 1.0)))


func record_result(result: Dictionary) -> void:
	last_result = result
	results.append(result)
	if results.size() > 50:
		results = results.slice(results.size() - 50)
	stats["matches"] += 1
	var human_side: String = "home" if match_config["human_home"] else ("away" if match_config["human_away"] else "")
	if human_side != "":
		var hg: int = result["score"][0] if human_side == "home" else result["score"][1]
		var og: int = result["score"][1] if human_side == "home" else result["score"][0]
		stats["goals"] += hg
		if hg > og:
			stats["wins"] += 1
	save.write("results", {"results": results, "stats": stats})


func difficulty_name(d: int) -> String:
	return ["diff.beginner", "diff.casual", "diff.intermediate", "diff.advanced", "diff.expert"][clampi(d, 0, 4)]


## Low quality: the setting, or auto on phones and in mobile browsers.
func low_quality() -> bool:
	var q: String = str(settings.get("quality", "auto"))
	if q == "low":
		return true
	if q == "high":
		return false
	return is_mobile()


## Button names for the hints: the setting, or detected from the first connected pad.
func pad_style() -> String:
	var s: String = str(settings.get("pad_style", "auto"))
	if s != "auto":
		return s
	for id in Input.get_connected_joypads():
		var n := Input.get_joy_name(id).to_lower()
		if n.contains("ps") or n.contains("dual") or n.contains("sony") or n.contains("playstation") or n.contains("wireless controller"):
			return "playstation"
		return "xbox"
	return "xbox"


## Name of the first connected pad, "" when none.
func pad_name() -> String:
	for id in Input.get_connected_joypads():
		return Input.get_joy_name(id)
	return ""


## True on phones/tablets and on mobile browsers.
func is_mobile() -> bool:
	if settings["show_touch"] == "on":
		return true
	if settings["show_touch"] == "off":
		return false
	if OS.has_feature("android") or OS.has_feature("ios"):
		return true
	if OS.has_feature("web") and DisplayServer.is_touchscreen_available():
		return true
	return false
