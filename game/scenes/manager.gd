extends Control
## Manager campaign UI (the Njangi career): one scene, several screens switched by _show().
## Screens: start (continue / new career), pick (choose a Ligue 3 club), hub (the weekly screen),
## report (after a week), squad, table, market. Every screen is rebuilt from the Career state
## each time it is shown, so there is no stale widget to keep in sync. Everything is keyboard
## and gamepad navigable: buttons take focus, ui_cancel goes back one level.
##
## Debug: `--screenshot <path> [--screen hub|report]` renders one screen and quits.

const SCREENS := ["start", "pick", "hub", "report", "squad", "table", "market"]
const BAR_W := 110
const EVENT_LINES := 7
const SEED_FOR_SHOTS := 7

var career: Career
var screen := ""
var report: Dictionary = {}
var root: Control
var l3_clubs: Array = []
var club_i := 0
var selected_pid := ""
var _first_focus: Control = null
var _plan_rows: Array = []        # [{title: Label, sub: Label}] for the 4 hub plan rows
var _player_panel: VBoxContainer = null
var _status: Label = null
var _shot_path := ""
var _shot_screen := "hub"


func _ready() -> void:
	theme = UiTheme.theme()
	career = Career.new()
	for id in career.clubs.keys():
		if int(career.clubs[id].get("division", 0)) == 3:
			l3_clubs.append(id)
	l3_clubs.sort()
	var bg := ColorRect.new()
	bg.color = UiTheme.NIGHT
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var ground := TextureRect.new()
	ground.texture = load("res://assets/stadium/ground_terre.png")
	ground.set_anchors_preset(Control.PRESET_FULL_RECT)
	ground.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	ground.modulate = Color(0.42, 0.38, 0.36)
	add_child(ground)
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)
	_parse_args()
	if _shot_path != "":
		_screenshot_flow()
		return
	_show("start")


func _parse_args() -> void:
	var args := OS.get_cmdline_user_args()
	for i in range(args.size()):
		if args[i] == "--screenshot" and i + 1 < args.size():
			_shot_path = args[i + 1]
		elif args[i] == "--screen" and i + 1 < args.size():
			_shot_screen = args[i + 1]


func _screenshot_flow() -> void:
	new_career(l3_clubs[0] if not l3_clubs.is_empty() else "lionceaux_bonamoussadi", SEED_FOR_SHOTS)
	if _shot_screen == "report":
		play_week()
	elif _shot_screen == "season":
		while not report.has("season_end") and int(career.state["season"]) == 1:
			play_week()
	elif _shot_screen != "hub":
		_show(_shot_screen)
	for _i in range(6):
		await get_tree().process_frame
	var img := get_viewport().get_texture().get_image()
	img.save_png(_shot_path)
	print("screenshot saved: " + _shot_path)
	get_tree().quit(0)


# ---------------------------------------------------------------- public actions (also used by tests)

func new_career(club_id: String, seed_value: int = -1) -> void:
	career = Career.new()
	career.new_game(club_id, seed_value)
	report = {}
	selected_pid = ""
	_show("hub")


func continue_career() -> bool:
	var c := Career.new()
	if not c.load_game():
		return false
	career = c
	report = {}
	_show("hub")
	return true


func play_week() -> void:
	report = career.advance()
	_show("report")


func cycle_drill(md: int, dir: int) -> void:
	var pool: Array = career.drills_for_session(md)
	if pool.is_empty():
		return
	var plan: Array = career.state["plan"].duplicate()
	while plan.size() < 4:
		plan.append("")
	var slot := 4 - md
	var cur: int = pool.find(plan[slot])
	cur = posmod(cur + dir, pool.size())
	plan[slot] = pool[cur]
	career.set_plan(plan)
	_refresh_plan_rows()


func auto_plan() -> void:
	career.auto_plan()
	_refresh_plan_rows()


func save_career() -> void:
	career.save()


func save_and_quit() -> void:
	save_career()
	get_tree().change_scene_to_file("res://scenes/title.tscn")


func show_screen(name: String) -> void:
	_show(name)


# ---------------------------------------------------------------- screen switching

func _show(name: String) -> void:
	for c in root.get_children():
		root.remove_child(c)
		c.queue_free()
	_first_focus = null
	_plan_rows = []
	_player_panel = null
	_status = null
	screen = name
	match name:
		"start":
			_build_start()
		"pick":
			_build_pick()
		"hub":
			_build_hub()
		"report":
			_build_report()
		"squad":
			_build_squad()
		"table":
			_build_table()
		"market":
			_build_market()
	_focus_first()


func _focus_first() -> void:
	await get_tree().process_frame
	if is_instance_valid(_first_focus) and _first_focus.is_inside_tree():
		_first_focus.grab_focus()


