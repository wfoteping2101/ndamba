extends Node
## Sprites autoload: turns the generated sheets (+ JSON meta) into SpriteFrames, cached.
## Animation names are "<anim>_<dir>" with dir in S, SW, W, NW, N, NE, E, SE.

const PLAYER_DIR := "res://assets/players/"
const DIRS := ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]

var _frames_cache: Dictionary = {}
var _meta_cache: Dictionary = {}
var palette_shader: Shader = preload("res://shaders/palette.gdshader")


func _meta(name: String) -> Dictionary:
	if _meta_cache.has(name):
		return _meta_cache[name]
	var txt := FileAccess.get_file_as_string(PLAYER_DIR + name + ".json")
	var m: Dictionary = JSON.parse_string(txt)
	_meta_cache[name] = m
	return m


## sheet: e.g. "short_stripes" or "gk_afro". Returns SpriteFrames shared by every user.
func player_frames(sheet: String) -> SpriteFrames:
	if _frames_cache.has(sheet):
		return _frames_cache[sheet]
	var tex: Texture2D = load(PLAYER_DIR + sheet + ".png")
	var meta := _meta("keeper" if sheet.begins_with("gk_") else "outfield")
	var cell: int = int(meta["cell"])
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	for anim_name in meta["anims"].keys():
		var a: Dictionary = meta["anims"][anim_name]
		for row in range(DIRS.size()):
			var full := "%s_%s" % [anim_name, DIRS[row]]
			sf.add_animation(full)
			sf.set_animation_speed(full, float(a["fps"]))
			sf.set_animation_loop(full, bool(a["loop"]))
			for f in range(int(a["frames"])):
				var at := AtlasTexture.new()
				at.atlas = tex
				at.region = Rect2((int(a["start"]) + f) * cell, row * cell, cell, cell)
				sf.add_frame(full, at)
	_frames_cache[sheet] = sf
	return sf


func half_cell() -> float:
	return float(_meta("outfield")["cell"]) * 0.5


func feet_offset() -> Vector2:
	var meta := _meta("outfield")
	return Vector2(-float(meta["cell"]) * 0.5, -float(meta["feet_y"]) - 1.0)


## Builds a ShaderMaterial that maps the key colours to a real kit / skin / hair palette.
## colours: {"skin": [base, light, dark] hex, "hair": ..., "jersey": ..., "jersey2": ..., "shorts": ..., "socks": ..., "socks2": ..., "boots": ..., "keeper": ..., "gloves": ..., "wrap": ...}
func palette_material(colours: Dictionary) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = palette_shader
	var keys: PackedColorArray = []
	var repl: PackedColorArray = []
	for name in Content.palette_keys.keys():
		var k: Array = Content.palette_keys[name]
		var r: Array = colours.get(name, k)
		for i in range(3):
			keys.append(Color.html(k[i]))
			repl.append(Color.html(r[i]))
	mat.set_shader_parameter("keys", keys)
	mat.set_shader_parameter("repl", repl)
	mat.set_shader_parameter("count", keys.size())
	return mat


## Convenience: derive [base, light, dark] from one hex colour.
static func tones(hex: String) -> Array:
	var c := Color.html(hex)
	var light := c.lerp(Color(1.0, 0.957, 0.839), 0.22)
	var dark := c.lerp(Color(0.173, 0.094, 0.157), 0.28)
	return [c.to_html(false), light.to_html(false), dark.to_html(false)]


## Palette for a player given his team kit dictionary and player data.
func player_palette(kit: Dictionary, player: Dictionary, keeper: bool = false) -> Dictionary:
	var pal := {}
	pal["skin"] = Content.skin_tones.get(player.get("skin", "brown"), Content.skin_tones["brown"])
	pal["hair"] = Content.hair_colours["black"]
	if keeper:
		pal["keeper"] = tones(kit.get("jersey", "#E3A92B"))
		pal["gloves"] = tones("#F2EEE3")
	elif kit.get("pattern", "plain") == "rags":
		# street match: everybody wears their own shirt (Lionceaux, chapter 3)
		pal["jersey"] = tones(player.get("shirt", "#F2EEE3"))
		pal["jersey2"] = tones(player.get("shirt2", "#C9362B"))
	else:
		pal["jersey"] = tones(kit.get("jersey", "#2E6B45"))
		pal["jersey2"] = tones(kit.get("jersey2", "#F2EEE3"))
	pal["shorts"] = tones(kit.get("shorts", "#1C1C22"))
	var socks: String = kit.get("socks", "#F2EEE3")
	pal["socks"] = tones(socks)
	pal["socks2"] = tones(socks)
	if player.get("socks_mismatch", false):
		pal["socks"] = tones("#F2C230")    # yellow on the left foot
		pal["socks2"] = tones("#D63C2F")   # red on the right foot
	pal["boots"] = tones("#232026")
	pal["wrap"] = tones(kit.get("jersey2", "#C9362B"))
	return pal
