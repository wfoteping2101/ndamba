extends Node2D
## Penalty shoot-out, top-down like the match: five kicks each, then sudden death.
## Kicker (human): aim with up/down, hold SHOOT to charge, release to kick (too much power
## flies over the bar). Keeper (human): pick up/down/centre before the kick, the keeper dives.
## Reads Game.match_config (teams, kits, stadium) and Game.pending; writes Game.last_result["pens"]
## and returns to Game.match_config["return_to"].

const GOAL_X := 420.0
const SPOT_X := 332.0
const MID_Y := 180.0
const KICKS := 5

var teams: Array = []            # [{id, data, kit, human}]
var score: Array = [0, 0]
var taken: Array = [0, 0]
var log: Array = [[], []]        # true = scored
var side: int = 0                # who kicks now
var state: String = "ready"      # ready | aim | charge | flight | shown | over
var t: float = 0.0
var aim: float = 0.0             # -1 top .. 1 bottom
var power: float = 0.0
var keeper_guess: float = 0.0
var outcome: String = ""
var human_kicker: bool = false
var human_keeper: bool = false
var kicker: AnimatedSprite2D
var keeper: AnimatedSprite2D
var ball: Sprite2D
var ball_shadow: Sprite2D
var ball_h: float = 0.0
var ball_from: Vector2
var ball_to: Vector2
var flight_t: float = 0.0
var hud: CanvasLayer
var msg: Label
var hint: Label
var dots: Array = []
var names: Array = []
var _goal_half: float = 15.0
var _keeper_prefix: String = ""
var _kicker_prefix: String = ""
var overlay: Node2D


func _ready() -> void:
	var c := Game.match_config
	var stadium := Content.stadium(c["stadium"])
	Content.set_layout(stadium.get("layout", "street"))
	_goal_half = Content.goal_half_width()
	for i in range(2):
		var tid: String = c["home"] if i == 0 else c["away"]
		var data := Content.team(tid)
		var kit: Dictionary = data.get("kit_home", {})
		if i == 1 and _clash(Content.team(c["home"]).get("kit_home", {}), kit):
			kit = data.get("kit_away", kit)
		teams.append({"id": tid, "data": data, "kit": kit, "human": bool(c["human_home"]) if i == 0 else bool(c["human_away"])})
	# ground: a crop of the stadium texture around a goal, drawn as a sprite
	var full: bool = stadium.get("layout", "street") == "full"
	var surface: String = stadium.get("surface", "terre")
	if c.get("weather", "dry") == "rain" and surface == "terre":
		surface = "mud"
	var ground := Sprite2D.new()
	ground.texture = load("res://assets/stadium/ground_%s%s.png" % ["full_" if full else "", surface])
	ground.centered = false
	var pr := Content.pitch_rect()
	# place the world so the east goal sits at GOAL_X, MID_Y on screen
	ground.position = Vector2(GOAL_X - pr.end.x, MID_Y - (pr.position.y + pr.size.y * 0.5))
	add_child(ground)
	var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/stadium/layout_meta.json"))
	var gm: Dictionary = meta[("goal_full_" if full else "goal_") + "e"]
	var g := Sprite2D.new()
	g.texture = load("res://assets/props/goal_%s%s_e.png" % ["full_" if full else "", stadium.get("goal_style", "bamboo")])
	g.centered = false
	var mouth_mid := (float(gm["top_y"]) + float(gm["bottom_y"])) * 0.5
	g.position = Vector2(GOAL_X - float(gm["goal_line_x"]), MID_Y - mouth_mid)
	g.z_index = 2
	add_child(g)
	# sprites
	keeper = _make_sprite(teams[1 - side], true)
	kicker = _make_sprite(teams[side], false)
	ball_shadow = Sprite2D.new()
	ball_shadow.texture = load("res://assets/fx/ball.png")
	ball_shadow.hframes = 5
	ball_shadow.frame = 4
	add_child(ball_shadow)
	ball = Sprite2D.new()
	ball.texture = load("res://assets/fx/ball.png")
	ball.hframes = 5
	ball.z_index = 4
	add_child(ball)
	overlay = Node2D.new()
	overlay.z_index = 6
	overlay.draw.connect(_draw_overlay)
	add_child(overlay)
	_build_hud()
	var cam := Camera2D.new()
	cam.position = Vector2((SPOT_X + GOAL_X) * 0.5 - 10.0, MID_Y)
	cam.zoom = Vector2(2.0, 2.0)
	add_child(cam)
	cam.make_current()
	Sfx.crowd(true)
	_setup_kick()