func _unhandled_input(event: InputEvent) -> void:
	if not event.is_action_pressed("ui_cancel"):
		return
	match screen:
		"start":
			get_tree().change_scene_to_file("res://scenes/title.tscn")
		"pick":
			_show("start")
		"hub":
			save_and_quit()
		"report":
			_leave_report()
		"squad", "table", "market":
			Sfx.play("ui_move", Vector2.ZERO, -6.0)
			_show("hub")


func _leave_report() -> void:
	Sfx.play("ui_select")
	_show("hub")


# ---------------------------------------------------------------- widget helpers

func _frame(title: String, right: String = "") -> VBoxContainer:
	var m := MarginContainer.new()
	m.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["margin_left", "margin_right", "margin_top", "margin_bottom"]:
		m.add_theme_constant_override(side, 8)
	root.add_child(m)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	m.add_child(v)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	v.add_child(h)
	var t := UiTheme.label(title, 10, true, UiTheme.SUN)
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(t)
	if right != "":
		var r := UiTheme.label(right, 8, false, UiTheme.CREAM)
		r.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		h.add_child(r)
	return v


func _panel(parent: Control, min_w: int = 0, expand: bool = true) -> VBoxContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.88), UiTheme.SUN, 0, 6, 1))
	if min_w > 0:
		p.custom_minimum_size.x = min_w
	if expand:
		p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	parent.add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	p.add_child(v)
	return v


func _lbl(parent: Control, text: String, color: Color = UiTheme.CREAM, size: int = 8, big: bool = false) -> Label:
	var l := UiTheme.label(text, size, big, color)
	l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	parent.add_child(l)
	return l


func _head(parent: Control, text: String) -> Label:
	return _lbl(parent, text, UiTheme.SUN)


func _wrap(parent: Control, text: String, width: int, color: Color = UiTheme.CREAM) -> Label:
	var l := UiTheme.label(text, 8, false, color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = width
	parent.add_child(l)
	return l


func _btn(parent: Control, text: String, cb: Callable, min_w: int = 120, select_sound: bool = true) -> Button:
	var b := UiTheme.button(text, min_w)
	b.pressed.connect(func():
		if select_sound:
			Sfx.play("ui_select")
		else:
			Sfx.play("ui_move", Vector2.ZERO, -6.0)
		cb.call())
	b.focus_entered.connect(func(): Sfx.play("ui_move", Vector2.ZERO, -8.0))
	parent.add_child(b)
	if _first_focus == null:
		_first_focus = b
	return b


func _spacer(parent: Control, h: int = 4) -> void:
	var c := Control.new()
	c.custom_minimum_size.y = h
	parent.add_child(c)


## A labelled horizontal bar: name (left), bar (fill proportional to value / max), value (right).
func _bar(parent: Control, name: String, value: float, max_value: float, color: Color, name_w: int = 70, bar_w: int = BAR_W) -> void:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 4)
	parent.add_child(h)
	var n := UiTheme.label(name, 8, false, Color(UiTheme.CREAM, 0.85))
	n.custom_minimum_size.x = name_w
	n.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	h.add_child(n)
	var holder := Control.new()
	holder.custom_minimum_size = Vector2(bar_w, 10)
	h.add_child(holder)
	var back := ColorRect.new()
	back.color = Color(UiTheme.CREAM, 0.18)
	back.position = Vector2(0, 2)
	back.size = Vector2(bar_w, 6)
	holder.add_child(back)
	var fill := ColorRect.new()
	fill.color = color
	fill.position = Vector2(0, 2)
	fill.size = Vector2(roundf(bar_w * clampf(value / maxf(0.001, max_value), 0.0, 1.0)), 6)
	holder.add_child(fill)
	var v := UiTheme.label(("%.1f" % value) if max_value <= 20.0 else str(int(roundf(value))), 8, false, UiTheme.CREAM)
	v.custom_minimum_size.x = 26
	v.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	h.add_child(v)


func _division_name(div: int) -> String:
	if div == 0:
		return Loc.t("mgr.division.0")
	return Loc.t("mgr.division", {"n": div})


func _round_name(r: String) -> String:
	return Loc.t("mgr.round." + r)


func _intensity_name(i: String) -> String:
	return Loc.t("mgr.intensity." + i)


func _intentions_text(d: Dictionary) -> String:
	var parts := []
	for it in d.get("intentions", []):
		parts.append(Loc.t("mgr.int." + str(it)))
	return ", ".join(parts)


func _score_line(m: Dictionary) -> String:
	var sc: Array = m["score"]
	var line := "%s %d - %d %s" % [career.club_short(m["home"]), int(sc[0]), int(sc[1]), career.club_short(m["away"])]
	return "%s (%s)" % [line, Loc.t("mgr.home" if int(m["side"]) == 0 else "mgr.away")]


func _overall(p: Dictionary) -> int:
	return int(roundf(ManagerSim.overall(p)))


func _set_status(text: String, color: Color = UiTheme.SUN) -> void:
	if _status != null:
		_status.text = text
		_status.add_theme_color_override("font_color", color)


# ---------------------------------------------------------------- start / pick

