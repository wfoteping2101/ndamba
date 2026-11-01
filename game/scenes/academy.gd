extends Control
## Académie Njangi: the 64 training drills of "Le Code Njangi", browsable by family, each with
## its diagram. Fully keyboard/gamepad navigable. Drills marked as done are saved in slot "academy".
##
## Test / QA user args: --screenshot <path> (saves the rendered viewport after ~10 frames and quits),
## --drill <id> (opens that drill page first), --family <family>.

const INDEX_PATH := "res://content/academy/drills_index.json"
const FAMILIES := ["technique", "position", "rondo", "ssg", "lsg", "phase", "transition", "finishing"]
const TIERS := ["I", "II", "III"]
const INTENSITY_COLOR := {
	"low": UiTheme.FOREST_LIGHT,
	"medium": UiTheme.SUN,
	"high": UiTheme.TERRA,
	"very-high": UiTheme.CLAY,
}
const SCROLL_STEP := 24

var drills: Array = []              # every drill, file order
var by_family: Dictionary = {}      # family -> Array[Dictionary] sorted by order
var by_id: Dictionary = {}          # id -> drill
var done: Dictionary = {}           # id -> true
var family: String = "technique"
var current: Dictionary = {}        # open drill, {} while on the list

var list_view: Control = null
var page_view: Control = null
var diagram: Diagram = null
var family_buttons: Dictionary = {}  # family -> Button
var family_counts: Dictionary = {}   # family -> Label
var drill_buttons: Dictionary = {}   # id -> Button
var drill_checks: Dictionary = {}    # id -> CheckMark
var drill_column: VBoxContainer = null
var drill_header: Label = null
var progress_label: Label = null
var done_button: Button = null
var page_done_check: CheckMark = null

var _screenshot_path := ""
var _frames := 0
var _focus_after_back := ""


func _ready() -> void:
	theme = UiTheme.theme()
	_load_index()
	_load_done()
	var bg := ColorRect.new()
	bg.color = UiTheme.NIGHT
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var ground := TextureRect.new()
	ground.texture = load("res://assets/stadium/ground_terre.png")
	ground.set_anchors_preset(Control.PRESET_FULL_RECT)
	ground.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	ground.modulate = Color(0.4, 0.37, 0.35)
	ground.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(ground)
	_build_list()
	_build_page()
	var args := OS.get_cmdline_user_args()
	var first_drill := ""
	var i := 0
	while i < args.size():
		var a: String = args[i]
		if a == "--screenshot" and i + 1 < args.size():
			_screenshot_path = args[i + 1]
			i += 1
		elif a == "--drill" and i + 1 < args.size():
			first_drill = args[i + 1]
			i += 1
		elif a == "--family" and i + 1 < args.size():
			family = args[i + 1]
			i += 1
		i += 1
	Loc.language_changed.connect(func(_l): _rebuild())
	if first_drill != "" and by_id.has(first_drill):
		open_drill(first_drill)
	else:
		show_list()


func _process(_delta: float) -> void:
	if _screenshot_path == "":
		return
	_frames += 1
	if _frames >= 10:
		var img := get_viewport().get_texture().get_image()
		img.save_png(_screenshot_path)
		_screenshot_path = ""
		get_tree().quit()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		if page_view.visible:
			back_to_list()
		else:
			_to_title()


# ----------------------------------------------------------------------------------------------
# data

func _load_index() -> void:
	drills = []
	by_family = {}
	by_id = {}
	for f in FAMILIES:
		by_family[f] = []
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(INDEX_PATH))
	if typeof(parsed) != TYPE_ARRAY:
		push_error("academy: cannot read " + INDEX_PATH)
		return
	drills = parsed
	for d in drills:
		var fam: String = str(d.get("family", ""))
		if not by_family.has(fam):
			by_family[fam] = []
		by_family[fam].append(d)
		by_id[str(d["id"])] = d
	for f in by_family.keys():
		var arr: Array = by_family[f]
		arr.sort_custom(func(a, b): return float(a.get("order", 0)) < float(b.get("order", 0)))


func _load_done() -> void:
	done = {}
	var saved: Variant = Game.save.read("academy")
	if typeof(saved) == TYPE_DICTIONARY:
		var ids: Array = saved.get("done", [])
		for id in ids:
			done[str(id)] = true


func _save_done() -> void:
	var ids: Array = done.keys()
	ids.sort()
	Game.save.write("academy", {"done": ids})


func is_done(id: String) -> bool:
	return done.has(id)