func _clash(a: Dictionary, b: Dictionary) -> bool:
	var ca := Color.html(a.get("jersey", "#000000"))
	var cb := Color.html(b.get("jersey", "#ffffff"))
	return (Vector3(ca.r, ca.g, ca.b) - Vector3(cb.r, cb.g, cb.b)).length() < 0.42


func _make_sprite(team: Dictionary, is_keeper: bool) -> AnimatedSprite2D:
	var data: Dictionary = team["data"]
	var fmt: String = Game.match_config.get("format", "5v5")
	var lineup := Content.lineup(team["id"], fmt)
	var pdata: Dictionary = {}
	for p in lineup:
		if (p.get("role", "") == "GK") == is_keeper:
			pdata = p
			break
	if pdata.is_empty() and not lineup.is_empty():
		pdata = lineup[0]
	var hair: String = pdata.get("hair", "short")
	var kit: Dictionary = data.get("kit_gk", team["kit"]) if is_keeper else team["kit"]
	var pattern: String = kit.get("pattern", "plain")
	if pattern == "rags":
		pattern = pdata.get("shirt_pattern", "plain")
	var sheet: String = ("gk_" + hair) if is_keeper else ("%s_%s" % [hair, pattern])
	var s := AnimatedSprite2D.new()
	s.sprite_frames = Sprites.player_frames(sheet)
	s.offset = Sprites.feet_offset() + Vector2(Sprites.half_cell(), 0)
	s.centered = false
	s.position = Vector2(-Sprites.half_cell(), 0)
	s.material = Sprites.palette_material(Sprites.player_palette(kit, pdata, is_keeper))
	s.set_meta("name", Content.tag_name(pdata).to_upper())
	s.z_index = 3 if is_keeper else 1
	add_child(s)
	return s


func _build_hud() -> void:
	hud = CanvasLayer.new()
	add_child(hud)
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = UiTheme.theme()
	hud.add_child(root)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.86), UiTheme.SUN, 0, 4, 1))
	panel.position = Vector2(6, 5)
	root.add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	panel.add_child(v)
	var title := UiTheme.label(Loc.t("pens.title"), 8, true, UiTheme.SUN)
	v.add_child(title)
	for i in range(2):
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 4)
		v.add_child(h)
		var nm := UiTheme.label(teams[i]["data"].get("short", ""), 8, true, UiTheme.CREAM)
		nm.custom_minimum_size.x = 30
		h.add_child(nm)
		var row := Control.new()
		row.custom_minimum_size = Vector2(70, 8)
		row.set_meta("i", i)
		row.draw.connect(func():
			var idx: int = row.get_meta("i")
			for k in range(maxi(KICKS, log[idx].size())):
				var col := Color(1, 1, 1, 0.2)
				if k < log[idx].size():
					col = UiTheme.FOREST_LIGHT if log[idx][k] else UiTheme.CLAY
				row.draw_rect(Rect2(k * 9, 1, 7, 6), col))
		h.add_child(row)
		dots.append(row)
		var sc := UiTheme.label("0", 8, true, UiTheme.SUN)
		h.add_child(sc)
		names.append(sc)
	msg = UiTheme.label("", 10, true, UiTheme.SUN)
	msg.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	msg.offset_top = 48
	msg.offset_bottom = 64
	msg.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(msg)
	hint = UiTheme.label("", 8, false, UiTheme.CREAM)
	hint.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	hint.offset_top = -22
	hint.offset_bottom = -8
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(hint)