func _center_panel() -> VBoxContainer:
	var c := CenterContainer.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(c)
	var p := PanelContainer.new()
	c.add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 5)
	p.add_child(v)
	return v


func _build_start() -> void:
	var v := _center_panel()
	var t := UiTheme.label(Loc.t("mgr.title"), 12, true, UiTheme.SUN)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	var tag := _wrap(v, Loc.t("mgr.tagline"), 300, Color(UiTheme.CREAM, 0.8))
	tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_spacer(v, 4)
	if Career.has_save():
		_btn(v, Loc.t("mgr.continue"), func():
			if not continue_career():
				_set_status("?", UiTheme.CLAY), 300)
	_btn(v, Loc.t("mgr.new_career"), func(): _show("pick"), 300)
	_btn(v, Loc.t("mgr.quit_title"), func(): get_tree().change_scene_to_file("res://scenes/title.tscn"), 300)


func _build_pick() -> void:
	var v := _center_panel()
	var t := UiTheme.label(Loc.t("mgr.pick_club"), 10, true, UiTheme.SUN)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	_spacer(v, 2)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(h)
	var name_l := UiTheme.label("", 8, false, UiTheme.CREAM)
	name_l.custom_minimum_size.x = 230
	name_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var city_l := UiTheme.label("", 8, false, Color(UiTheme.CREAM, 0.8))
	city_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var str_l := UiTheme.label("", 8, false, Color(UiTheme.CREAM, 0.8))
	str_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var refresh := func():
		var c: Dictionary = career.clubs[l3_clubs[club_i]]
		name_l.text = "%s (%s)" % [c["name"], c["short"]]
		city_l.text = Loc.t("mgr.city", {"city": c["city"]})
		str_l.text = Loc.t("mgr.strength", {"n": int(c["strength"])})
	var left := _btn(h, "<", func():
		club_i = posmod(club_i - 1, l3_clubs.size())
		refresh.call(), 18, false)
	h.add_child(name_l)
	_btn(h, ">", func():
		club_i = posmod(club_i + 1, l3_clubs.size())
		refresh.call(), 18, false)
	v.add_child(city_l)
	v.add_child(str_l)
	_spacer(v, 2)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(row)
	_btn(row, Loc.t("mgr.back"), func(): _show("start"), 110)
	var start := _btn(row, Loc.t("mgr.start"), func(): new_career(l3_clubs[club_i]), 150)
	_first_focus = start
	left.focus_neighbor_left = left.get_path()
	refresh.call()


# ---------------------------------------------------------------- hub

func _build_hub() -> void:
	var st: Dictionary = career.state
	var div: int = int(st["division"])
	var v := _frame(career.club_name(st["club"]), "%s  ·  %s  ·  %s" % [
		Loc.t("mgr.season", {"n": int(st["season"])}), _division_name(div),
		Loc.t("mgr.week", {"w": int(st["week"]), "t": career.season_weeks()})])
	var info := _lbl(v, "%s  ·  %s  ·  %s  ·  %s" % [
		Loc.t("mgr.budget", {"n": int(st["budget"])}), Loc.t("mgr.facilities", {"n": int(st["facilities"])}),
		Loc.t("mgr.squad_strength", {"n": int(roundf(career.squad_strength()))}),
		Loc.t("mgr.position", {"p": career.our_position()})], Color(UiTheme.CREAM, 0.85))
	info.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(h)
	# left: the plan
	var left := _panel(h, 350, false)
	_head(left, Loc.t("mgr.plan"))
	var plan: Array = st["plan"]
	for md in [4, 3, 2, 1]:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		left.add_child(row)
		var tag := UiTheme.label(Loc.t("mgr.md", {"n": md}), 8, false, UiTheme.SUN)
		tag.custom_minimum_size.x = 30
		row.add_child(tag)
		_btn(row, "<", func(): cycle_drill(md, -1), 18, false)
		var col := VBoxContainer.new()
		col.add_theme_constant_override("separation", 0)
		col.custom_minimum_size.x = 248
		row.add_child(col)
		var title := UiTheme.label("", 8, false, UiTheme.CREAM)
		title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		title.custom_minimum_size.x = 248
		col.add_child(title)
		var sub := UiTheme.label("", 8, false, Color(UiTheme.CREAM, 0.65))
		sub.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		sub.custom_minimum_size.x = 248
		col.add_child(sub)
		_btn(row, ">", func(): cycle_drill(md, 1), 18, false)
		_plan_rows.append({"title": title, "sub": sub})
	_spacer(left, 2)
	_btn(left, Loc.t("mgr.auto_plan"), auto_plan, 200)
	_spacer(left, 4)
	_mini_table(left)
	# right: fixture, tip, actions
	var right := _panel(h, 0, true)
	_head(right, Loc.t("mgr.next_fixture"))
	var fx: Dictionary = career.our_fixture(int(st["week"]))
	if fx.is_empty():
		_lbl(right, Loc.t("mgr.no_fixture"))
	else:
		var home: bool = fx["home"] == st["club"]
		var opp: String = fx["away"] if home else fx["home"]
		_lbl(right, Loc.t("mgr.vs_home" if home else "mgr.vs_away", {"opp": career.club_name(opp)}))
	if career.cup_tie_this_week():
		var r: int = int(st["cup"]["round"])
		_lbl(right, Loc.t("mgr.cup_tie", {"round": _round_name(Career.CUP_ROUNDS[r])}), UiTheme.SUN)
	var last: Dictionary = st.get("last_report", {})
	var lm: Dictionary = last.get("match", {})
	if lm.has("score") and int(last.get("season", 0)) == int(st["season"]):
		_lbl(right, "%s : %s" % [Loc.t("mgr.last_match"), _score_line(lm)], Color(UiTheme.CREAM, 0.8))
		_lbl(right, Loc.t("mgr.season_indice", {"n": "%.1f" % career.season_indice_average()}), Color(UiTheme.CREAM, 0.8))
	_spacer(right, 2)
	var weakest: Array = career.weakest_subs()
	if not weakest.is_empty():
		var sub: String = weakest[0]
		var drills: Array = Njangi.DRILLS_FOR.get(sub, [])
		_wrap(right, Loc.t("mgr.tip", {
			"sub": Loc.t("mgr.sub." + sub).to_lower(), "int": Loc.t("mgr.int." + Njangi.SUB_INTENTION[sub]),
			"drills": ", ".join(drills)}), 220, Color(UiTheme.CREAM, 0.8))
	_spacer(right, 2)
	var play := _btn(right, Loc.t("mgr.play_week"), play_week, 220)
	_first_focus = play
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 4)
	grid.add_theme_constant_override("v_separation", 4)
	right.add_child(grid)
	_btn(grid, Loc.t("mgr.squad"), func(): _show("squad"), 108)
	_btn(grid, Loc.t("mgr.table"), func(): _show("table"), 108)
	_btn(grid, Loc.t("mgr.market"), func(): _show("market"), 108)
	_btn(grid, Loc.t("mgr.save_quit"), save_and_quit, 108)
	_refresh_plan_rows()