func done_in_family(f: String) -> int:
	var n := 0
	for d in by_family.get(f, []):
		if done.has(str(d["id"])):
			n += 1
	return n


## Tighter vertical padding so a whole family (up to 14 drills) fits on screen.
static func compact(b: Button) -> Button:
	var styles := {
		"normal": [UiTheme.CREAM, UiTheme.INK, 1], "hover": [UiTheme.SUN, UiTheme.INK, 1],
		"pressed": [UiTheme.TERRA, UiTheme.INK, 1], "focus": [Color(0, 0, 0, 0), UiTheme.SUN, 2],
		"disabled": [Color(0.85, 0.82, 0.76), UiTheme.LINE, 1],
	}
	for k in styles.keys():
		var st: Array = styles[k]
		var sb := UiTheme.panel(st[0], st[1], 0, 6, int(st[2]))
		sb.content_margin_top = 3
		sb.content_margin_bottom = 3
		b.add_theme_stylebox_override(k, sb)
	b.custom_minimum_size.y = 0
	return b


func family_name(f: String) -> String:
	return Loc.t("acad.family." + f)


func tier_tag(d: Dictionary) -> String:
	var t := clampi(int(d.get("tier", 1)), 1, 3)
	return TIERS[t - 1]


# ----------------------------------------------------------------------------------------------
# list view

func _build_list() -> void:
	list_view = MarginContainer.new()
	list_view.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		list_view.add_theme_constant_override("margin_" + side, 8)
	add_child(list_view)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	list_view.add_child(v)
	# header
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	v.add_child(head)
	var title := UiTheme.label(Loc.t("acad.title"), 12, true, UiTheme.SUN)
	head.add_child(title)
	var sub := UiTheme.label(Loc.t("acad.subtitle"), 8, false, Color(UiTheme.CREAM, 0.75))
	sub.size_flags_vertical = Control.SIZE_SHRINK_END
	sub.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sub)
	progress_label = UiTheme.label("", 8, false, UiTheme.SUN)
	progress_label.size_flags_vertical = Control.SIZE_SHRINK_END
	head.add_child(progress_label)
	# body
	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 8)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(body)
	# families column
	var fam_panel := PanelContainer.new()
	fam_panel.custom_minimum_size.x = 150
	fam_panel.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.86), UiTheme.SUN, 0, 6, 1))
	body.add_child(fam_panel)
	var fam_v := VBoxContainer.new()
	fam_v.add_theme_constant_override("separation", 3)
	fam_panel.add_child(fam_v)
	fam_v.add_child(UiTheme.label(Loc.t("acad.families"), 8, false, UiTheme.SUN))
	for f in FAMILIES:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		fam_v.add_child(row)
		var b := UiTheme.button(family_name(f), 96)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.clip_text = true
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.focus_entered.connect(func():
			Sfx.play("ui_move", Vector2.ZERO, -6.0)
			if family != f:
				open_family(f))
		b.pressed.connect(func():
			Sfx.play("ui_select")
			open_family(f)
			_focus_first_drill())
		row.add_child(b)
		family_buttons[f] = b
		var cnt := UiTheme.label("", 8, false, Color(UiTheme.CREAM, 0.8))
		cnt.custom_minimum_size.x = 30
		cnt.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		row.add_child(cnt)
		family_counts[f] = cnt
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	fam_v.add_child(spacer)
	var back := UiTheme.button(Loc.t("acad.back_title"), 120)
	back.pressed.connect(_to_title)
	back.focus_entered.connect(func(): Sfx.play("ui_move", Vector2.ZERO, -6.0))
	fam_v.add_child(back)
	# drills column
	var drill_panel := PanelContainer.new()
	drill_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	drill_panel.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.86), UiTheme.SUN, 0, 6, 1))
	body.add_child(drill_panel)
	var dv := VBoxContainer.new()
	dv.add_theme_constant_override("separation", 3)
	drill_panel.add_child(dv)
	drill_header = UiTheme.label("", 8, false, UiTheme.SUN)
	dv.add_child(drill_header)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.follow_focus = true
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	dv.add_child(scroll)
	drill_column = VBoxContainer.new()
	drill_column.add_theme_constant_override("separation", 2)
	drill_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(drill_column)
	var hint := UiTheme.label(Loc.t("acad.hint_list"), 8, false, Color(UiTheme.CREAM, 0.5))
	v.add_child(hint)