func _setup_kick() -> void:
	human_kicker = teams[side]["human"]
	human_keeper = teams[1 - side]["human"]
	_kicker_prefix = "" if side == 0 or not teams[0]["human"] else "p2_"
	_keeper_prefix = "" if (1 - side) == 0 or not teams[0]["human"] else "p2_"
	if teams[0]["human"] and teams[1]["human"]:
		_kicker_prefix = "" if side == 0 else "p2_"
		_keeper_prefix = "" if side == 1 else "p2_"
	# rebuild the sprites for the new kicker/keeper
	kicker.queue_free()
	keeper.queue_free()
	keeper = _make_sprite(teams[1 - side], true)
	kicker = _make_sprite(teams[side], false)
	keeper.position = Vector2(GOAL_X - 6.0, MID_Y)
	keeper.play("set_W")
	kicker.position = Vector2(SPOT_X - 26.0, MID_Y + 4.0)
	kicker.play("idle_E")
	ball_from = Vector2(SPOT_X, MID_Y)
	ball.position = ball_from
	ball_shadow.position = ball_from
	ball_h = 0.0
	aim = 0.0
	power = 0.0
	keeper_guess = 0.0
	outcome = ""
	state = "aim"
	t = 0.0
	var kn: String = kicker.get_meta("name")
	msg.text = Loc.t("pens.kicker", {"team": teams[side]["data"].get("short", ""), "name": kn})
	if human_kicker:
		hint.text = Loc.t("pens.hint_kick")
	elif human_keeper:
		hint.text = Loc.t("pens.hint_keep")
	else:
		hint.text = ""


func _process(delta: float) -> void:
	t += delta
	match state:
		"aim":
			if human_kicker:
				var mv := Input.get_axis(_kicker_prefix + "move_up", _kicker_prefix + "move_down")
				aim = clampf(aim + mv * delta * 2.2, -1.0, 1.0)
				if Input.is_action_just_pressed(_kicker_prefix + "shoot") or Input.is_action_just_pressed(_kicker_prefix + "pass"):
					state = "charge"
					t = 0.0
			else:
				if human_keeper:
					var mv := Input.get_axis(_keeper_prefix + "move_up", _keeper_prefix + "move_down")
					keeper_guess = clampf(keeper_guess + mv * delta * 3.0, -1.0, 1.0)
				if t > 2.2:
					aim = [-0.85, -0.6, 0.0, 0.6, 0.85][randi() % 5] + randf_range(-0.1, 0.1)
					power = randf_range(0.45, 0.95)
					_kick()
		"charge":
			power = clampf(t / 1.1, 0.0, 1.0)
			if human_keeper:
				var mv := Input.get_axis(_keeper_prefix + "move_up", _keeper_prefix + "move_down")
				keeper_guess = clampf(keeper_guess + mv * delta * 3.0, -1.0, 1.0)
			if Input.is_action_just_released(_kicker_prefix + "shoot") or Input.is_action_just_released(_kicker_prefix + "pass") or power >= 1.0:
				_kick()
		"flight":
			flight_t += delta
			var u := clampf(flight_t / 0.42, 0.0, 1.0)
			var p := ball_from.lerp(ball_to, u)
			ball_h = (12.0 * power + (26.0 if outcome == "over" else 0.0)) * sin(u * PI) * (1.0 if outcome != "over" else 1.4)
			if outcome == "saved" and u > 0.75:
				p = ball_from.lerp(ball_to, 0.75) + Vector2(-18.0, 0) * (u - 0.75) * 4.0
			ball_shadow.position = p
			ball.position = p - Vector2(0, ball_h)
			ball.frame = int(flight_t * 24.0) % 4
			if u >= 1.0:
				state = "shown"
				t = 0.0
				_resolve()
		"shown":
			if t > 1.6:
				_next()
		"over":
			if t > 2.4:
				_finish()
	overlay.queue_redraw()


