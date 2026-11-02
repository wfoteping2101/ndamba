extends Node
## Content autoload: teams, stadiums, surfaces, pitch geometry, player names.
## Everything is data in res://content (generated from /content at the repo root).

var teams: Dictionary = {}        # id -> team dict
var team_index: Array = []
var stadiums: Dictionary = {}     # id -> stadium dict
var stadium_index: Array = []
var surfaces: Dictionary = {}
var pitch: Dictionary = {}        # the active layout (street or full), see set_layout
var layouts: Dictionary = {}
var layout_name: String = "street"
var _ppm: float = 8.0
var skin_tones: Dictionary = {}
var hair_colours: Dictionary = {}
var palette_keys: Dictionary = {}
# Sponsors: the bundled list (content/sponsors.json), the list published next to index.html on the
# website (sponsors.json, fetched at start), and the boards the player added in Réglages → Sponsors.
var sponsors_bundled: Array = []
var sponsors_web: Array = []
var sponsors_local: Array = []
const SPONSORS_LOCAL_PATH := "user://sponsors.json"


func _ready() -> void:
	_load_all()
	_load_sponsors()


# ---------------------------------------------------------------------------
# Sponsors
# ---------------------------------------------------------------------------

func _load_sponsors() -> void:
	var sj: Variant = _load_json("res://content/sponsors.json")
	if typeof(sj) == TYPE_DICTIONARY:
		sponsors_bundled = _clean_sponsors(sj.get("sponsors", []))
	if FileAccess.file_exists(SPONSORS_LOCAL_PATH):
		var lj: Variant = JSON.parse_string(FileAccess.get_file_as_string(SPONSORS_LOCAL_PATH))
		if typeof(lj) == TYPE_DICTIONARY:
			sponsors_local = _clean_sponsors(lj.get("sponsors", []))
	if OS.has_feature("web"):
		_fetch_web_sponsors()


## Keeps only well-formed entries: {name, url, bg, fg, title}.
func _clean_sponsors(raw: Array) -> Array:
	var out: Array = []
	for e in raw:
		if typeof(e) != TYPE_DICTIONARY:
			continue
		var name: String = str(e.get("name", "")).strip_edges().to_upper().left(18)
		if name == "":
			continue
		var bg: String = str(e.get("bg", "#1F4D3A"))
		var fg: String = str(e.get("fg", "#F6F1E4"))
		if not bg.begins_with("#") or bg.length() != 7:
			bg = "#1F4D3A"
		if not fg.begins_with("#") or fg.length() != 7:
			fg = Sprites.contrast_hex(bg)
		out.append({"name": name, "url": str(e.get("url", "")), "bg": bg, "fg": fg, "title": bool(e.get("title", false))})
	return out


## The boards in display order: the published list (website file when it loaded, else the bundled
## one) followed by the player's own boards. Never empty.
func sponsors() -> Array:
	var base: Array = sponsors_web if sponsors_web.size() > 0 else sponsors_bundled
	var out: Array = base.duplicate()
	var names := {}
	for e in out:
		names[e["name"]] = true
	for e in sponsors_local:
		if not names.has(e["name"]):
			out.append(e)
			names[e["name"]] = true
	if out.is_empty():
		out.append({"name": "NDAMBA", "url": "", "bg": "#1F4D3A", "fg": "#F6F1E4", "title": true})
	return out


## The title sponsor: the first entry flagged `title`, else the first board.
func title_sponsor() -> Dictionary:
	var all := sponsors()
	for e in all:
		if e.get("title", false):
			return e
	return all[0]


func add_sponsor(name: String, bg: String, fg: String = "", url: String = "") -> bool:
	var cleaned := _clean_sponsors([{"name": name, "bg": bg, "fg": fg, "url": url}])
	if cleaned.is_empty():
		return false
	for i in range(sponsors_local.size()):
		if sponsors_local[i]["name"] == cleaned[0]["name"]:
			sponsors_local[i] = cleaned[0]
			_save_local_sponsors()
			return true
	sponsors_local.append(cleaned[0])
	_save_local_sponsors()
	return true