## Select a family: its drills are listed on the right (does not move focus).
func open_family(f: String) -> void:
	if not by_family.has(f):
		return
	family = f
	for c in drill_column.get_children():
		drill_column.remove_child(c)
		c.queue_free()
	drill_buttons = {}
	drill_checks = {}
	var arr: Array = by_family[f]
	drill_header.text = "%s  ·  %s" % [family_name(f), Loc.t("acad.done_count", {"done": done_in_family(f), "total": arr.size()})]
	for d in arr:
		var id: String = str(d["id"])
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		drill_column.add_child(row)
		var sq := ColorRect.new()
		sq.color = INTENSITY_COLOR.get(str(d.get("intensity", "medium")), UiTheme.SUN)
		sq.custom_minimum_size = Vector2(6, 6)
		sq.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(sq)
		var b := compact(UiTheme.button("%s  %s" % [id, Loc.field(d, "title")], 200))
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.clip_text = true
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.focus_entered.connect(func(): Sfx.play("ui_move", Vector2.ZERO, -6.0))
		b.pressed.connect(func():
			Sfx.play("ui_select")
			open_drill(id))
		row.add_child(b)
		drill_buttons[id] = b
		var tier := UiTheme.label(tier_tag(d), 8, false, UiTheme.SUN)
		tier.custom_minimum_size.x = 18
		tier.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		row.add_child(tier)
		var chk := CheckMark.new()
		chk.custom_minimum_size = Vector2(10, 10)
		chk.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		chk.checked = done.has(id)
		row.add_child(chk)
		drill_checks[id] = chk
	_refresh_counts()


func _refresh_counts() -> void:
	for f in FAMILIES:
		if family_counts.has(f):
			family_counts[f].text = "%d/%d" % [done_in_family(f), by_family.get(f, []).size()]
	progress_label.text = Loc.t("acad.progress", {"done": done.size(), "total": drills.size()})
	if by_family.has(family) and drill_header != null:
		drill_header.text = "%s  ·  %s" % [family_name(family), Loc.t("acad.done_count", {"done": done_in_family(family), "total": by_family[family].size()})]
	for id in drill_checks.keys():
		drill_checks[id].checked = done.has(id)


func _focus_first_drill() -> void:
	for id in drill_buttons.keys():
		drill_buttons[id].grab_focus()
		return


## Show the family/drill list (focus the current family, or the drill we come back from).
func show_list() -> void:
	current = {}
	page_view.visible = false
	list_view.visible = true
	open_family(family)
	await get_tree().process_frame
	if not is_inside_tree() or not list_view.visible:
		return
	if _focus_after_back != "" and drill_buttons.has(_focus_after_back):
		drill_buttons[_focus_after_back].grab_focus()
	elif family_buttons.has(family):
		family_buttons[family].grab_focus()
	_focus_after_back = ""


# ----------------------------------------------------------------------------------------------
# drill page

var _page_title: Label
var _page_id: Label
var _page_tier: Label
var _page_subtitle: Label
var _page_text: VBoxContainer
var _page_scroll: ScrollContainer
var _prev_button: Button
var _next_button: Button
var _page_back: Button