## The top of the table plus our row, for the hub.
func _mini_table(parent: Control) -> void:
	_head(parent, Loc.t("mgr.table"))
	var rows: Array = career.standings()
	var ours: int = career.our_position() - 1
	var shown := []
	for i in range(mini(5, rows.size())):
		shown.append(i)
	if ours >= 5:
		shown.append(ours)
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 1)
	parent.add_child(grid)
	var widths := [20, 190, 60, 40]
	for i in shown:
		var r: Dictionary = rows[i]
		var color := UiTheme.SUN if i == ours else Color(UiTheme.CREAM, 0.8)
		var cells := [str(i + 1), career.club_name(r["id"]), "%d-%d-%d" % [int(r["w"]), int(r["d"]), int(r["l"])], "%d pts" % int(r["pts"])]
		for j in range(cells.size()):
			var c := UiTheme.label(cells[j], 8, false, color)
			c.custom_minimum_size.x = widths[j]
			c.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
			c.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT if j != 1 else HORIZONTAL_ALIGNMENT_LEFT
			grid.add_child(c)


func _refresh_plan_rows() -> void:
	if _plan_rows.is_empty():
		return
	var plan: Array = career.state["plan"]
	for i in range(mini(4, _plan_rows.size())):
		var did: String = str(plan[i]) if i < plan.size() else ""
		var row: Dictionary = _plan_rows[i]
		if career.drills.has(did):
			var d: Dictionary = career.drills[did]
			row["title"].text = "%s  %s" % [did, Loc.field(d, "title")]
			row["sub"].text = "%s · %s" % [_intensity_name(str(d["intensity"])), _intentions_text(d)]
		else:
			row["title"].text = "-"
			row["sub"].text = ""


# ---------------------------------------------------------------- report

