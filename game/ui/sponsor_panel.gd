class_name SponsorPanel
extends PanelContainer
## Réglages → Sponsors: the boards around the pitch. Lists the published sponsors (bundled or
## from the website's sponsors.json) and the ones added on this device, and lets the player
## add a partner (name + colour) or remove one of their own. Saved in user://sponsors.json.

signal closed

const COLOURS := ["#1F4D3A", "#E3A92B", "#B8432F", "#2B3F7A", "#101814", "#F6F1E4", "#C5762F", "#5C6B2E", "#8E44AD", "#1ABC9C"]

var list_box: VBoxContainer
var name_edit: LineEdit
var colour_btn: Button
var status: Label
var _colour := 0


func _ready() -> void:
	theme = UiTheme.theme()
	set_anchors_preset(Control.PRESET_CENTER)
	process_mode = Node.PROCESS_MODE_ALWAYS
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 5)
	add_child(v)
	v.add_child(UiTheme.label(Loc.t("sponsors.title"), 10, true, UiTheme.SUN))
	var intro := UiTheme.label(Loc.t("sponsors.intro"), 8, false, Color(UiTheme.CREAM, 0.8))
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.custom_minimum_size.x = 330
	v.add_child(intro)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(340, 150)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(scroll)
	list_box = VBoxContainer.new()
	list_box.add_theme_constant_override("separation", 3)
	list_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list_box)
	# add row
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	v.add_child(h)
	name_edit = LineEdit.new()
	name_edit.placeholder_text = Loc.t("sponsors.name_hint")
	name_edit.max_length = 18
	name_edit.custom_minimum_size = Vector2(150, 18)
	name_edit.add_theme_font_override("font", UiTheme.font_small())
	name_edit.add_theme_font_size_override("font_size", 8)
	name_edit.add_theme_stylebox_override("normal", UiTheme.panel(Color(UiTheme.NIGHT, 0.9), UiTheme.LINE, 0, 4))
	name_edit.add_theme_stylebox_override("focus", UiTheme.panel(Color(UiTheme.NIGHT, 0.9), UiTheme.SUN, 0, 4, 2))
	name_edit.add_theme_color_override("font_color", UiTheme.CREAM)
	name_edit.add_theme_color_override("font_placeholder_color", Color(UiTheme.CREAM, 0.45))
	name_edit.text_submitted.connect(func(_t): _add())
	h.add_child(name_edit)
	colour_btn = UiTheme.button(Loc.t("sponsors.colour"), 70)
	colour_btn.pressed.connect(func():
		_colour = (_colour + 1) % COLOURS.size()
		_paint_colour_button()
		Sfx.play("ui_select", Vector2.ZERO, -8.0))
	h.add_child(colour_btn)
	_paint_colour_button()
	var add := UiTheme.button(Loc.t("sponsors.add"), 80)
	add.pressed.connect(_add)
	h.add_child(add)
	status = UiTheme.label("", 8, false, Color(UiTheme.CREAM, 0.7))
	v.add_child(status)
	var back := UiTheme.button(Loc.t("setup.back"), 150)
	back.pressed.connect(_close)
	v.add_child(back)
	_refresh()
	await get_tree().process_frame
	position = ((get_parent_area_size() - size) * 0.5).round()
	back.grab_focus()


func _paint_colour_button() -> void:
	var bg := Color.html(COLOURS[_colour])
	var sb := UiTheme.panel(bg, UiTheme.INK, 0, 3)
	colour_btn.add_theme_stylebox_override("normal", sb)
	colour_btn.add_theme_stylebox_override("hover", sb)
	colour_btn.add_theme_stylebox_override("focus", UiTheme.panel(bg, UiTheme.SUN, 0, 3, 2))
	colour_btn.add_theme_color_override("font_color", Color.html(Sprites.contrast_hex(COLOURS[_colour])))


func _refresh() -> void:
	for c in list_box.get_children():
		c.queue_free()
	var local_names := {}
	for e in Content.sponsors_local:
		local_names[e["name"]] = true
	for e in Content.sponsors():
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 6)
		var swatch := ColorRect.new()
		swatch.color = Color.html(e["bg"])
		swatch.custom_minimum_size = Vector2(14, 12)
		row.add_child(swatch)
		var l := UiTheme.label(str(e["name"]), 8, false, UiTheme.CREAM)
		l.custom_minimum_size.x = 150
		row.add_child(l)
		var tag := ""
		if e.get("title", false):
			tag = Loc.t("sponsors.title_sponsor")
		elif local_names.has(e["name"]):
			tag = Loc.t("sponsors.local")
		var tl := UiTheme.label(tag, 8, false, Color(UiTheme.SUN, 0.85))
		tl.custom_minimum_size.x = 90
		row.add_child(tl)
		if local_names.has(e["name"]):
			var rm := UiTheme.button(Loc.t("sponsors.remove"), 64)
			rm.pressed.connect(func():
				Content.remove_sponsor(str(e["name"]))
				Sfx.play("ui_select", Vector2.ZERO, -6.0)
				_refresh())
			row.add_child(rm)
		row.custom_minimum_size.y = 14
		list_box.add_child(row)


func _add() -> void:
	var n := name_edit.text.strip_edges()
	if n == "":
		status.text = Loc.t("sponsors.full")
		return
	if Content.add_sponsor(n, COLOURS[_colour]):
		status.text = Loc.t("sponsors.added", {"name": n.to_upper()})
		name_edit.text = ""
		Sfx.play("ui_select", Vector2.ZERO, -4.0)
		_refresh()


func _close() -> void:
	closed.emit()
	queue_free()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and not name_edit.has_focus():
		_close()
		get_viewport().set_input_as_handled()