func _build_page() -> void:
	page_view = MarginContainer.new()
	page_view.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		page_view.add_theme_constant_override("margin_" + side, 8)
	page_view.visible = false
	add_child(page_view)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 3)
	page_view.add_child(v)
	# header
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 8)
	v.add_child(head)
	_page_id = UiTheme.label("", 10, true, UiTheme.SUN)
	head.add_child(_page_id)
	_page_title = UiTheme.label("", 10, true, UiTheme.CREAM)
	_page_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_page_title.clip_text = true
	head.add_child(_page_title)
	_page_tier = UiTheme.label("", 8, false, UiTheme.SUN)
	_page_tier.size_flags_vertical = Control.SIZE_SHRINK_END
	head.add_child(_page_tier)
	_page_subtitle = UiTheme.label("", 8, false, Color(UiTheme.CREAM, 0.8))
	_page_subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(_page_subtitle)
	# body
	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 8)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(body)
	var text_panel := PanelContainer.new()
	text_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	text_panel.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.86), UiTheme.SUN, 0, 6, 1))
	body.add_child(text_panel)
	_page_scroll = ScrollContainer.new()
	_page_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_page_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_page_scroll.focus_mode = Control.FOCUS_ALL
	_page_scroll.add_theme_stylebox_override("focus", UiTheme.panel(Color(0, 0, 0, 0), UiTheme.SUN, 0, 0, 1))
	_page_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_page_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_page_scroll.gui_input.connect(_on_text_scroll_input)
	_page_scroll.focus_entered.connect(func(): Sfx.play("ui_move", Vector2.ZERO, -6.0))
	text_panel.add_child(_page_scroll)
	_page_text = VBoxContainer.new()
	_page_text.add_theme_constant_override("separation", 3)
	_page_text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_page_scroll.add_child(_page_text)
	# right column: diagram + buttons
	var right := VBoxContainer.new()
	right.add_theme_constant_override("separation", 4)
	right.custom_minimum_size.x = 250
	body.add_child(right)
	var dia_panel := PanelContainer.new()
	dia_panel.add_theme_stylebox_override("panel", UiTheme.panel(Color(UiTheme.NIGHT, 0.86), UiTheme.SUN, 0, 2, 1))
	right.add_child(dia_panel)
	diagram = Diagram.new()
	diagram.custom_minimum_size = Vector2(246, 166)
	dia_panel.add_child(diagram)
	var legend := UiTheme.label(Loc.t("acad.legend"), 8, false, Color(UiTheme.CREAM, 0.6))
	legend.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	legend.custom_minimum_size.x = 250
	right.add_child(legend)
	var nav := HBoxContainer.new()
	nav.add_theme_constant_override("separation", 4)
	right.add_child(nav)
	_prev_button = UiTheme.button(Loc.t("acad.prev"), 123)
	_prev_button.pressed.connect(func(): next_drill(-1))
	nav.add_child(_prev_button)
	_next_button = UiTheme.button(Loc.t("acad.next"), 123)
	_next_button.pressed.connect(func(): next_drill(1))
	nav.add_child(_next_button)
	var done_row := HBoxContainer.new()
	done_row.add_theme_constant_override("separation", 4)
	right.add_child(done_row)
	done_button = UiTheme.button(Loc.t("acad.mark_done"), 236)
	done_button.pressed.connect(toggle_done)
	done_row.add_child(done_button)
	page_done_check = CheckMark.new()
	page_done_check.custom_minimum_size = Vector2(10, 10)
	page_done_check.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	done_row.add_child(page_done_check)
	_page_back = UiTheme.button(Loc.t("acad.back"), 250)
	_page_back.pressed.connect(func():
		Sfx.play("ui_select")
		back_to_list())
	right.add_child(_page_back)
	var hint := UiTheme.label(Loc.t("acad.hint_page"), 8, false, Color(UiTheme.CREAM, 0.5))
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint.custom_minimum_size.x = 250
	right.add_child(hint)
	for b in [_prev_button, _next_button, done_button, _page_back]:
		b.focus_entered.connect(func(): Sfx.play("ui_move", Vector2.ZERO, -6.0))
		b.focus_neighbor_left = b.get_path_to(_page_scroll)
	_page_scroll.focus_neighbor_right = _page_scroll.get_path_to(_prev_button)
	_page_scroll.focus_neighbor_bottom = _page_scroll.get_path_to(_page_scroll)
	_page_scroll.focus_neighbor_top = _page_scroll.get_path_to(_page_scroll)
	_page_scroll.focus_next = _page_scroll.get_path_to(_prev_button)
	_page_scroll.focus_previous = _page_scroll.get_path_to(_page_back)


## Up/down scroll the text when the text block has focus (left/right leave it).
func _on_text_scroll_input(event: InputEvent) -> void:
	if not _page_scroll.has_focus():
		return
	if event.is_action_pressed("ui_down", true):
		_page_scroll.scroll_vertical += SCROLL_STEP
		_page_scroll.accept_event()
	elif event.is_action_pressed("ui_up", true):
		_page_scroll.scroll_vertical -= SCROLL_STEP
		_page_scroll.accept_event()


func _section_label(text: String, color: Color = UiTheme.SUN) -> Label:
	var l := UiTheme.label(text, 8, false, color)
	return l


func _para(text: String, color: Color = UiTheme.CREAM) -> Label:
	var l := UiTheme.label(text, 8, false, color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l


func _chip(text: String, bg: Color) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiTheme.panel(bg, Color(0, 0, 0, 0), 0, 2, 0))
	var l := UiTheme.label(text, 8, false, UiTheme.CREAM)
	p.add_child(l)
	return p