func _build_report() -> void:
	var rep: Dictionary = report
	if rep.is_empty():
		rep = career.state.get("last_report", {})
	var m: Dictionary = rep.get("match", {})
	var right_text := _score_line(m) if m.has("score") else ""
	var v := _frame(Loc.t("mgr.report", {"w": int(rep.get("week", 0))}), right_text)
	var season_end: Dictionary = rep.get("season_end", {})
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(h)
	# left: training + match
	var left := _panel(h, 330, false)
	_head(left, Loc.t("mgr.training"))
	var tr: Array = rep.get("training", [])
	var md := 4
	for t in tr:
		var d: Dictionary = t
		_lbl(left, "%s  %s (%s)" % [Loc.t("mgr.md", {"n": md}), Loc.field(d, "title"), _intensity_name(str(d.get("intensity", "")))])
		md -= 1
	var gains: Dictionary = rep.get("gains", {})
	var parts := []
	var keys: Array = gains.keys()
	keys.sort_custom(func(a, b): return float(gains[a]) > float(gains[b]))
	for k in keys:
		if float(gains[k]) > 0.05:
			parts.append("%+.1f %s" % [float(gains[k]), Loc.t("mgr.skill." + str(k)).to_lower()])
	_wrap(left, "%s : %s" % [Loc.t("mgr.gains"), ", ".join(parts) if not parts.is_empty() else Loc.t("mgr.no_gains")], 310, Color(UiTheme.CREAM, 0.8))
	_spacer(left, 2)
	_head(left, Loc.t("mgr.match"))
	if m.has("score"):
		_lbl(left, _score_line(m))
		var max_lines := 3 if not season_end.is_empty() else EVENT_LINES
		for line in _event_lines(m, max_lines):
			_lbl(left, line["text"], line["color"])
	else:
		_lbl(left, Loc.t("mgr.no_fixture"))
	# right: the Indice panel
	var right := _panel(h, 0, true)
	_head(right, Loc.t("mgr.indice"))
	if m.has("indice"):
		var ind: Dictionary = m["indice"]
		var total: float = float(ind.get("total", 0.0))
		_lbl(right, "%.1f  ·  %s" % [total, Loc.t("mgr.band.%d" % Njangi.band(total))], UiTheme.SUN, 10, true)
		var sub: Dictionary = ind.get("sub", {})
		for k in Njangi.SUBS:
			_bar(right, Loc.t("mgr.sub." + k), float(sub.get(k, 0.0)), 20.0, UiTheme.SUN, 78, BAR_W)
		var opp: Dictionary = m.get("indice_opp", {})
		_lbl(right, Loc.t("mgr.indice_opp", {"n": "%.1f" % float(opp.get("total", 0.0))}), Color(UiTheme.CREAM, 0.8))
	var cup: Dictionary = rep.get("cup", {})
	if cup.has("score"):
		var sc: Array = cup["score"]
		var won: bool = bool(cup.get("won", false))
		var txt := Loc.t("mgr.cup_line", {"round": _round_name(str(cup.get("round", "r16"))),
			"score": "%s %d - %d %s" % [career.club_short(cup["home"]), int(sc[0]), int(sc[1]), career.club_short(cup["away"])]})
		txt += "  " + Loc.t("mgr.cup_won" if won else "mgr.cup_lost")
		if cup.get("pens", null) != null:
			txt += " " + Loc.t("mgr.pens")
		_lbl(right, txt, UiTheme.SUN if won else UiTheme.CLAY)
	var notes: Array = rep.get("notes", [])
	if not notes.is_empty():
		_spacer(right, 2)
		_head(right, Loc.t("mgr.notes"))
		for n in notes:
			var note: Dictionary = n
			match str(note.get("kind", "")):
				"injury":
					_lbl(right, Loc.t("mgr.note.injury", {"player": note.get("player", ""), "n": int(note.get("weeks", 0))}), UiTheme.CLAY)
				"cup_out":
					_lbl(right, Loc.t("mgr.note.cup_out", {"round": _round_name(str(note.get("round", "r16")))}), UiTheme.CLAY)
				"continental_won":
					_lbl(right, Loc.t("mgr.note.continental_won"), UiTheme.SUN)
	# season summary
	if not season_end.is_empty():
		var se := _panel(v, 0, true)
		_head(se, Loc.t("mgr.season_end", {"n": int(season_end.get("season", 0))}))
		var grid := GridContainer.new()
		grid.columns = 2
		grid.add_theme_constant_override("h_separation", 12)
		grid.add_theme_constant_override("v_separation", 2)
		se.add_child(grid)
		var div: int = int(season_end.get("division", 3))
		var lines: Array = []
		lines.append([Loc.t("mgr.se.position", {"p": int(season_end.get("position", 0)), "div": _division_name(div), "pts": int(season_end.get("points", 0))}), UiTheme.CREAM])
		lines.append([Loc.t("mgr.se.champion", {"club": career.club_name(str(season_end.get("champion", "")))}), UiTheme.CREAM])
		if bool(season_end.get("promoted", false)):
			lines.append([Loc.t("mgr.se.promoted", {"n": div - 1}), UiTheme.SUN])
		elif bool(season_end.get("relegated", false)):
			lines.append([Loc.t("mgr.se.relegated", {"n": div + 1}), UiTheme.CLAY])
		elif bool(season_end.get("l1_title", false)):
			lines.append([Loc.t("mgr.se.l1_title"), UiTheme.SUN])
		else:
			lines.append([Loc.t("mgr.se.stay", {"n": div}), Color(UiTheme.CREAM, 0.8)])
		var secup: Dictionary = season_end.get("cup", {})
		if bool(secup.get("active", false)):
			if bool(secup.get("won", false)):
				lines.append([Loc.t("mgr.se.cup_won"), UiTheme.SUN])
			else:
				lines.append([Loc.t("mgr.se.cup_out", {"n": secup.get("results", []).size()}), Color(UiTheme.CREAM, 0.8)])
		var youth: Array = season_end.get("youth", [])
		lines.append([Loc.t("mgr.se.youth", {"names": ", ".join(youth)}), Color(UiTheme.CREAM, 0.85)])
		var retired: Array = season_end.get("retired", [])
		if not retired.is_empty():
			lines.append([Loc.t("mgr.se.retired", {"names": ", ".join(retired)}), Color(UiTheme.CREAM, 0.85)])
		for ln in lines:
			var l := _lbl(grid, ln[0], ln[1])
			l.custom_minimum_size.x = 300
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(row)
	var cont := _btn(row, Loc.t("mgr.new_season" if not season_end.is_empty() else "mgr.continue"), func(): _show("hub"), 200)
	_first_focus = cont


