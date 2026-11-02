class_name Hud
extends CanvasLayer
## Match HUD: scoreboard, clock, banners, commentary ticker, pause menu, controls hint.

var m
var score_home: Label
var score_away: Label
var name_home: Label
var name_away: Label
var clock: Label
var half_label: Label
var banner: Label
var banner_panel: PanelContainer
var ticker: Label
var ticker_panel: PanelContainer
var pause_panel: PanelContainer
var hint_panel: PanelContainer
var _banner_t: float = 0.0
var _ticker_t: float = 0.0
var _hint_t: float = 0.0
var root: Control
var radar: Control
var plate_l: PanelContainer
var plate_r: PanelContainer
var plate_l_num: Label
var plate_l_name: Label
var plate_l_pips: Control
var plate_r_num: Label
var plate_r_name: Label
var plate_r_pips: Control
var intro_panel: Control
var score_panel: PanelContainer
var intro_lineups: Control
var _intro_shown_lineups: bool = false
const RADAR_W := 84.0
const RADAR_H := 50.0


func setup(p_match) -> void:
	m = p_match
	layer = 10
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = UiTheme.theme()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	_build_scoreboard()
	_build_banner()
	_build_ticker()
	_build_pause()
	_build_hint()
	_build_radar()
	_build_plates()
	_build_intro()
	m.score_changed.connect(_on_score)
	m.clock_changed.connect(func(t): clock.text = t)
	m.event.connect(_on_event)
	m.phase_changed.connect(_on_phase)
	_on_score(0, 0)
	clock.text = "00:00"
	half_label.text = Loc.t("hud.half1")


func _build_scoreboard() -> void:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.86), UiTheme.SUN, 0, 3, 1))
	panel.position = Vector2(6, 5)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(panel)
	score_panel = panel
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 5)
	panel.add_child(h)
	# clock box on the left, like a broadcast bug
	var clock_box := PanelContainer.new()
	clock_box.add_theme_stylebox_override("panel", UiTheme.panel(UiTheme.SUN, Color(0, 0, 0, 0), 0, 3, 0))
	clock_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	h.add_child(clock_box)
	var cv := VBoxContainer.new()
	cv.add_theme_constant_override("separation", 1)
	clock_box.add_child(cv)
	clock = UiTheme.label("00:00", 8, true, UiTheme.NIGHT)
	cv.add_child(clock)
	half_label = UiTheme.label("", 8, false, Color(UiTheme.NIGHT, 0.85))
	cv.add_child(half_label)
	# two stacked team rows
	var g := GridContainer.new()
	g.columns = 3
	g.add_theme_constant_override("h_separation", 5)
	g.add_theme_constant_override("v_separation", 1)
	h.add_child(g)
	g.add_child(_team_colour_box(m.teams[0]))
	name_home = UiTheme.label(m.teams[0].data.get("short", "HOM"), 8, true)
	g.add_child(name_home)
	score_home = UiTheme.label("0", 8, true, UiTheme.SUN)
	g.add_child(score_home)
	g.add_child(_team_colour_box(m.teams[1]))
	name_away = UiTheme.label(m.teams[1].data.get("short", "AWY"), 8, true)
	g.add_child(name_away)
	score_away = UiTheme.label("0", 8, true, UiTheme.SUN)
	g.add_child(score_away)


func _team_colour_box(team: Team) -> Control:
	var c := ColorRect.new()
	var kit: Dictionary = team.data.get("kit_home", {})
	c.color = Color.html(kit.get("jersey", "#ffffff"))
	c.custom_minimum_size = Vector2(6, 10)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var wrap := MarginContainer.new()
	wrap.add_theme_constant_override("margin_top", 1)
	wrap.add_child(c)
	return wrap


func _build_banner() -> void:
	banner_panel = PanelContainer.new()
	banner_panel.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.CLAY, 0.92), UiTheme.SUN, 0, 8, 2))
	banner_panel.set_anchors_preset(Control.PRESET_CENTER_TOP)
	banner_panel.position = Vector2(0, 60)
	banner_panel.visible = false
	banner_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(banner_panel)
	banner = UiTheme.label("", 12, true, UiTheme.CREAM)
	banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner_panel.add_child(banner)


