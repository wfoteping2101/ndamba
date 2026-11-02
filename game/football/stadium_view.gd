class_name StadiumView
extends Node2D
## Builds the visible ground: ground texture, props, goals, sponsor boards, crowd, lighting
## tint, rain. The crowd is split into sections in the colours of both teams (plus neutrals),
## waves flags, sways, does the wave, and jumps when its team scores.

const FLAG_W := 24
const FLAG_H := 30
const WAVE_SPEED := 320.0

var crowd: Array[AnimatedSprite2D] = []
var crowd_side: PackedInt32Array = []      # 0 home, 1 away, 2 neutral
var crowd_x: PackedFloat32Array = []
var crowd_until: PackedFloat32Array = []   # time at which a cheering fan sits back down (0 = idle)
var flags: Array[AnimatedSprite2D] = []
var flag_side: PackedInt32Array = []
var crowd_rows: Array = []
var _cheer_t: float = 0.0
var _cheer_side: int = -1
var _t: float = 0.0
var _wave_x: float = -1.0e9
var _wave_next: float = 0.0
var _wave_end_x: float = 0.0
var _animated: bool = true
var _rain: GPUParticles2D = null
var _tint: ColorRect = null
var _mats: Array = []                      # [home, away, neutral...]
var _cell: int = 40


func build(stadium: Dictionary, ysort: Node2D, weather: String = "dry", home_team: Dictionary = {}, away_team: Dictionary = {}) -> void:
	var surface: String = stadium.get("surface", "terre")
	if weather == "rain" and surface == "terre":
		surface = "mud"
	var full: bool = stadium.get("layout", "street") == "full"
	var ground := Sprite2D.new()
	ground.texture = load("res://assets/stadium/ground_%s%s.png" % ["full_" if full else "", surface])
	ground.centered = false
	ground.z_index = -10
	add_child(ground)
	# goals (y-sorted with the players so the far post occludes correctly)
	var style: String = stadium.get("goal_style", "bamboo")
	var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/stadium/layout_meta.json"))
	var pr := Content.pitch_rect()
	var gy := pr.position.y + pr.size.y * 0.5
	for side in ["w", "e"]:
		var g := Sprite2D.new()
		g.texture = load("res://assets/props/goal_%s%s_%s.png" % ["full_" if full else "", style, side])
		g.centered = false
		var gm: Dictionary = meta[("goal_full_" if full else "goal_") + side]
		var gx := pr.position.x if side == "w" else pr.end.x
		var mouth_mid := (float(gm["top_y"]) + float(gm["bottom_y"])) * 0.5
		g.position = Vector2(gx - float(gm["goal_line_x"]), gy - mouth_mid)
		# y-sort key: the goal's near post bottom
		g.offset = Vector2(0, -float(gm["bottom_y"]))
		g.position.y += float(gm["bottom_y"])
		g.z_index = 1
		ysort.add_child(g)
	# props and sponsor boards
	var sponsors: Array = Content.sponsors()
	for prop in stadium.get("props", []):
		var ptype: String = str(prop["type"])
		if ptype == "ad" or ptype.begins_with("ad_"):
			var board := AdBoard.new()
			var slot: int = int(prop.get("slot", 0))
			board.setup(sponsors[slot % sponsors.size()])
			board.position = Vector2(prop["x"], prop["y"])
			ysort.add_child(board)
			continue
		var path := "res://assets/props/%s.png" % ptype
		if not ResourceLoader.exists(path):
			continue
		var s := Sprite2D.new()
		s.texture = load(path)
		s.centered = false
		var tex: Texture2D = s.texture
		s.offset = Vector2(-tex.get_width() * 0.5, -tex.get_height())
		s.position = Vector2(prop["x"], prop["y"])
		ysort.add_child(s)
	_build_crowd(stadium, ysort, full, home_team, away_team)
	# lighting tint (golden hour, overcast)
	var tint_hex: String = stadium.get("tint", "#FFFFFF")
	if tint_hex != "#FFFFFF":
		var c := Color.html(tint_hex)
		# multiply-like warm wash using a CanvasModulate instead of a rect
		var cm := CanvasModulate.new()
		cm.color = c.lerp(Color.WHITE, 0.35)
		add_child(cm)
	if weather == "rain":
		_build_rain()


# ---------------------------------------------------------------------------
# Crowd
# ---------------------------------------------------------------------------