## Open one drill page by id (focus lands on the "done" button unless focus_done is false).
func open_drill(id: String, focus_done: bool = true) -> void:
	if not by_id.has(id):
		return
	var d: Dictionary = by_id[id]
	current = d
	family = str(d.get("family", family))
	list_view.visible = false
	page_view.visible = true
	_page_id.text = id
	_page_title.text = Loc.field(d, "title")
	_page_tier.text = Loc.t("acad.tier", {"tier": tier_tag(d)})
	_page_subtitle.text = Loc.field(d, "subtitle")
	for c in _page_text.get_children():
		_page_text.remove_child(c)
		c.queue_free()
	var players: Dictionary = d.get("players", {})
	var space: Dictionary = d.get("space", {})
	var intensity: String = str(d.get("intensity", "medium"))
	var info := HBoxContainer.new()
	info.add_theme_constant_override("separation", 4)
	var sq := ColorRect.new()
	sq.color = INTENSITY_COLOR.get(intensity, UiTheme.SUN)
	sq.custom_minimum_size = Vector2(6, 6)
	sq.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	info.add_child(sq)
	var pmin := int(players.get("min", 0))
	var pmax := int(players.get("max", pmin))
	info.add_child(_para(Loc.t("acad.info", {
		"players": str(pmin) if pmin == pmax else "%d-%d" % [pmin, pmax],
		"w": int(space.get("w", 0)), "h": int(space.get("h", 0)),
		"minutes": int(d.get("minutes", 0)),
		"intensity": Loc.t("acad.intensity." + intensity),
		"ages": str(d.get("ages", "")),
	}), Color(UiTheme.CREAM, 0.85)))
	_page_text.add_child(info)
	var chips := HFlowContainer.new()
	chips.add_theme_constant_override("h_separation", 3)
	chips.add_theme_constant_override("v_separation", 3)
	for it in d.get("intentions", []):
		chips.add_child(_chip(Loc.t("acad.intent." + str(it)), UiTheme.FOREST_LIGHT))
	for sk in d.get("skills", []):
		chips.add_child(_chip(Loc.t("acad.skill." + str(sk)), Color(UiTheme.TERRA, 0.8)))
	_page_text.add_child(chips)
	_page_text.add_child(_section_label(Loc.t("acad.objective")))
	_page_text.add_child(_para(Loc.field(d, "objective")))
	_page_text.add_child(_section_label(Loc.t("acad.rules")))
	var rules: Array = d.get("rules_" + Loc.lang, d.get("rules_fr", []))
	var n := 1
	for r in rules:
		_page_text.add_child(_para("%d. %s" % [n, str(r)]))
		n += 1
	_page_text.add_child(_section_label(Loc.t("acad.measure")))
	_page_text.add_child(_para(Loc.field(d, "measure"), Color(UiTheme.CREAM, 0.9)))
	_page_scroll.scroll_vertical = 0
	diagram.set_drill(d)
	_refresh_page_buttons()
	if focus_done:
		_focus_page()


func _focus_page() -> void:
	await get_tree().process_frame
	if is_inside_tree() and page_view.visible and done_button != null:
		done_button.grab_focus()


func _refresh_page_buttons() -> void:
	if current.is_empty():
		return
	var id: String = str(current["id"])
	done_button.text = Loc.t("acad.mark_undone" if done.has(id) else "acad.mark_done")
	page_done_check.checked = done.has(id)
	var arr: Array = by_family.get(family, [])
	var idx := _index_in_family(id)
	_prev_button.disabled = idx <= 0
	_next_button.disabled = idx < 0 or idx >= arr.size() - 1


func _index_in_family(id: String) -> int:
	var arr: Array = by_family.get(family, [])
	for i in range(arr.size()):
		if str(arr[i]["id"]) == id:
			return i
	return -1


## Toggle "done" on the open drill and persist it in save slot "academy".
func toggle_done() -> void:
	if current.is_empty():
		return
	Sfx.play("ui_select")
	var id: String = str(current["id"])
	if done.has(id):
		done.erase(id)
	else:
		done[id] = true
	_save_done()
	_refresh_page_buttons()
	_refresh_counts()


## Move to the previous (-1) or next (+1) drill of the same family.
func next_drill(dir: int) -> void:
	if current.is_empty():
		return
	var arr: Array = by_family.get(family, [])
	var idx := _index_in_family(str(current["id"])) + dir
	if idx < 0 or idx >= arr.size():
		return
	Sfx.play("ui_move", Vector2.ZERO, -6.0)
	var was_focus := get_viewport().gui_get_focus_owner()
	open_drill(str(arr[idx]["id"]), false)
	await get_tree().process_frame
	if not is_inside_tree() or not page_view.visible:
		return
	if was_focus is BaseButton and not (was_focus as BaseButton).disabled:
		was_focus.grab_focus()
	else:
		done_button.grab_focus()