func _build_ticker() -> void:
	ticker_panel = PanelContainer.new()
	ticker_panel.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.78), Color(0, 0, 0, 0), 0, 4))
	ticker_panel.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	ticker_panel.visible = false
	ticker_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(ticker_panel)
	ticker = UiTheme.label("", 8, false, UiTheme.CREAM)
	ticker.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ticker_panel.add_child(ticker)


func _build_pause() -> void:
	pause_panel = PanelContainer.new()
	pause_panel.set_anchors_preset(Control.PRESET_CENTER)
	pause_panel.visible = false
	root.add_child(pause_panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	pause_panel.add_child(v)
	var title := UiTheme.label(Loc.t("hud.pause"), 12, true, UiTheme.SUN)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(title)
	var resume := UiTheme.button(Loc.t("hud.resume"), 150)
	resume.pressed.connect(func(): set_paused(false))
	v.add_child(resume)
	var controls := UiTheme.button(Loc.t("hud.controls"), 150)
	controls.pressed.connect(func(): show_hint(6.0))
	v.add_child(controls)
	var restart := UiTheme.button(Loc.t("hud.restart"), 150)
	restart.pressed.connect(func(): get_tree().paused = false; get_tree().change_scene_to_file("res://scenes/match.tscn"))
	v.add_child(restart)
	var quit := UiTheme.button(Loc.t("hud.quit_match"), 150)
	quit.pressed.connect(func(): get_tree().paused = false; get_tree().change_scene_to_file("res://scenes/title.tscn"))
	v.add_child(quit)
	pause_panel.process_mode = Node.PROCESS_MODE_ALWAYS


func _build_hint() -> void:
	hint_panel = PanelContainer.new()
	hint_panel.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	hint_panel.position.y -= 30
	hint_panel.visible = false
	hint_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(hint_panel)
	var v := VBoxContainer.new()
	hint_panel.add_child(v)
	var pad := Input.get_connected_joypads().size() > 0
	var lines := []
	if Game.is_mobile():
		lines = ["%s: A   %s: B   %s: X" % [Loc.t("hud.pass_hint"), Loc.t("hud.shoot_hint"), Loc.t("hud.through_hint")],
				 "%s: >>   %s: Y" % [Loc.t("hud.sprint_hint"), Loc.t("hud.switch_hint")]]
	elif pad:
		var ps: bool = Game.pad_style() == "playstation"
		var b := {"a": "Croix" if ps else "A", "b": "Rond" if ps else "B", "x": "Carré" if ps else "X", "y": "Triangle" if ps else "Y", "rb": "R1" if ps else "RB"}
		if Loc.lang == "en" and ps:
			b = {"a": "Cross", "b": "Circle", "x": "Square", "y": "Triangle", "rb": "R1"}
		lines = ["%s: %s   %s: %s (%s)   %s: %s" % [Loc.t("hud.pass_hint"), b["a"], Loc.t("hud.shoot_hint"), b["b"], Loc.t("hud.hold"), Loc.t("hud.through_hint"), b["x"]],
				 "%s: %s   %s: %s" % [Loc.t("hud.sprint_hint"), b["rb"], Loc.t("hud.switch_hint"), b["y"]]]
	else:
		lines = ["WASD / fleches   %s: J   %s: K (maintenir)   %s: L" % [Loc.t("hud.pass_hint"), Loc.t("hud.shoot_hint"), Loc.t("hud.through_hint")],
				 "%s: Shift   %s: Espace   Esc: Pause" % [Loc.t("hud.sprint_hint"), Loc.t("hud.switch_hint")]]
	if m.humans.size() == 2:
		lines.append("J2 / P2: fleches, %s: ,   %s: .   %s: /   %s: Ctrl droit   %s: Shift droit   (ou 2e manette)" % [Loc.t("hud.pass_hint"), Loc.t("hud.shoot_hint"), Loc.t("hud.through_hint"), Loc.t("hud.sprint_hint"), Loc.t("hud.switch_hint")])
	lines.append(Loc.t("hud.tackle_hint"))
	for l in lines:
		var lab := UiTheme.label(l, 8)
		lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(lab)


func _build_radar() -> void:
	radar = Control.new()
	radar.custom_minimum_size = Vector2(RADAR_W + 4, RADAR_H + 4)
	radar.size = radar.custom_minimum_size
	radar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	radar.draw.connect(_draw_radar)
	root.add_child(radar)


func _draw_radar() -> void:
	var pr: Rect2 = m.pitch_rect
	var r := Rect2(2, 2, RADAR_W, RADAR_H)
	radar.draw_rect(Rect2(0, 0, RADAR_W + 4, RADAR_H + 4), Color(0, 0, 0, 0.55))
	radar.draw_rect(r, Color(0.2, 0.42, 0.22, 0.75))
	radar.draw_rect(r, Color(1, 1, 1, 0.5), false, 1.0)
	radar.draw_line(Vector2(r.position.x + r.size.x * 0.5, r.position.y), Vector2(r.position.x + r.size.x * 0.5, r.end.y), Color(1, 1, 1, 0.35), 1.0)
	for t in m.teams:
		var kit: Dictionary = t.data.get("kit_home", {})
		var col := Color.html(kit.get("jersey", "#ffffff"))
		if t.index == 1 and _kits_close(col, Color.html(m.teams[0].data.get("kit_home", {}).get("jersey", "#ffffff"))):
			col = Color.html(kit.get("jersey2", "#ffffff"))
		for p in t.players:
			var u: Vector2 = (p.pos - pr.position) / pr.size
			var q: Vector2 = r.position + Vector2(clampf(u.x, 0.0, 1.0) * r.size.x, clampf(u.y, 0.0, 1.0) * r.size.y)
			var is_me: bool = m.humans.has(t.index) and m.humans[t.index].current == p
			radar.draw_rect(Rect2(q.x - 1, q.y - 1, 3 if is_me else 2, 3 if is_me else 2), col)
			if is_me:
				radar.draw_rect(Rect2(q.x - 2, q.y - 2, 5, 5), Color(1, 1, 1, 0.9), false, 1.0)
	if m.ball != null:
		var u: Vector2 = (m.ball.pos - pr.position) / pr.size
		var q: Vector2 = r.position + Vector2(clampf(u.x, 0.0, 1.0) * r.size.x, clampf(u.y, 0.0, 1.0) * r.size.y)
		radar.draw_rect(Rect2(q.x - 1, q.y - 1, 2, 2), Color.WHITE)


static func _kits_close(a: Color, b: Color) -> bool:
	return (Vector3(a.r, a.g, a.b) - Vector3(b.r, b.g, b.b)).length() < 0.42


func _build_plates() -> void:
	plate_l = _make_plate(false)
	plate_r = _make_plate(true)
	root.add_child(plate_l)
	root.add_child(plate_r)
	plate_l.visible = false
	plate_r.visible = false


func _make_plate(right: bool) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.82), Color(0, 0, 0, 0), 0, 3, 0))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 4)
	p.add_child(h)
	var num := UiTheme.label("", 8, true, UiTheme.SUN)
	var nm := UiTheme.label("", 8, true, UiTheme.CREAM)
	var pips := Control.new()
	pips.custom_minimum_size = Vector2(26, 8)
	pips.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if right:
		h.add_child(pips)
		h.add_child(nm)
		h.add_child(num)
		plate_r_num = num
		plate_r_name = nm
		plate_r_pips = pips
	else:
		h.add_child(num)
		h.add_child(nm)
		h.add_child(pips)
		plate_l_num = num
		plate_l_name = nm
		plate_l_pips = pips
	pips.set_meta("stamina", 1.0)
	pips.draw.connect(func():
		var st: float = pips.get_meta("stamina")
		for i in range(5):
			var on := st > (i + 0.5) / 5.0
			var c := UiTheme.SUN if on else Color(1, 1, 1, 0.18)
			if on and st < 0.35:
				c = UiTheme.CLAY
			pips.draw_rect(Rect2(i * 5, 2, 4, 4), c))
	return p


