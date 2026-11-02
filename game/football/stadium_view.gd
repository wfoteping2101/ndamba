class_name StadiumView
extends Node2D
## Builds the visible ground: ground texture, props, goals, crowd, lighting tint, rain.

var crowd: Array[AnimatedSprite2D] = []
var crowd_rows: Array = []
var _cheer_t: float = 0.0
var _rain: GPUParticles2D = null
var _tint: ColorRect = null


func build(stadium: Dictionary, ysort: Node2D, weather: String = "dry") -> void:
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
	# props
	for prop in stadium.get("props", []):
		var path := "res://assets/props/%s.png" % prop["type"]
		if not ResourceLoader.exists(path):
			continue
		var s := Sprite2D.new()
		s.texture = load(path)
		s.centered = false
		var tex: Texture2D = s.texture
		s.offset = Vector2(-tex.get_width() * 0.5, -tex.get_height())
		s.position = Vector2(prop["x"], prop["y"])
		ysort.add_child(s)
	# crowd
	var cmeta: Array = JSON.parse_string(FileAccess.get_file_as_string("res://assets/props/crowd.json"))
	var ctex: Texture2D = load("res://assets/props/crowd.png")
	var i := 0
	var low: bool = Game.low_quality()
	var spots: Array = stadium.get("crowd", [])
	if low and spots.size() > 48:
		var thinned := []
		for k in range(spots.size()):
			if k % 3 == 0:
				thinned.append(spots[k])
		spots = thinned
	for spot in spots:
		var row := i % cmeta.size()
		var sf := _crowd_frames(ctex, row)
		var a := AnimatedSprite2D.new()
		a.sprite_frames = sf
		a.centered = false
		a.offset = Vector2(-16, -30 - float(spot.get("lift", 0)))
		a.position = Vector2(spot["x"], spot["y"])
		a.frame = randi() % 4
		if low:
			a.stop()   # still crowd: cheaper on phones and in the browser
		else:
			a.play("idle")
			a.speed_scale = randf_range(0.7, 1.3)
		ysort.add_child(a)
		crowd.append(a)
		i += 1
	# lighting tint (golden hour, overcast)
	var tint_hex: String = stadium.get("tint", "#FFFFFF")
	if tint_hex != "#FFFFFF":
		_tint = ColorRect.new()
		_tint.color = Color.html(tint_hex)
		_tint.color.a = 0.0
		var c := Color.html(tint_hex)
		# multiply-like warm wash using a CanvasModulate instead of a rect
		var cm := CanvasModulate.new()
		cm.color = c.lerp(Color.WHITE, 0.35)
		add_child(cm)
	if weather == "rain":
		_build_rain()


static var _crowd_cache: Dictionary = {}

func _crowd_frames(tex: Texture2D, row: int) -> SpriteFrames:
	if _crowd_cache.has(row):
		return _crowd_cache[row]
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	for anim in [["idle", 0, 4, 4.0], ["cheer", 4, 4, 7.0]]:
		sf.add_animation(anim[0])
		sf.set_animation_speed(anim[0], anim[3])
		sf.set_animation_loop(anim[0], true)
		for f in range(anim[2]):
			var at := AtlasTexture.new()
			at.atlas = tex
			at.region = Rect2((anim[1] + f) * 32, row * 32, 32, 32)
			sf.add_frame(anim[0], at)
	_crowd_cache[row] = sf
	return sf


func crowd_cheer(home_scored: bool) -> void:
	_cheer_t = 3.0
	for a in crowd:
		if randf() < (0.8 if home_scored else 0.35):
			a.play("cheer")


func _process(delta: float) -> void:
	if _cheer_t > 0.0:
		_cheer_t -= delta
		if _cheer_t <= 0.0:
			for a in crowd:
				a.play("idle")


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
