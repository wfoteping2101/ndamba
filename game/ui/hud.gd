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
	m.score_changed.connect(_on_score)
	m.clock_changed.connect(func(t): clock.text = t)
	m.event.connect(_on_event)
	m.phase_changed.connect(_on_phase)
	_on_score(0, 0)
	clock.text = "00:00"
	half_label.text = Loc.t("hud.half1")


func _build_scoreboard() -> void:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.82), UiTheme.SUN, 0, 4, 1))
	panel.position = Vector2(6, 5)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(panel)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	panel.add_child(h)
	var home_col := _team_colour_box(m.teams[0])
	h.add_child(home_col)
	name_home = UiTheme.label(m.teams[0].data.get("short", "HOM"), 8)
	h.add_child(name_home)
	score_home = UiTheme.label("0", 8, true, UiTheme.SUN)
	h.add_child(score_home)
	var dash := UiTheme.label("-", 8, true)
	h.add_child(dash)
	score_away = UiTheme.label("0", 8, true, UiTheme.SUN)
	h.add_child(score_away)
	name_away = UiTheme.label(m.teams[1].data.get("short", "AWY"), 8)
	h.add_child(name_away)
	h.add_child(_team_colour_box(m.teams[1]))
	var sep := Control.new()
	sep.custom_minimum_size = Vector2(6, 1)
	h.add_child(sep)
	clock = UiTheme.label("00:00", 8, true, UiTheme.CREAM)
	h.add_child(clock)
	half_label = UiTheme.label("", 8, false, Color(UiTheme.CREAM, 0.75))
	h.add_child(half_label)


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
		lines = ["%s: A   %s: B (maintenir)   %s: X" % [Loc.t("hud.pass_hint"), Loc.t("hud.shoot_hint"), Loc.t("hud.through_hint")],
				 "%s: RB   %s: Y" % [Loc.t("hud.sprint_hint"), Loc.t("hud.switch_hint")]]
	else:
		lines = ["WASD / fleches   %s: J   %s: K (maintenir)   %s: L" % [Loc.t("hud.pass_hint"), Loc.t("hud.shoot_hint"), Loc.t("hud.through_hint")],
				 "%s: Shift   %s: Espace   Esc: Pause" % [Loc.t("hud.sprint_hint"), Loc.t("hud.switch_hint")]]
	lines.append(Loc.t("hud.tackle_hint"))
	for l in lines:
		var lab := UiTheme.label(l, 8)
		lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(lab)


func show_hint(seconds: float) -> void:
	hint_panel.visible = true
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
	ticker_panel.position = Vector2(roundf((vp.x - ticker_panel.size.x) * 0.5), vp.y - ticker_panel.size.y - 4)
	hint_panel.position = Vector2(roundf((vp.x - hint_panel.size.x) * 0.5), vp.y - hint_panel.size.y - 30)
	pause_panel.position = ((vp - pause_panel.size) * 0.5).round()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause") and m.phase != Match.Phase.FULLTIME:
		set_paused(not pause_panel.visible)
		get_viewport().set_input_as_handled()