func _plate_player(side: int) -> Footballer:
	# left plate: the human's player (or the home team's ball carrier); right plate: the other side
	var t: Team = m.teams[side]
	if m.humans.has(side) and m.humans[side].current != null:
		return m.humans[side].current
	if m.ball != null and m.ball.owner_player != null and m.ball.owner_player.team_index == side:
		return m.ball.owner_player
	var best: Footballer = null
	var bd := INF
	for p in t.players:
		var d: float = p.pos.distance_to(m.ball.pos) if m.ball != null else 0.0
		if d < bd:
			bd = d
			best = p
	return best


func _update_plates() -> void:
	var playing: bool = m.phase in [Match.Phase.PLAY, Match.Phase.KICKOFF, Match.Phase.SETPIECE]
	plate_l.visible = playing
	plate_r.visible = playing
	if not playing:
		return
	var a := _plate_player(0)
	var b := _plate_player(1)
	if a != null:
		plate_l_num.text = str(int(a.data.get("number", 0)))
		plate_l_name.text = Content.tag_name(a.data).to_upper()
		plate_l_pips.set_meta("stamina", a.stamina)
		plate_l_pips.queue_redraw()
	if b != null:
		plate_r_num.text = str(int(b.data.get("number", 0)))
		plate_r_name.text = Content.tag_name(b.data).to_upper()
		plate_r_pips.set_meta("stamina", b.stamina)
		plate_r_pips.queue_redraw()