## Up to max_lines event lines, goals first, then the other actions in minute order.
func _event_lines(m: Dictionary, max_lines: int) -> Array:
	var side: int = int(m.get("side", 0))
	var events: Array = m.get("events", [])
	var scorers: Array = m.get("scorers", [])
	var goals := []
	var others := []
	var scorer_i := 0
	for e in events:
		var ev: Dictionary = e
		var ours: bool = int(ev.get("side", 0)) == side
		var kind: String = str(ev.get("kind", ""))
		var minute: int = int(ev.get("minute", 0))
		var text := "%d'  %s" % [minute, Loc.t("mgr.ev." + kind)]
		var color := Color(UiTheme.CREAM, 0.75)
		if kind == "goal":
			if ours:
				var who: String = str(scorers[scorer_i]) if scorer_i < scorers.size() else ""
				scorer_i += 1
				text += "  " + who
				color = UiTheme.SUN
			else:
				text += "  " + Loc.t("mgr.ev.opp")
				color = UiTheme.CLAY
			goals.append({"minute": minute, "text": text, "color": color})
		else:
			if not ours:
				text += " " + Loc.t("mgr.ev.opp")
			others.append({"minute": minute, "text": text, "color": color})
	var out: Array = goals.duplicate()
	var room := max_lines - out.size()
	var skipped := 0
	if room < 0:
		skipped = -room
		out = out.slice(0, max_lines)
	else:
		for o in others:
			if room > 0:
				out.append(o)
				room -= 1
			else:
				skipped += 1
	out.sort_custom(func(a, b): return int(a["minute"]) < int(b["minute"]))
	if skipped > 0:
		out.append({"minute": 999, "text": Loc.t("mgr.ev.more", {"n": skipped}), "color": Color(UiTheme.CREAM, 0.5)})
	return out


# ---------------------------------------------------------------- squad

func _build_squad() -> void:
	var st: Dictionary = career.state
	var v := _frame(Loc.t("mgr.squad"), "%s  ·  %s" % [Loc.t("mgr.xi_hint"), Loc.t("mgr.budget", {"n": int(st["budget"])})])
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(h)
	var left := _panel(h, 378, false)
	var widths := [150, 34, 30, 34, 44, 60]
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 4)
	left.add_child(header)
	var heads := ["", "", Loc.t("mgr.col.age"), Loc.t("mgr.col.ovr"), Loc.t("mgr.col.fatigue"), ""]
	for i in range(heads.size()):
		var hl := UiTheme.label(heads[i], 8, false, UiTheme.SUN)
		hl.custom_minimum_size.x = widths[i]
		header.add_child(hl)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size.y = 236
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	left.add_child(scroll)
	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation", 1)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)
	var xi: Array = ManagerSim.starting_eleven(st["squad"])
	var xi_ids := {}
	for p in xi:
		xi_ids[p["id"]] = true
	var squad: Array = st["squad"].duplicate()
	var role_order := {"GK": 0, "DEF": 1, "MID": 2, "FWD": 3}
	squad.sort_custom(func(a, b):
		if role_order[a["role"]] != role_order[b["role"]]:
			return role_order[a["role"]] < role_order[b["role"]]
		return ManagerSim.overall(a) > ManagerSim.overall(b))
	if _find_player(selected_pid).is_empty() and not squad.is_empty():
		selected_pid = str(squad[0]["id"])
		for p in squad:
			if xi_ids.has(p["id"]):
				selected_pid = str(p["id"])
				break
	var first_btn: Button = null
	for p in squad:
		var pl: Dictionary = p
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		list.add_child(row)
		var mark := "* " if xi_ids.has(pl["id"]) else "  "
		var b := _btn(row, mark + career.player_name(pl), func():
			selected_pid = str(pl["id"])
			_fill_player_panel(), widths[0], false)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.clip_text = true
		if first_btn == null or selected_pid == str(pl["id"]):
			first_btn = b
		var cols := [Loc.t("mgr.role." + str(pl["role"])), str(int(pl["age"])), str(_overall(pl)), "%d%%" % int(roundf(float(pl["fatigue"]) * 100.0))]
		var inj: int = int(pl.get("injured", 0))
		cols.append(Loc.t("mgr.injured", {"n": inj}) if inj > 0 else "")
		for i in range(cols.size()):
			var cl := UiTheme.label(cols[i], 8, false, UiTheme.CLAY if (i == 4 and inj > 0) else Color(UiTheme.CREAM, 0.85))
			cl.custom_minimum_size.x = widths[i + 1]
			cl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER if i > 0 and i < 4 else HORIZONTAL_ALIGNMENT_LEFT
			row.add_child(cl)
	_first_focus = first_btn
	_player_panel = _panel(h, 0, true)
	_fill_player_panel()
	var back_row := HBoxContainer.new()
	back_row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(back_row)
	_btn(back_row, Loc.t("mgr.back"), func(): _show("hub"), 160)