func back_to_list() -> void:
	if not current.is_empty():
		_focus_after_back = str(current["id"])
	show_list()


func _to_title() -> void:
	Sfx.play("ui_select")
	get_tree().change_scene_to_file("res://scenes/title.tscn")


func _rebuild() -> void:
	var open_id := "" if current.is_empty() else str(current["id"])
	var fam := family
	for c in [list_view, page_view]:
		remove_child(c)
		c.queue_free()
	family_buttons = {}
	family_counts = {}
	drill_buttons = {}
	drill_checks = {}
	_build_list()
	_build_page()
	family = fam
	if open_id != "":
		open_drill(open_id)
	else:
		show_list()


# ----------------------------------------------------------------------------------------------
# a small drawn check mark (the pixel fonts have no tick glyph)

class CheckMark extends Control:
	var checked := false:
		set(v):
			checked = v
			queue_redraw()

	func _draw() -> void:
		var s := size
		var c := Color(UiTheme.CREAM, 0.25)
		draw_rect(Rect2(Vector2(0, 0), s), Color(0, 0, 0, 0.35))
		draw_rect(Rect2(Vector2(0, 0), s), c, false, 1.0)
		if checked:
			var pts := PackedVector2Array([Vector2(2, s.y * 0.5), Vector2(s.x * 0.4, s.y - 3), Vector2(s.x - 2, 2)])
			draw_polyline(pts, UiTheme.SUN, 2.0)


# ----------------------------------------------------------------------------------------------
# the drill diagram, drawn from the "diagram" dictionary of a drill