func _build_intro() -> void:
	intro_panel = Control.new()
	intro_panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	intro_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(intro_panel)
	# ground card, top centre
	var card := PanelContainer.new()
	card.name = "Card"
	card.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.86), UiTheme.SUN, 0, 6, 1))
	card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	intro_panel.add_child(card)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	card.add_child(v)
	var st := Loc.field(m.stadium, "name")
	var l1 := UiTheme.label(st.to_upper(), 8, true, UiTheme.SUN)
	l1.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(l1)
	var l2 := UiTheme.label("%s  ·  %s" % [m.stadium.get("city", ""), Loc.t("intro.capacity", {"n": int(m.stadium.get("capacity", 0))})], 8, false, UiTheme.CREAM)
	l2.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(l2)
	var hv := HBoxContainer.new()
	hv.add_theme_constant_override("separation", 6)
	hv.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(hv)
	hv.add_child(_team_colour_box(m.teams[0]))
	hv.add_child(UiTheme.label(m.teams[0].data.get("name", ""), 8, true, UiTheme.CREAM))
	hv.add_child(UiTheme.label(Loc.t("intro.vs"), 8, false, UiTheme.SUN))
	hv.add_child(UiTheme.label(m.teams[1].data.get("name", ""), 8, true, UiTheme.CREAM))
	hv.add_child(_team_colour_box(m.teams[1]))
	var l3 := UiTheme.label("%s  ·  %s  ·  %s" % [Loc.t("intro.format", {"f": m.config.get("format", "5v5")}), Loc.t(Game.difficulty_name(int(m.config.get("difficulty", 2)))), Loc.t("intro.skip")], 8, false, Color(UiTheme.CREAM, 0.7))
	l3.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(l3)
	# line-ups, shown during the second part of the fly-over
	intro_lineups = PanelContainer.new()
	intro_lineups.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.88), UiTheme.SUN, 0, 6, 1))
	intro_lineups.mouse_filter = Control.MOUSE_FILTER_IGNORE
	intro_lineups.visible = false
	intro_panel.add_child(intro_lineups)
	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 14)
	intro_lineups.add_child(cols)
	for ti in range(2):
		var col := VBoxContainer.new()
		col.add_theme_constant_override("separation", 1)
		cols.add_child(col)
		var t: Team = m.teams[ti]
		var head := UiTheme.label("%s  (%s)" % [t.data.get("short", ""), t.formation.substr(2)], 8, true, UiTheme.SUN)
		col.add_child(head)
		for p in t.players:
			var line := UiTheme.label("%2d  %s" % [int(p.data.get("number", 0)), Content.full_name(p.data).replace("\"", "")], 8, false, UiTheme.CREAM)
			col.add_child(line)


func _update_intro() -> void:
	var on: bool = m.phase == Match.Phase.INTRO and not Game.attract_mode
	intro_panel.visible = on
	score_panel.visible = not on
	if not on:
		return
	var vp := root.size
	var card: Control = intro_panel.get_node("Card")
	var u: float = m.phase_t / maxf(0.1, m.intro_seconds)
	card.position = Vector2(roundf((vp.x - card.size.x) * 0.5), vp.y - card.size.y - 8 if u <= 0.5 else 8)
	intro_lineups.visible = u > 0.5
	intro_lineups.position = Vector2(roundf((vp.x - intro_lineups.size.x) * 0.5), roundf((vp.y - intro_lineups.size.y) * 0.62))


