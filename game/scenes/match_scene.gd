extends Node
## Match scene wrapper: wires the HUD, the player indicator, touch controls, the result
## screen, the QA autoplay mode (screenshots + log) and the title-screen attract mode.

@onready var m: Match = $Match
var hud: Hud
var touch: TouchControls
var indicator: PlayerIndicator
var result_panel: PanelContainer
var _qa_t: float = 0.0
var _qa_shots: int = 0
var _qa_log: Array = []
var _qa_last_phase: String = ""
var _fps_samples: Array = []


func _ready() -> void:
	if Game.attract_mode:
		m.time_scale = 1.0
	# soft vignette between the world and the HUD (a little depth, like a broadcast)
	if not Game.settings.get("reduced_motion", false):
		var vl := CanvasLayer.new()
		vl.layer = 5
		add_child(vl)
		var vig := TextureRect.new()
		vig.texture = load("res://assets/fx/vignette.png")
		vig.set_anchors_preset(Control.PRESET_FULL_RECT)
		vig.stretch_mode = TextureRect.STRETCH_SCALE
		vig.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vl.add_child(vig)
	hud = Hud.new()
	hud.name = "Hud"
	add_child(hud)
	hud.setup(m)
	indicator = PlayerIndicator.new()
	indicator.m = m
	m.get_node("World").add_child(indicator)
	if Game.is_mobile() and not m.humans.is_empty():
		touch = TouchControls.new()
		touch.name = "Touch"
		add_child(touch)
		var first = m.humans[m.humans.keys()[0]]
		for k in m.humans.keys():
			if m.humans[k].prefix == "":
				first = m.humans[k]
		touch.setup(m, first)
	m.match_ended.connect(_on_ended)
	m.event.connect(_on_event)
	Sfx.music("", false)
	Sfx.crowd(true)
	if Game.qa_mode:
		m.time_scale = 1.0
		_qa_setup()
	elif not m.humans.is_empty():
		hud.show_hint(7.0)


func _on_event(kind: String, text: String, team: int) -> void:
	if Game.qa_mode:
		_qa_log.append({"t": "%.1f" % _qa_t, "clock": m.clock_text(), "kind": kind, "team": team, "text": text})


func _process(delta: float) -> void:
	if Game.qa_mode:
		_qa_tick(delta)
	if Game.attract_mode and Input.is_anything_pressed():
		pass


# ---------------------------------------------------------------------------
# Result screen
# ---------------------------------------------------------------------------

func _on_ended(result: Dictionary) -> void:
	if Game.qa_mode:
		_qa_finish(result)
		return
	await get_tree().create_timer(2.5).timeout
	_show_result(result)


func _show_result(result: Dictionary) -> void:
	result_panel = PanelContainer.new()
	result_panel.theme = UiTheme.theme()
	result_panel.set_anchors_preset(Control.PRESET_CENTER)
	hud.root.add_child(result_panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	result_panel.add_child(v)
	var home := Content.team(result["home"])
	var away := Content.team(result["away"])
	var verdict := ""
	var human_side: int = 0 if m.config["human_home"] else (1 if m.config["human_away"] else -1)
	if human_side >= 0:
		var hg: int = result["score"][human_side]
		var og: int = result["score"][1 - human_side]
		verdict = Loc.t("result.win") if hg > og else (Loc.t("result.lose") if hg < og else Loc.t("result.draw"))
	var title := UiTheme.label(Loc.t("result.title") + ("   " + verdict if verdict != "" else ""), 10, true, UiTheme.SUN)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(title)
	var score := UiTheme.label("%s  %d - %d  %s" % [home.get("short", ""), result["score"][0], result["score"][1], away.get("short", "")], 14, true, UiTheme.CREAM)
	score.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(score)
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 14)
	v.add_child(grid)
	var s0: Dictionary = result["stats"][0]
	var s1: Dictionary = result["stats"][1]
	var rows := [
		["result.possession", "%d%%" % int(result["possession"][0]), "%d%%" % int(result["possession"][1])],
		["result.shots", str(s0["shots"]), str(s1["shots"])],
		["result.on_target", str(s0["on_target"]), str(s1["on_target"])],
		["result.passes", "%d/%d" % [s0["pass_ok"], s0["passes"]], "%d/%d" % [s1["pass_ok"], s1["passes"]]],
		["result.tackles", str(s0["tackles"]), str(s1["tackles"])],
		["result.corners", str(s0["corners"]), str(s1["corners"])],
		["result.fouls", str(s0["fouls"]), str(s1["fouls"])],
	]
	for r in rows:
		var a := UiTheme.label(r[1], 8)
		a.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		a.custom_minimum_size.x = 40
		grid.add_child(a)
		var lab := UiTheme.label(Loc.t(r[0]), 8, false, Color(UiTheme.CREAM, 0.7))
		lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lab.custom_minimum_size.x = 110
		grid.add_child(lab)
		var b := UiTheme.label(r[2], 8)
		b.custom_minimum_size.x = 40
		grid.add_child(b)
	if not result["goals"].is_empty():
		var sc := UiTheme.label(Loc.t("result.scorers"), 8, false, UiTheme.SUN)
		v.add_child(sc)
		for g in result["goals"]:
			var who: String = g["scorer"] + (" (csc)" if g["own"] else "")
			var line := UiTheme.label("%s  %s  %s" % [g["clock"].substr(0, 2) + "'", (home if g["team"] == 0 else away).get("short", ""), who], 8)
			v.add_child(line)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(h)
	var again: Button
	var return_to: String = m.config.get("return_to", "")
	if return_to != "":
		# campaign match: continue to the campaign screen (through the shoot-out when a winner is needed)
		var draw: bool = result["score"][0] == result["score"][1]
		var needs_winner: bool = Game.pending.get("needs_winner", false)
		again = UiTheme.button(Loc.t("pens.go") if draw and needs_winner else Loc.t("result.continue"), 150)
		again.pressed.connect(func():
			if draw and needs_winner:
				get_tree().change_scene_to_file("res://scenes/shootout.tscn")
			else:
				get_tree().change_scene_to_file(return_to))
		h.add_child(again)
	else:
		again = UiTheme.button(Loc.t("result.again"), 110)
		again.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/match.tscn"))
		h.add_child(again)
		var menu := UiTheme.button(Loc.t("result.menu"), 110)
		menu.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/title.tscn"))
		h.add_child(menu)
	await get_tree().process_frame
	result_panel.position = ((hud.root.size - result_panel.size) * 0.5).round()
	again.grab_focus()