class Diagram extends Control:
	const RADIUS := 5.0
	const MARGIN := 6.0
	const TEAM_FILL := {
		"a": UiTheme.CREAM, "b": UiTheme.CLAY, "n": UiTheme.SUN,
		"gk": UiTheme.TERRA, "gka": UiTheme.TERRA, "gkb": UiTheme.INK,
	}
	const TEAM_OUTLINE := {
		"a": UiTheme.INK, "b": UiTheme.INK, "n": UiTheme.INK,
		"gk": UiTheme.INK, "gka": UiTheme.INK, "gkb": UiTheme.CREAM,
	}
	const PITCH := Color("2F6E3F")
	const PITCH_DARK := Color("2A6238")
	const LINE := Color(0.96, 0.94, 0.88, 0.75)

	var data: Dictionary = {}
	var view: String = "grid"
	var pitch_w: float = 30.0
	var pitch_h: float = 20.0
	var _scale: float = 1.0
	var _origin: Vector2 = Vector2.ZERO
	var _pos: Dictionary = {}   # player id -> metres

	func set_drill(d: Dictionary) -> void:
		data = d.get("diagram", {})
		view = str(data.get("view", "grid"))
		var space: Dictionary = d.get("space", {})
		match view:
			"full":
				pitch_w = 105.0
				pitch_h = 68.0
			"half":
				pitch_w = 52.0
				pitch_h = 68.0
			"third":
				pitch_w = 35.0
				pitch_h = 68.0
			_:
				pitch_w = float(data.get("w", space.get("w", 30)))
				pitch_h = float(data.get("h", space.get("h", 20)))
		# make sure every element fits (some diagrams place players a little outside)
		for p in data.get("players", []):
			pitch_w = maxf(pitch_w, float(p.get("x", 0)))
			pitch_h = maxf(pitch_h, float(p.get("y", 0)))
		pitch_w = maxf(pitch_w, 4.0)
		pitch_h = maxf(pitch_h, 4.0)
		_pos = {}
		for p in data.get("players", []):
			_pos[str(p.get("id", ""))] = Vector2(float(p.get("x", 0)), float(p.get("y", 0)))
		queue_redraw()

	func player_count() -> int:
		return data.get("players", []).size()

	func arrow_count() -> int:
		return data.get("arrows", []).size()

	func _m(x: float, y: float) -> Vector2:
		return (_origin + Vector2(x, y) * _scale).round()

	func _pt(ref: Variant) -> Vector2:
		if typeof(ref) == TYPE_ARRAY and ref.size() >= 2:
			return _m(float(ref[0]), float(ref[1]))
		var id := str(ref)
		if _pos.has(id):
			var v: Vector2 = _pos[id]
			return _m(v.x, v.y)
		return _origin

	func _is_player(ref: Variant) -> bool:
		return typeof(ref) == TYPE_STRING and _pos.has(ref)

	func _draw() -> void:
		if data.is_empty():
			return
		var avail := size - Vector2(MARGIN * 2.0, MARGIN * 2.0)
		_scale = minf(avail.x / pitch_w, avail.y / pitch_h)
		var pw := pitch_w * _scale
		var ph := pitch_h * _scale
		_origin = ((size - Vector2(pw, ph)) * 0.5).round()
		var font := UiTheme.font_small()
		# pitch
		var rect := Rect2(_origin, Vector2(pw, ph).round())
		draw_rect(rect, PITCH)
		var stripes := int(ceil(pitch_w / 5.0))
		for i in range(stripes):
			if i % 2 == 1:
				var x0 := _origin.x + roundf(i * 5.0 * _scale)
				var x1 := minf(_origin.x + roundf((i + 1) * 5.0 * _scale), _origin.x + pw)
				draw_rect(Rect2(Vector2(x0, _origin.y), Vector2(x1 - x0, ph)), PITCH_DARK)
		draw_rect(rect, LINE, false, 1.0)
		_draw_markings()
		# zones
		for z in data.get("zones", []):
			var tone := str(z.get("tone", "soft"))
			var col: Color
			match tone:
				"a": col = Color(UiTheme.CREAM, 0.22)
				"b": col = Color(UiTheme.CLAY, 0.3)
				"n": col = Color(UiTheme.SUN, 0.28)
				_: col = Color(UiTheme.CREAM, 0.12)
			var p0 := _m(float(z.get("x", 0)), float(z.get("y", 0)))
			var p1 := _m(float(z.get("x", 0)) + float(z.get("w", 0)), float(z.get("y", 0)) + float(z.get("h", 0)))
			draw_rect(Rect2(p0, p1 - p0), col)
			draw_rect(Rect2(p0, p1 - p0), Color(UiTheme.CREAM, 0.35), false, 1.0)
			if z.has("label"):
				_text(font, p0 + Vector2(2, 9), str(z["label"]), Color(UiTheme.CREAM, 0.8))
		# cones
		for c in data.get("cones", []):
			if typeof(c) == TYPE_ARRAY and c.size() >= 2:
				var p := _m(float(c[0]), float(c[1]))
				draw_colored_polygon(PackedVector2Array([p + Vector2(0, -3), p + Vector2(3, 2), p + Vector2(-3, 2)]), UiTheme.SUN)
		# goals
		for g in data.get("goals", []):
			var full := str(g.get("size", "mini")) == "full"
			var width: float = (7.32 if full else 3.0) * _scale
			var depth: float = maxf(2.0, (1.5 if full else 1.0) * _scale)
			var gp := _m(float(g.get("x", 0)), float(g.get("y", 0)))
			var side := str(g.get("side", "left"))
			var r: Rect2
			if side == "right":
				r = Rect2(gp + Vector2(0, -width * 0.5), Vector2(depth, width))
			else:
				r = Rect2(gp + Vector2(-depth, -width * 0.5), Vector2(depth, width))
			r = Rect2(r.position.round(), r.size.round())
			draw_rect(r, UiTheme.PAPER)
			draw_rect(r, UiTheme.INK, false, 1.0)
		# arrows
		for a in data.get("arrows", []):
			_draw_arrow(a, font)
		# players
		for p in data.get("players", []):
			var team := str(p.get("team", "a"))
			var c := _m(float(p.get("x", 0)), float(p.get("y", 0)))
			draw_circle(c, RADIUS + 1.0, TEAM_OUTLINE.get(team, UiTheme.INK))
			draw_circle(c, RADIUS, TEAM_FILL.get(team, UiTheme.CREAM))
			var label := str(p.get("label", ""))
			if label != "":
				var tw := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
				var asc := font.get_ascent(8)
				var desc := font.get_descent(8)
				var tc: Color = UiTheme.CREAM if team == "gkb" else UiTheme.INK
				draw_string(font, Vector2(c.x - tw * 0.5, c.y + (asc - desc) * 0.5).round(), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, tc)
		# ball
		var ball := str(data.get("ball", ""))
		if _pos.has(ball):
			var bp := _pt(ball) + Vector2(RADIUS + 2.0, -RADIUS)
			draw_circle(bp, 3.0, UiTheme.INK)
			draw_circle(bp, 2.0, Color.WHITE)
		# labels
		for l in data.get("labels", []):
			var lp := _m(float(l.get("x", 0)), float(l.get("y", 0)))
			var txt := str(l.get("text", ""))
			var tw := font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
			lp.x = clampf(lp.x, 1.0, maxf(1.0, size.x - tw - 1.0))
			lp.y = clampf(lp.y, 8.0, size.y - 2.0)
			_text(font, lp, txt, UiTheme.CREAM)

	func _text(font: Font, pos: Vector2, txt: String, color: Color) -> void:
		draw_string(font, pos + Vector2(1, 1), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(0, 0, 0, 0.7))
		draw_string(font, pos, txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, color)

	## Pitch markings for the full / half / third views (grid views only get the frame).
	func _draw_markings() -> void:
		var box_d := 16.5
		var box_w := 40.32
		var six_d := 5.5
		var six_w := 18.32
		var cy := pitch_h * 0.5
		match view:
			"full":
				var hx := _m(pitch_w * 0.5, 0).x
				draw_line(Vector2(hx, _origin.y), Vector2(hx, _origin.y + roundf(pitch_h * _scale)), LINE, 1.0)
				draw_arc(_m(pitch_w * 0.5, cy), 9.15 * _scale, 0.0, TAU, 24, LINE, 1.0)
				_box(0.0, cy, box_d, box_w, false)
				_box(0.0, cy, six_d, six_w, false)
				_box(pitch_w, cy, box_d, box_w, true)
				_box(pitch_w, cy, six_d, six_w, true)
			"half":
				_box(0.0, cy, box_d, box_w, false)
				_box(0.0, cy, six_d, six_w, false)
				draw_arc(_m(pitch_w, cy), 9.15 * _scale, PI * 0.5, PI * 1.5, 16, LINE, 1.0)
			"third":
				_box(pitch_w, cy, box_d, box_w, true)
				_box(pitch_w, cy, six_d, six_w, true)

	func _box(gx: float, cy: float, depth: float, width: float, right: bool) -> void:
		var x0 := gx - depth if right else gx
		var r := Rect2(_m(x0, cy - width * 0.5), (Vector2(depth, width) * _scale).round())
		draw_rect(r, LINE, false, 1.0)

	func _draw_arrow(a: Dictionary, font: Font) -> void:
		var from := _pt(a.get("from"))
		var to := _pt(a.get("to"))
		if from.distance_to(to) < 1.0:
			return
		var dir := (to - from).normalized()
		if _is_player(a.get("from")):
			from += dir * (RADIUS + 1.0)
		if _is_player(a.get("to")):
			to -= dir * (RADIUS + 1.0)
		var kind := str(a.get("kind", "pass"))
		var col := UiTheme.PAPER
		match kind:
			"pass":
				draw_line(from, to, col, 1.0)
			"run":
				draw_dashed_line(from, to, col, 1.0, 3.0, true)
			"press":
				col = UiTheme.SUN
				draw_dashed_line(from, to, col, 1.0, 3.0, true)
			"dribble":
				var n := maxi(2, int(from.distance_to(to) / 3.0))
				var perp := Vector2(-dir.y, dir.x)
				var pts := PackedVector2Array()
				pts.append(from)
				for i in range(1, n):
					var t := float(i) / float(n)
					pts.append(from.lerp(to, t) + perp * (2.0 if i % 2 == 0 else -2.0))
				pts.append(to)
				draw_polyline(pts, col, 1.0)
			"shot":
				draw_line(from, to, col, 3.0)
			_:
				draw_line(from, to, col, 1.0)
		# head
		var hl := 4.0 if kind != "shot" else 5.0
		var h1 := to - dir.rotated(0.5) * hl
		var h2 := to - dir.rotated(-0.5) * hl
		draw_line(to, h1, col, 1.0 if kind != "shot" else 2.0)
		draw_line(to, h2, col, 1.0 if kind != "shot" else 2.0)
		# number
		if a.get("n") != null:
			var mid := from.lerp(to, 0.5)
			var perp := Vector2(-dir.y, dir.x)
			var p := (mid + perp * 5.0).round()
			var txt := str(int(a["n"]))
			var tw := font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
			p = Vector2(clampf(p.x - tw * 0.5, 1.0, size.x - tw - 1.0), clampf(p.y + 3.0, 8.0, size.y - 1.0))
			draw_rect(Rect2(p + Vector2(-1, -7), Vector2(tw + 2, 8)), Color(UiTheme.NIGHT, 0.8))
			draw_string(font, p, txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, UiTheme.SUN)
