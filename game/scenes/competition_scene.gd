extends Control
## League ("Ligue des Quartiers") and cup ("Coupe des Quartiers") campaign screens.
## The scene's `kind` decides which: set from the scene file name (league.tscn / cup.tscn).

var kind: String = "league"
var comp: Competition
var teams: Array = []
var team_i := 2
var format_i := 0
var half_i := 1
var diff_i := 2
var labels: Dictionary = {}
var root: VBoxContainer
var panel: PanelContainer
var last_summary: Dictionary = {}
const FORMATS := ["11v11", "7v7", "5v5"]
const HALVES := [2.0, 3.0, 4.0, 6.0]


func _ready() -> void:
	kind = "cup" if scene_file_path.ends_with("cup.tscn") else "league"
	theme = UiTheme.theme()
	comp = Competition.new(kind)
	for id in Competition.all_teams():
		teams.append(Content.team(id))
	var bg := ColorRect.new()
	bg.color = UiTheme.NIGHT
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var ground := TextureRect.new()
	ground.texture = load("res://assets/stadium/ground_full_grass.png" if kind == "league" else "res://assets/stadium/ground_terre.png")
	ground.set_anchors_preset(Control.PRESET_FULL_RECT)
	ground.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	ground.modulate = Color(0.45, 0.42, 0.4)
	add_child(ground)
	panel = PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	add_child(panel)
	root = VBoxContainer.new()
	root.add_theme_constant_override("separation", 4)
	panel.add_child(root)
	# returning from a match?
	if comp.load_game():
		_consume_result()
		_show_hub()
	else:
		_show_start()


func _clear() -> void:
	for c in root.get_children():
		c.queue_free()
	labels = {}


func _center(focus: Control = null) -> void:
	await get_tree().process_frame
	panel.position = ((size - panel.size) * 0.5).round()
	if focus != null:
		focus.grab_focus()


func _title(text: String) -> void:
	var l := UiTheme.label(text, 12, true, UiTheme.SUN)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(l)


# ---------------------------------------------------------------- start

func _show_start() -> void:
	_clear()
	_title(Loc.t("menu.league" if kind == "league" else "menu.cup"))
	var intro := UiTheme.label(Loc.t(kind + ".intro"), 8, false, Color(UiTheme.CREAM, 0.85))
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.custom_minimum_size.x = 330
	root.add_child(intro)
	_row("setup.you", "team")
	_row("setup.format", "format")
	_row("setup.half", "half")
	_row("setup.difficulty", "diff")
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	root.add_child(h)
	var back := UiTheme.button(Loc.t("setup.back"), 100)
	back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/title.tscn"))
	h.add_child(back)
	var go := UiTheme.button(Loc.t("campaign.start"), 150)
	go.pressed.connect(_start_new)
	h.add_child(go)
	_refresh_start()
	_center(go)


func _row(key: String, id: String) -> void:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	var l := UiTheme.label(Loc.t(key), 8, false, Color(UiTheme.CREAM, 0.8))
	l.custom_minimum_size.x = 80
	h.add_child(l)
	var left := UiTheme.button("<", 18)
	left.pressed.connect(func(): _change(id, -1))
	h.add_child(left)
	var val := UiTheme.label("", 8, false, UiTheme.CREAM)
	val.custom_minimum_size.x = 200
	val.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	h.add_child(val)
	var right := UiTheme.button(">", 18)
	right.pressed.connect(func(): _change(id, 1))
	h.add_child(right)
	labels[id] = val
	root.add_child(h)


func _change(id: String, d: int) -> void:
	Sfx.play("ui_move", Vector2.ZERO, -6.0)
	match id:
		"team":
			team_i = posmod(team_i + d, teams.size())
		"format":
			format_i = posmod(format_i + d, FORMATS.size())
		"half":
			half_i = posmod(half_i + d, HALVES.size())
		"diff":
			diff_i = posmod(diff_i + d, 5)
	_refresh_start()


func _refresh_start() -> void:
	labels["team"].text = "%s (%s)" % [teams[team_i]["name"], teams[team_i]["neighborhood"]]
	labels["format"].text = FORMATS[format_i]
	labels["half"].text = Loc.t("setup.minutes", {"n": int(HALVES[half_i])})
	labels["diff"].text = Loc.t(Game.difficulty_name(diff_i))


func _start_new() -> void:
	Sfx.play("ui_select")
	comp.new_game(teams[team_i]["id"], {"format": FORMATS[format_i], "half_minutes": HALVES[half_i], "difficulty": diff_i})
	comp.save()
	_show_hub()


# ---------------------------------------------------------------- hub

func _consume_result() -> void:
	var p: Dictionary = Game.pending
	if p.is_empty() or p.get("kind", "") != kind:
		return
	var r: Dictionary = Game.last_result
	if r.is_empty() or r.get("home", "") != p.get("home", "") or r.get("away", "") != p.get("away", ""):
		return
	last_summary = comp.apply_result(r["home"], r["away"], r["score"], r.get("pens", []))
	Game.pending = {}
	comp.save()