func remove_sponsor(name: String) -> void:
	for i in range(sponsors_local.size() - 1, -1, -1):
		if sponsors_local[i]["name"] == name.to_upper():
			sponsors_local.remove_at(i)
	_save_local_sponsors()


func _save_local_sponsors() -> void:
	var f := FileAccess.open(SPONSORS_LOCAL_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify({"sponsors": sponsors_local}, "  "))


## On the website: sponsors.json sits next to index.html so the site owner can add a paying
## company without rebuilding the game.
func _fetch_web_sponsors() -> void:
	var base: String = ""
	var href: Variant = JavaScriptBridge.eval("window.location.href", true)
	if typeof(href) == TYPE_STRING:
		base = String(href)
		var q := base.find("?")
		if q >= 0:
			base = base.left(q)
		var h := base.find("#")
		if h >= 0:
			base = base.left(h)
		base = base.left(base.rfind("/") + 1)
	if base == "":
		return
	var req := HTTPRequest.new()
	req.name = "SponsorsRequest"
	req.timeout = 8.0
	add_child(req)
	req.request_completed.connect(func(_r: int, code: int, _h: PackedStringArray, body: PackedByteArray):
		if code == 200:
			var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
			if typeof(parsed) == TYPE_DICTIONARY:
				sponsors_web = _clean_sponsors(parsed.get("sponsors", []))
		req.queue_free())
	var err := req.request(base + "sponsors.json")
	if err != OK:
		req.queue_free()


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
	var pj: Dictionary = _load_json("res://content/stadiums/pitch.json")
	layouts = pj["layouts"]
	_ppm = float(pj.get("ppm", 8.0))
	set_layout("street")
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


## Select the pitch layout ("street": 50x31 m neighbourhood ground, "full": 105x68 m stadium).
func set_layout(name: String) -> void:
	layout_name = name if layouts.has(name) else "street"
	pitch = layouts[layout_name]


## Layout of a stadium (its "layout" field, street by default).
func layout_of_stadium(stadium_id: String) -> String:
	return stadium(stadium_id).get("layout", "street")


## Players per side for a format string ("5v5", "7v7", "11v11").
static func format_size(format: String) -> int:
	return int(format.get_slice("v", 0)) if format.contains("v") else 5


func lineup_key(format: String) -> String:
	match format_size(format):
		11: return "lineup11"
		7: return "lineup7"
		_: return "lineup"


func formation_for(team_id: String, format: String) -> String:
	var t := team(team_id)
	match format_size(format):
		11: return t.get("formation11", "1-4-3-3")
		7: return t.get("formation7", "1-3-2-1")
		_: return t.get("formation", "1-2-1-1")


func lineup(team_id: String, format: String = "5v5") -> Array:
	var t := team(team_id)
	var out: Array = []
	for pid in t.get(lineup_key(format), t.get("lineup", [])):
		out.append(player_of(team_id, pid))
	return out


func bench(team_id: String, format: String = "5v5") -> Array:
	var t := team(team_id)
	var out: Array = []
	var starters: Array = t.get(lineup_key(format), t.get("lineup", []))
	for p in t.get("players", []):
		if not starters.has(p["id"]):
			out.append(p)
	return out


func display_name(p: Dictionary) -> String:
	if p.get("nick", "") != "":
		return p["given"]
	return p["given"]


## Short name for tags and plates: the family name, or the given name for the book's kids.
func tag_name(p: Dictionary) -> String:
	var fam: String = p.get("family", "")
	return fam if fam != "" else p.get("given", "")


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
	return _ppm


func rules() -> String:
	return pitch.get("rules", "street")


func goal_half_width() -> float:
	return float(pitch["goal_width_m"]) * ppm() * 0.5


func goal_height() -> float:
	return float(pitch["goal_height_m"]) * ppm()