func show_hint(seconds: float) -> void:
	hint_panel.visible = m.phase != Match.Phase.INTRO
	_hint_t = seconds


func _on_score(h: int, a: int) -> void:
	score_home.text = str(h)
	score_away.text = str(a)


func _on_event(kind: String, text: String, team: int) -> void:
	match kind:
		"goal", "own_goal":
			show_banner(Loc.t("hud.goal"), 2.6)
		"halftime":
			show_banner(Loc.t("hud.halftime"), 3.0)
		"fulltime":
			show_banner(Loc.t("hud.fulltime"), 4.0)
		"corner":
			show_banner(Loc.t("hud.corner"), 1.2)
		"goalkick":
			show_banner(Loc.t("hud.goalkick"), 1.0)
		"out":
			show_banner(Loc.t("hud.kickin"), 1.0)
		"foul":
			show_banner(Loc.t("hud.freekick"), 1.4)
	if m.commentary_enabled and text != "":
		ticker.text = text
		ticker_panel.visible = true
		_ticker_t = 3.2


func _on_phase(p: String) -> void:
	if p == "KICKOFF":
		half_label.text = Loc.t("hud.half1") if m.half == 1 else Loc.t("hud.half2")
		if _hint_t > 0.0 and not hint_panel.visible:
			hint_panel.visible = true
	if p == "PAUSED":
		pause_panel.visible = true
	elif pause_panel.visible and p != "PAUSED":
		pause_panel.visible = false


func show_banner(text: String, seconds: float) -> void:
	banner.text = text
	banner_panel.visible = true
	banner_panel.reset_size()
	_banner_t = seconds


func set_paused(on: bool) -> void:
	m.pause(on)
	get_tree().paused = on
	pause_panel.visible = on
	if on:
		var first := pause_panel.get_child(0).get_child(1) as Button
		first.grab_focus()


func _process(delta: float) -> void:
	if _banner_t > 0.0:
		_banner_t -= delta
		if _banner_t <= 0.0:
			banner_panel.visible = false
	if _ticker_t > 0.0:
		_ticker_t -= delta
		if _ticker_t <= 0.0:
			ticker_panel.visible = false
	if _hint_t > 0.0:
		_hint_t -= delta
		if _hint_t <= 0.0:
			hint_panel.visible = false
	# keep the centred panels centred when their size changes
	var vp := root.size
	banner_panel.position = Vector2(roundf((vp.x - banner_panel.size.x) * 0.5), 60)
	ticker_panel.position = Vector2(roundf((vp.x - ticker_panel.size.x) * 0.5), vp.y - ticker_panel.size.y - RADAR_H - 10)
	hint_panel.position = Vector2(roundf((vp.x - hint_panel.size.x) * 0.5), vp.y - hint_panel.size.y - RADAR_H - 12)
	if m.phase == Match.Phase.INTRO:
		hint_panel.visible = false
	pause_panel.position = ((vp - pause_panel.size) * 0.5).round()
	radar.position = Vector2(roundf((vp.x - radar.size.x) * 0.5), vp.y - radar.size.y - 3)
	radar.visible = m.phase != Match.Phase.INTRO and m.phase != Match.Phase.FULLTIME
	radar.queue_redraw()
	_update_plates()
	plate_l.position = Vector2(6, vp.y - plate_l.size.y - 5)
	plate_r.position = Vector2(vp.x - plate_r.size.x - 6, vp.y - plate_r.size.y - 5)
	_update_intro()


func _unhandled_input(event: InputEvent) -> void:
	if m.phase == Match.Phase.INTRO and (event is InputEventKey or event is InputEventJoypadButton or event is InputEventScreenTouch or event is InputEventMouseButton) and event.is_pressed():
		m.intro_skip = true
		return
	if event.is_action_pressed("pause") and m.phase != Match.Phase.FULLTIME:
		set_paused(not pause_panel.visible)
		get_viewport().set_input_as_handled()