func _show_hub() -> void:
	_clear()
	_title(Loc.t("menu.league" if kind == "league" else "menu.cup"))
	var our := Content.team(comp.state["team"])
	var sub := UiTheme.label("%s  ·  %s" % [our.get("name", ""), comp.state["format"]], 8, false, Color(UiTheme.CREAM, 0.8))
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(sub)
	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 14)
	root.add_child(cols)
	if kind == "league":
		cols.add_child(_table_box())
	else:
		cols.add_child(_bracket_box())
	cols.add_child(_right_box())
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	root.add_child(h)
	var f := comp.next_fixture()
	var play: Button = null
	if not f.is_empty():
		play = UiTheme.button(Loc.t("campaign.play"), 150)
		play.pressed.connect(func(): _play(f))
		h.add_child(play)
	else:
		var again := UiTheme.button(Loc.t("campaign.new"), 150)
		again.pressed.connect(func(): Game.save.remove(kind); _show_start())
		h.add_child(again)
		play = again
	var quit := UiTheme.button(Loc.t("campaign.quit"), 110)
	quit.pressed.connect(func(): comp.save(); get_tree().change_scene_to_file("res://scenes/title.tscn"))
	h.add_child(quit)
	_center(play)


func _table_box() -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 1)
	var g := GridContainer.new()
	g.columns = 6
	g.add_theme_constant_override("h_separation", 6)
	g.add_theme_constant_override("v_separation", 1)
	for hname in ["#", "", "J", "G", "Diff", "Pts"]:
		g.add_child(UiTheme.label(hname, 8, false, Color(UiTheme.CREAM, 0.6)))
	var rows := comp.standings()
	for i in range(rows.size()):
		var r: Dictionary = rows[i]
		var ours: bool = r["id"] == comp.state["team"]
		var col := UiTheme.SUN if ours else UiTheme.CREAM
		g.add_child(UiTheme.label(str(i + 1), 8, false, col))
		g.add_child(UiTheme.label(Content.team(r["id"]).get("short", r["id"]), 8, ours, col))
		g.add_child(UiTheme.label(str(r["p"]), 8, false, col))
		g.add_child(UiTheme.label(str(r["w"]), 8, false, col))
		g.add_child(UiTheme.label("%+d" % int(r["gd"]), 8, false, col))
		g.add_child(UiTheme.label(str(r["pts"]), 8, true, col))
	v.add_child(g)
	return v


func _bracket_box() -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	for rd in comp.state["rounds"]:
		v.add_child(UiTheme.label(Loc.t("cup." + rd["name"]), 8, true, UiTheme.SUN))
		for t in rd["ties"]:
			var hs: String = Content.team(t["home"]).get("short", "")
			var as_: String = Content.team(t["away"]).get("short", "")
			var txt := "%s - %s" % [hs, as_]
			if t["played"]:
				txt = "%s %d - %d %s" % [hs, t["score"][0], t["score"][1], as_]
				if t["pens"].size() == 2:
					txt += "  (%d-%d tab)" % [t["pens"][0], t["pens"][1]]
			var ours: bool = t["home"] == comp.state["team"] or t["away"] == comp.state["team"]
			v.add_child(UiTheme.label(txt, 8, false, UiTheme.SUN if ours else UiTheme.CREAM))
	return v


func _right_box() -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	v.custom_minimum_size.x = 190
	var f := comp.next_fixture()
	if comp.state.get("done", false):
		var champ: String = comp.state.get("champion", "")
		var won: bool = champ == comp.state["team"]
		var l := UiTheme.label(Loc.t("campaign.champion", {"team": Content.team(champ).get("name", champ)}), 8, true, UiTheme.SUN if won else UiTheme.CREAM)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size.x = 190
		v.add_child(l)
		if kind == "league":
			v.add_child(UiTheme.label(Loc.t("campaign.finished_pos", {"n": comp.our_position()}), 8))
		elif not won:
			v.add_child(UiTheme.label(Loc.t("campaign.eliminated"), 8, false, UiTheme.CLAY))
		if won:
			v.add_child(UiTheme.label(Loc.t("campaign.you_won"), 8, true, UiTheme.SUN))
	elif not f.is_empty():
		var head := Loc.t("league.matchday", {"n": comp.state["week"]}) if kind == "league" else Loc.t("cup." + comp.round_name())
		v.add_child(UiTheme.label(head, 8, true, UiTheme.SUN))
		var hn: String = Content.team(f["home"]).get("name", "")
		var an: String = Content.team(f["away"]).get("name", "")
		var fx := UiTheme.label("%s\n%s\n%s" % [hn, Loc.t("intro.vs"), an], 8)
		fx.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		fx.custom_minimum_size.x = 190
		v.add_child(fx)
		var st := Content.stadium(Competition.stadium_for(f["home"], comp.state["format"]))
		v.add_child(UiTheme.label(Loc.field(st, "name"), 8, false, Color(UiTheme.CREAM, 0.7)))
	if not last_summary.is_empty():
		v.add_child(UiTheme.label(Loc.t("campaign.last_results"), 8, false, Color(UiTheme.CREAM, 0.6)))
		var pl: Dictionary = last_summary["played"]
		var line := "%s %d - %d %s" % [Content.team(pl["home"]).get("short", ""), pl["score"][0], pl["score"][1], Content.team(pl["away"]).get("short", "")]
		if pl["pens"].size() == 2:
			line += " (%d-%d)" % [pl["pens"][0], pl["pens"][1]]
		v.add_child(UiTheme.label(line, 8, true, UiTheme.SUN))
		for o in last_summary["others"]:
			var ol := "%s %d - %d %s" % [Content.team(o["home"]).get("short", ""), o["score"][0], o["score"][1], Content.team(o["away"]).get("short", "")]
			v.add_child(UiTheme.label(ol, 8, false, Color(UiTheme.CREAM, 0.8)))
	return v


func _play(f: Dictionary) -> void:
	Sfx.play("ui_select")
	comp.configure_match(f, scene_file_path)
	comp.save()
	get_tree().change_scene_to_file("res://scenes/match.tscn")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		if not comp.state.is_empty():
			comp.save()
		get_tree().change_scene_to_file("res://scenes/title.tscn")