func _build_crowd(stadium: Dictionary, ysort: Node2D, full: bool, home_team: Dictionary, away_team: Dictionary) -> void:
	var cjson: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://assets/props/crowd.json"))
	var cmeta: Array = []
	if typeof(cjson) == TYPE_DICTIONARY:
		_cell = int(cjson.get("cell", 40))
		cmeta = cjson.get("rows", [])
	else:
		cmeta = cjson
		_cell = 32
	crowd_rows = cmeta
	var ctex: Texture2D = load("res://assets/props/crowd.png")
	var ftex: Texture2D = load("res://assets/props/flag.png")
	var low: bool = Game.low_quality()
	_animated = not low
	_mats = _section_materials(home_team, away_team)
	var spots: Array = stadium.get("crowd", [])
	if low and spots.size() > 48:
		var thinned := []
		for k in range(spots.size()):
			if k % 3 == 0:
				thinned.append(spots[k])
		spots = thinned
	var pr := Content.pitch_rect()
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(str(stadium.get("id", "x")))
	var i := 0
	var half_cell := float(_cell) * 0.5
	var feet_y := float(_cell) - 4.0
	for spot in spots:
		var row := i % cmeta.size()
		var side := _section_for(spot, pr, full, rng)
		var lift := float(spot.get("lift", 0))
		var a := AnimatedSprite2D.new()
		a.sprite_frames = _crowd_frames(ctex, row)
		a.centered = false
		a.offset = Vector2(-half_cell, -feet_y - lift)
		a.position = Vector2(spot["x"], spot["y"])
		a.frame = rng.randi_range(0, 3)
		a.material = _mats[side] if side < 2 else _mats[2 + (i % (_mats.size() - 2))]
		if _animated:
			a.play("idle")
			a.speed_scale = rng.randf_range(0.7, 1.3)
		else:
			a.stop()   # still crowd: cheaper on phones and in the browser
		ysort.add_child(a)
		crowd.append(a)
		crowd_side.append(side)
		crowd_x.append(float(spot["x"]))
		crowd_until.append(0.0)
		# a few supporters in the team sections hold a flag
		if side < 2 and lift > 0.0 and rng.randf() < 0.09 and ftex != null:
			var fl := AnimatedSprite2D.new()
			fl.sprite_frames = _flag_frames(ftex)
			fl.centered = false
			fl.offset = Vector2(-4.0, -FLAG_H - 14.0 - lift)
			fl.position = Vector2(float(spot["x"]), float(spot["y"]) + 0.5)
			fl.material = _mats[side]
			fl.frame = rng.randi_range(0, 5)
			if _animated:
				fl.play("wave")
				fl.speed_scale = rng.randf_range(0.8, 1.2)
			else:
				fl.stop()
			ysort.add_child(fl)
			flags.append(fl)
			flag_side.append(side)
		i += 1
	_wave_next = 18.0 + rng.randf() * 20.0
	_wave_end_x = float(Content.layouts.get(Content.layout_name, {}).get("world", [800, 520])[0]) + 80.0


## Which section a seat belongs to: the end stands are the two kops (home west, away east), the
## south stand is split at the halfway line, the north stand is mixed with a home majority.
func _section_for(spot: Dictionary, pr: Rect2, full: bool, rng: RandomNumberGenerator) -> int:
	var x := float(spot["x"])
	var y := float(spot["y"])
	var r := rng.randf()
	if not full:
		# neighbourhood ground: everybody's shirt, with the home quarter well represented
		return 0 if r < 0.45 else (1 if r < 0.68 else 2)
	if x < pr.position.x - 20.0:
		return 0 if r < 0.9 else 2
	if x > pr.end.x + 20.0:
		return 1 if r < 0.9 else 2
	if y > pr.end.y:
		if x < pr.get_center().x:
			return 0 if r < 0.88 else 2
		return 1 if r < 0.88 else 2
	return 0 if r < 0.58 else (1 if r < 0.84 else 2)


## Materials shared by every fan of a section so the renderer can batch them.
func _section_materials(home_team: Dictionary, away_team: Dictionary) -> Array:
	var out: Array = []
	for team in [home_team, away_team]:
		var kit: Dictionary = team.get("kit_home", {}) if typeof(team) == TYPE_DICTIONARY else {}
		var j1: String = str(kit.get("jersey", "#2E6B45"))
		var j2: String = str(kit.get("jersey2", "#F2EEE3"))
		if team == away_team and j1 == str(home_team.get("kit_home", {}).get("jersey", "")):
			var away_kit: Dictionary = away_team.get("kit_away", kit)
			j1 = str(away_kit.get("jersey", j1))
			j2 = str(away_kit.get("jersey2", j2))
		out.append(Sprites.palette_material({"jersey": Sprites.tones(j1), "jersey2": Sprites.tones(j2)}))
	var neutral := [["#F2EEE3", "#C9362B"], ["#F0B92E", "#2E6B45"], ["#2E63B8", "#F2EEE3"], ["#8E44AD", "#F7DC6F"], ["#E67E22", "#1C1C22"], ["#1ABC9C", "#F2EEE3"]]
	for pair in neutral:
		out.append(Sprites.palette_material({"jersey": Sprites.tones(pair[0]), "jersey2": Sprites.tones(pair[1])}))
	return out