# ---------------------------------------------------------------------------
# QA autoplay: the computer plays itself, screenshots and a log are written to Game.qa_dir
# ---------------------------------------------------------------------------

func _qa_setup() -> void:
	DirAccess.make_dir_recursive_absolute(Game.qa_dir)
	_qa_log.append({"t": "0.0", "kind": "start", "text": "%s vs %s at %s, difficulty %d, half %.1f min" % [m.config["home"], m.config["away"], m.config["stadium"], m.config["difficulty"], m.config["half_minutes"]]})


func _qa_tick(delta: float) -> void:
	_qa_t += delta
	_fps_samples.append(Engine.get_frames_per_second())
	var phase_name: String = Match.Phase.keys()[m.phase]
	if phase_name != _qa_last_phase:
		_qa_last_phase = phase_name
	# intro fly-over shots when asked (--intro): at 2 s and 6.5 s
	if Game.qa_intro and m.phase == Match.Phase.INTRO:
		if m.phase_t > 2.0 and not has_meta("intro_a"):
			set_meta("intro_a", true)
			_qa_screenshot("intro_a")
		if m.phase_t > 6.5 and not has_meta("intro_b"):
			set_meta("intro_b", true)
			_qa_screenshot("intro_b")
	# a screenshot every 12 seconds of match, plus one on goals (handled through events)
	if int(_qa_t / 12.0) > _qa_shots and _qa_shots < 40:
		_qa_shots += 1
		_qa_screenshot("shot_%02d" % _qa_shots)
	if _qa_t > 60.0 * float(m.config["half_minutes"]) * 2.0 + 60.0 and m.phase != Match.Phase.FULLTIME:
		_qa_log.append({"t": "%.1f" % _qa_t, "kind": "error", "text": "match did not finish in time (phase %s)" % phase_name})
		_qa_finish({"score": [m.teams[0].score, m.teams[1].score], "error": "timeout"})


func _qa_screenshot(name: String) -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	if img != null:
		img.save_png(Game.qa_dir.path_join(name + ".png"))


func _qa_finish(result: Dictionary) -> void:
	await _qa_screenshot("final")
	var fps_avg := 0.0
	if not _fps_samples.is_empty():
		for f in _fps_samples:
			fps_avg += f
		fps_avg /= _fps_samples.size()
	var out := {"result": result, "events": _qa_log, "fps_avg": fps_avg, "frames": _fps_samples.size(), "seconds": _qa_t}
	var f := FileAccess.open(Game.qa_dir.path_join("qa.json"), FileAccess.WRITE)
	f.store_string(JSON.stringify(out, "  "))
	f.close()
	print("QA done: score %s, fps %.1f, events %d" % [str(result.get("score")), fps_avg, _qa_log.size()])
	get_tree().quit(0 if not result.has("error") else 2)