func _find_player(pid: String) -> Dictionary:
	for p in career.state["squad"]:
		if str(p["id"]) == pid:
			return p
	return {}


func _fill_player_panel() -> void:
	if _player_panel == null:
		return
	for c in _player_panel.get_children():
		_player_panel.remove_child(c)
		c.queue_free()
	var pnl := _player_panel
	_head(pnl, Loc.t("mgr.skills"))
	var p := _find_player(selected_pid)
	if p.is_empty():
		_lbl(pnl, Loc.t("mgr.select_player"), Color(UiTheme.CREAM, 0.7))
		return
	_lbl(pnl, career.player_name(p), UiTheme.CREAM)
	_lbl(pnl, "%s · %d · %s %d · %s" % [Loc.t("mgr.role." + str(p["role"])), int(p["age"]), Loc.t("mgr.col.ovr"), _overall(p),
		Loc.t("mgr.potential", {"n": int(roundf(float(p["potential"])))})], Color(UiTheme.CREAM, 0.8))
	var skills: Dictionary = p["skills"]
	for k in Career.SKILLS:
		_bar(pnl, Loc.t("mgr.skill." + k), float(skills.get(k, 0.0)), 100.0, UiTheme.TERRA, 70, 90)
	_lbl(pnl, "%s · %s" % [Loc.t("mgr.morale", {"n": int(roundf(float(p["morale"]) * 100.0))}),
		Loc.t("mgr.apps_goals", {"a": int(p.get("apps", 0)), "g": int(p.get("goals", 0))})], Color(UiTheme.CREAM, 0.8))
	_spacer(pnl, 2)
	if career.state["squad"].size() > 13:
		_btn(pnl, Loc.t("mgr.release"), func():
			if career.release_player(selected_pid):
				selected_pid = ""
				_show("squad"), 120)
	else:
		_lbl(pnl, Loc.t("mgr.release_min"), Color(UiTheme.CREAM, 0.6))


# ---------------------------------------------------------------- table

func _build_table() -> void:
	var st: Dictionary = career.state
	var v := _frame(Loc.t("mgr.table"), "%s  ·  %s" % [_division_name(int(st["division"])), Loc.t("mgr.season", {"n": int(st["season"])})])
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(h)
	var left := _panel(h, 400, false)
	var grid := GridContainer.new()
	grid.columns = 10
	grid.add_theme_constant_override("h_separation", 4)
	grid.add_theme_constant_override("v_separation", 1)
	left.add_child(grid)
	var cols: PackedStringArray = Loc.t("mgr.tbl.cols").split("|")
	var widths := [26, 150, 24, 24, 24, 24, 26, 26, 30, 30]
	for i in range(cols.size()):
		var c := UiTheme.label(cols[i], 8, false, UiTheme.SUN)
		c.custom_minimum_size.x = widths[i]
		c.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT if i == 1 else HORIZONTAL_ALIGNMENT_RIGHT
		grid.add_child(c)
	var rows: Array = career.standings()
	for i in range(rows.size()):
		var r: Dictionary = rows[i]
		var ours: bool = r["id"] == st["club"]
		var color := UiTheme.SUN if ours else Color(UiTheme.CREAM, 0.85)
		var cells := [str(i + 1), career.club_name(r["id"]), str(int(r["p"])), str(int(r["w"])), str(int(r["d"])), str(int(r["l"])),
			str(int(r["gf"])), str(int(r["ga"])), "%+d" % int(r["gd"]), str(int(r["pts"]))]
		for j in range(cells.size()):
			var c := UiTheme.label(cells[j], 8, false, color)
			c.custom_minimum_size.x = widths[j]
			c.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
			c.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT if j == 1 else HORIZONTAL_ALIGNMENT_RIGHT
			grid.add_child(c)
	var right := _panel(h, 0, true)
	_head(right, Loc.t("mgr.cup_results"))
	var cup: Dictionary = st["cup"]
	var results: Array = cup.get("results", [])
	if bool(cup.get("active", false)) or not results.is_empty():
		if results.is_empty():
			_lbl(right, _round_name(Career.CUP_ROUNDS[int(cup.get("round", 0))]) + " …", Color(UiTheme.CREAM, 0.8))
		for res in results:
			var cr: Dictionary = res
			var sc: Array = cr["score"]
			var side: int = int(cr["side"])
			var us := career.club_short(st["club"])
			var them := career.club_short(str(cr["opp"]))
			var line := "%s : %s %d - %d %s" % [_round_name(str(cr["round"])), us if side == 0 else them, int(sc[0]), int(sc[1]), them if side == 0 else us]
			_lbl(right, line, UiTheme.SUN if bool(cr.get("won", false)) else UiTheme.CLAY)
		if bool(cup.get("won", false)):
			_lbl(right, Loc.t("mgr.se.cup_won"), UiTheme.SUN)
	else:
		_lbl(right, Loc.t("mgr.no_cup"), Color(UiTheme.CREAM, 0.7))
	_spacer(right, 4)
	_head(right, Loc.t("mgr.history"))
	var hist: Array = st.get("history", [])
	if hist.is_empty():
		_lbl(right, Loc.t("mgr.hist.none"), Color(UiTheme.CREAM, 0.7))
	var start := maxi(0, hist.size() - 8)
	for i in range(start, hist.size()):
		var hs: Dictionary = hist[i]
		var txt := Loc.t("mgr.hist.row", {"s": int(hs["season"]), "d": int(hs["division"]), "p": int(hs["position"]), "pts": int(hs["points"])})
		var color := Color(UiTheme.CREAM, 0.85)
		if bool(hs.get("promoted", false)) or bool(hs.get("l1_title", false)):
			color = UiTheme.SUN
		elif bool(hs.get("relegated", false)):
			color = UiTheme.CLAY
		_lbl(right, txt, color)
	var back_row := HBoxContainer.new()
	back_row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(back_row)
	_btn(back_row, Loc.t("mgr.back"), func(): _show("hub"), 160)