static var _crowd_cache: Dictionary = {}
static var _flag_cache: SpriteFrames = null

func _crowd_frames(tex: Texture2D, row: int) -> SpriteFrames:
	var key := row * 100 + _cell
	if _crowd_cache.has(key):
		return _crowd_cache[key]
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	for anim in [["idle", 0, 4, 4.0], ["cheer", 4, 4, 7.0]]:
		sf.add_animation(anim[0])
		sf.set_animation_speed(anim[0], anim[3])
		sf.set_animation_loop(anim[0], true)
		for f in range(anim[2]):
			var at := AtlasTexture.new()
			at.atlas = tex
			at.region = Rect2((anim[1] + f) * _cell, row * _cell, _cell, _cell)
			sf.add_frame(anim[0], at)
	_crowd_cache[key] = sf
	return sf


func _flag_frames(tex: Texture2D) -> SpriteFrames:
	if _flag_cache != null:
		return _flag_cache
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	sf.add_animation("wave")
	sf.set_animation_speed("wave", 8.0)
	sf.set_animation_loop("wave", true)
	for f in range(int(tex.get_width() / FLAG_W)):
		var at := AtlasTexture.new()
		at.atlas = tex
		at.region = Rect2(f * FLAG_W, 0, FLAG_W, FLAG_H)
		sf.add_frame("wave", at)
	_flag_cache = sf
	return sf


## Goal: the scoring side jumps, waves harder and keeps going for a few seconds.
func crowd_cheer(home_scored: bool) -> void:
	_cheer_t = 4.0
	_cheer_side = 0 if home_scored else 1
	for i in range(crowd.size()):
		var own: bool = crowd_side[i] == _cheer_side
		if randf() < (0.92 if own else 0.12):
			_cheer_one(i, _t + 4.0 + randf() * 1.5)
	for i in range(flags.size()):
		if flag_side[i] == _cheer_side and _animated:
			flags[i].speed_scale = 2.2


## A near miss: a ripple of fans stand up for a moment.
func crowd_gasp() -> void:
	for i in range(crowd.size()):
		if randf() < 0.18:
			_cheer_one(i, _t + 1.2 + randf() * 0.6)


func _cheer_one(i: int, until: float) -> void:
	if not _animated:
		return
	if crowd_until[i] <= 0.0:
		crowd[i].play("cheer")
		crowd[i].frame = randi() % 4
	crowd_until[i] = until


func _process(delta: float) -> void:
	_t += delta
	if not _animated or crowd.is_empty():
		return
	# the wave goes round the ground now and then
	if _wave_x < -1.0e8:
		_wave_next -= delta
		if _wave_next <= 0.0 and _cheer_t <= 0.0:
			_wave_x = -80.0
	else:
		_wave_x += WAVE_SPEED * delta
		if _wave_x > _wave_end_x:
			_wave_x = -1.0e9
			_wave_next = 30.0 + randf() * 30.0
	var wave_on := _wave_x > -1.0e8
	for i in range(crowd.size()):
		if wave_on and crowd_until[i] <= 0.0 and absf(crowd_x[i] - _wave_x) < 34.0:
			_cheer_one(i, _t + 0.9)
		elif crowd_until[i] > 0.0 and _t >= crowd_until[i]:
			crowd_until[i] = 0.0
			crowd[i].play("idle")
	if _cheer_t > 0.0:
		_cheer_t -= delta
		if _cheer_t <= 0.0:
			for i in range(flags.size()):
				flags[i].speed_scale = randf_range(0.8, 1.2)


func _build_rain() -> void:
	var p := CPUParticles2D.new()
	p.amount = 260
	p.lifetime = 1.1
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(420, 20)
	p.position = Vector2(400, -20)
	p.direction = Vector2(0.15, 1)
	p.spread = 4.0
	p.gravity = Vector2(0, 600)
	p.initial_velocity_min = 380
	p.initial_velocity_max = 480
	p.scale_amount_min = 0.6
	p.scale_amount_max = 1.0
	p.color = Color(0.85, 0.9, 1.0, 0.55)
	var img := Image.create(1, 4, false, Image.FORMAT_RGBA8)
	img.fill(Color(1, 1, 1, 1))
	p.texture = ImageTexture.create_from_image(img)
	p.z_index = 50
	add_child(p)