func _kick() -> void:
	# the keeper decides: a human keeper's guess, or a weighted guess for the AI
	if not human_keeper:
		var guess_right := randf() < 0.5
		keeper_guess = (signf(aim) if guess_right else -signf(aim)) * randf_range(0.5, 1.0)
		if absf(aim) < 0.25 and randf() < 0.3:
			keeper_guess = 0.0
	var corner_y := aim * (_goal_half - 3.0)
	ball_to = Vector2(GOAL_X + 6.0, MID_Y + corner_y)
	outcome = "goal"
	if power > 0.92:
		outcome = "over"
		ball_to = Vector2(GOAL_X + 18.0, MID_Y + corner_y)
	else:
		var same_side: bool = (signf(keeper_guess) == signf(aim) and absf(keeper_guess) > 0.2 and absf(aim) > 0.2) or (absf(keeper_guess) <= 0.2 and absf(aim) <= 0.25)
		if same_side:
			var save_p := 0.82 - 0.45 * absf(aim) - (0.15 if power > 0.6 else 0.0)
			if power < 0.3:
				save_p += 0.25
			if randf() < clampf(save_p, 0.1, 0.95):
				outcome = "saved"
	kicker.play("kick_E")
	Sfx.play("kick_hard" if power > 0.5 else "kick_soft")
	keeper.play("dive_l_W" if keeper_guess < -0.2 else ("dive_r_W" if keeper_guess > 0.2 else "set_W"))
	# the keeper slides toward his guess
	var tw := create_tween()
	tw.tween_property(keeper, "position:y", MID_Y + keeper_guess * (_goal_half - 4.0), 0.35)
	state = "flight"
	flight_t = 0.0
	hint.text = ""


func _resolve() -> void:
	log[side].append(outcome == "goal")
	taken[side] += 1
	if outcome == "goal":
		score[side] += 1
		Sfx.play("goal", Vector2.ZERO, -4.0)
		msg.text = Loc.t("pens.goal")
	elif outcome == "saved":
		Sfx.play("catch")
		msg.text = Loc.t("pens.saved")
	else:
		Sfx.play("post", Vector2.ZERO, -8.0)
		msg.text = Loc.t("pens.over")
	names[0].text = str(score[0])
	names[1].text = str(score[1])
	for d in dots:
		d.queue_redraw()
	if _decided():
		state = "over"
		t = 0.0
		var w := 0 if score[0] > score[1] else 1
		msg.text = Loc.t("pens.winner", {"team": teams[w]["data"].get("name", "")})
		Sfx.play("whistle_long")


func _decided() -> bool:
	# over when one side cannot be caught within the five kicks, or after five each when unequal
	var a: int = score[0]
	var b: int = score[1]
	var ra: int = maxi(0, KICKS - taken[0])
	var rb: int = maxi(0, KICKS - taken[1])
	if taken[0] <= KICKS and taken[1] <= KICKS and (taken[0] < KICKS or taken[1] < KICKS):
		return a > b + rb or b > a + ra
	if taken[0] == taken[1]:
		return a != b
	return false


func _next() -> void:
	side = 1 - side
	_setup_kick()


func write_result() -> void:
	Game.last_result["pens"] = score.duplicate()
	Game.last_result["score"] = Game.last_result.get("score", [0, 0])


func _finish() -> void:
	write_result()
	var back: String = Game.match_config.get("return_to", "")
	if back == "":
		back = "res://scenes/title.tscn"
	get_tree().change_scene_to_file(back)


func _draw_overlay() -> void:
	# aim marker on the goal line and the power bar
	if state == "aim" or state == "charge":
		if human_kicker:
			var y := MID_Y + aim * (_goal_half - 3.0)
			overlay.draw_rect(Rect2(GOAL_X + 2.0, y - 2.0, 4.0, 4.0), UiTheme.SUN)
			overlay.draw_rect(Rect2(GOAL_X + 1.0, y - 3.0, 6.0, 6.0), Color(0, 0, 0, 0.7), false, 1.0)
		if human_keeper:
			var ky := MID_Y + keeper_guess * (_goal_half - 4.0)
			overlay.draw_rect(Rect2(GOAL_X - 12.0, ky - 2.0, 4.0, 4.0), UiTheme.CREAM)
		if state == "charge":
			var w := 40.0
			var x := SPOT_X - w * 0.5
			var y2 := MID_Y + 26.0
			overlay.draw_rect(Rect2(x - 1, y2 - 1, w + 2, 6), Color(0, 0, 0, 0.7))
			overlay.draw_rect(Rect2(x, y2, w * power, 4), UiTheme.SUN.lerp(UiTheme.CLAY, power))
			overlay.draw_rect(Rect2(x + w * 0.92, y2 - 1, 1, 6), Color.WHITE)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and state == "over":
		_finish()