# ---------------------------------------------------------------- market & club

func _build_market() -> void:
	var st: Dictionary = career.state
	var v := _frame(Loc.t("mgr.market"), Loc.t("mgr.budget", {"n": int(st["budget"])}))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(h)
	var left := _panel(h, 380, false)
	_head(left, Loc.t("mgr.offers"))
	var market: Array = st["market"]
	if market.is_empty():
		_lbl(left, Loc.t("mgr.no_offers"), Color(UiTheme.CREAM, 0.7))
	var widths := [140, 34, 30, 50, 56]
	for i in range(market.size()):
		var offer: Dictionary = market[i]
		var p: Dictionary = offer["player"]
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		left.add_child(row)
		var cells := [career.player_name(p), Loc.t("mgr.role." + str(p["role"])), str(int(p["age"])), "%s %d" % [Loc.t("mgr.col.ovr"), _overall(p)],
			Loc.t("mgr.price", {"n": int(offer["price"])})]
		for j in range(cells.size()):
			var c := UiTheme.label(cells[j], 8, false, UiTheme.SUN if j == 4 else Color(UiTheme.CREAM, 0.85))
			c.custom_minimum_size.x = widths[j]
			c.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
			row.add_child(c)
		var idx := i
		_btn(row, Loc.t("mgr.sign"), func(): _sign(idx), 60)
	_spacer(left, 4)
	_status = _wrap(left, "", 360, UiTheme.SUN)
	var right := _panel(h, 0, true)
	_head(right, Loc.t("mgr.club"))
	var lvl: int = int(st["facilities"])
	_lbl(right, Loc.t("mgr.facilities", {"n": lvl}))
	if lvl < 5:
		var cost: int = Career.FACILITY_COST[lvl]
		var up := _btn(right, Loc.t("mgr.upgrade", {"n": cost}), _upgrade, 200)
		up.clip_text = true
	else:
		_lbl(right, Loc.t("mgr.upgrade_max"), Color(UiTheme.CREAM, 0.7))
	_spacer(right, 4)
	var titles: Dictionary = st.get("titles", {})
	_lbl(right, Loc.t("mgr.titles", {"l1": int(titles.get("l1", 0)), "c": int(titles.get("continental", 0))}))
	if bool(st.get("won_continental", false)):
		_wrap(right, Loc.t("mgr.celebrate"), 200, UiTheme.SUN)
	var back_row := HBoxContainer.new()
	back_row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(back_row)
	_btn(back_row, Loc.t("mgr.back"), func(): _show("hub"), 160)


func _sign(index: int) -> void:
	var st: Dictionary = career.state
	if index >= st["market"].size():
		return
	var price: int = int(st["market"][index]["price"])
	if st["squad"].size() >= 22:
		_set_status(Loc.t("mgr.squad_full"), UiTheme.CLAY)
		return
	if int(st["budget"]) < price:
		_set_status(Loc.t("mgr.too_poor"), UiTheme.CLAY)
		return
	if career.sign_player(index):
		_show("market")


func _upgrade() -> void:
	if career.upgrade_facilities():
		_show("market")
	else:
		_set_status(Loc.t("mgr.too_poor"), UiTheme.CLAY)
