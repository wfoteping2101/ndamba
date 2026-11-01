class_name TouchControls
extends CanvasLayer
## Landscape touch layout: a virtual stick on one side, four action buttons and a sprint
## button on the other, a pause button at the top. Size, opacity and side are settings.
## Buttons inject InputMap actions through the HumanController so logic stays identical.

var m
var hc: HumanController
var root: Control
var stick_base: Control
var stick_knob: Control
var stick_center: Vector2
var stick_radius: float = 34.0
var stick_touch: int = -1
var stick_vec: Vector2 = Vector2.ZERO
var buttons: Dictionary = {}
var btn_touch: Dictionary = {}     # touch index -> action
var scale_f: float = 1.0
var opacity: float = 0.75
var left_handed: bool = false


func setup(p_match, controller: HumanController) -> void:
	m = p_match
	hc = controller
	layer = 12
	scale_f = float(Game.settings.get("touch_scale", 1.0))
	opacity = float(Game.settings.get("touch_opacity", 0.75))
	left_handed = Game.settings.get("touch_layout", "right") == "left"
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	_build()
	get_viewport().size_changed.connect(_layout)
	_layout()


func _build() -> void:
	stick_base = _circle(Color(0, 0, 0, 0.35), 36 * scale_f, Color(1, 1, 1, 0.5))
	root.add_child(stick_base)
	stick_knob = _circle(Color(UiTheme.CREAM, 0.85), 14 * scale_f, Color(UiTheme.INK, 0.8))
	root.add_child(stick_knob)
	for spec in [["pass", "A", UiTheme.FOREST_LIGHT], ["shoot", "B", UiTheme.CLAY], ["through", "X", UiTheme.TERRA], ["switch", "Y", UiTheme.SUN]]:
		var b := _circle(Color(spec[2], 0.85), 17 * scale_f, Color(UiTheme.INK, 0.9))
		var l := UiTheme.label(spec[1], 8, true, UiTheme.CREAM)
		l.set_anchors_preset(Control.PRESET_CENTER)
		l.position = Vector2(-4, -4)
		b.add_child(l)
		b.set_meta("action", spec[0])
		root.add_child(b)
		buttons[spec[0]] = b
	var sprint := _circle(Color(UiTheme.NIGHT, 0.8), 15 * scale_f, Color(UiTheme.CREAM, 0.7))
	var sl := UiTheme.label(">>", 8, true, UiTheme.SUN)
	sl.set_anchors_preset(Control.PRESET_CENTER)
	sl.position = Vector2(-8, -4)
	sprint.add_child(sl)
	root.add_child(sprint)
	buttons["sprint"] = sprint
	var pause := _circle(Color(UiTheme.NIGHT, 0.7), 10, Color(UiTheme.CREAM, 0.6))
	var pl := UiTheme.label("II", 8, true, UiTheme.CREAM)
	pl.set_anchors_preset(Control.PRESET_CENTER)
	pl.position = Vector2(-7, -4)
	pause.add_child(pl)
	root.add_child(pause)
	buttons["pause"] = pause
	root.modulate.a = opacity


func _circle(fill: Color, r: float, border: Color) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(r * 2, r * 2)
	c.size = Vector2(r * 2, r * 2)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	c.set_meta("r", r)
	c.set_meta("fill", fill)
	c.set_meta("border", border)
	c.draw.connect(func():
		c.draw_circle(Vector2(r, r), r, fill)
		c.draw_arc(Vector2(r, r), r - 0.5, 0, TAU, 32, border, 1.0))
	return c


func _layout() -> void:
	var vp := root.size
	var side_l := 54.0 * scale_f
	var stick_x := side_l if not left_handed else vp.x - side_l
	stick_center = Vector2(stick_x, vp.y - 54.0 * scale_f)
	stick_base.position = stick_center - stick_base.size * 0.5
	stick_knob.position = stick_center - stick_knob.size * 0.5
	var bx := (vp.x - 62.0 * scale_f) if not left_handed else 62.0 * scale_f
	var by := vp.y - 52.0 * scale_f
	var d := 26.0 * scale_f
	var places := {"pass": Vector2(0, d), "shoot": Vector2(d, 0), "through": Vector2(-d, 0), "switch": Vector2(0, -d)}
	for k in places.keys():
		var b: Control = buttons[k]
		b.position = Vector2(bx, by) + places[k] - b.size * 0.5
	var sp: Control = buttons["sprint"]
	sp.position = Vector2(bx - (46.0 * scale_f if not left_handed else -46.0 * scale_f), by + 30.0 * scale_f) - sp.size * 0.5
	var pz: Control = buttons["pause"]
	pz.position = Vector2(vp.x * 0.5 - pz.size.x * 0.5, 4)


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var e := event as InputEventScreenTouch
		if e.pressed:
			_touch_down(e.index, e.position)
		else:
			_touch_up(e.index)
	elif event is InputEventScreenDrag:
		var e := event as InputEventScreenDrag
		if e.index == stick_touch:
			_stick_move(e.position)
		else:
			# sliding from one button onto another (e.g. holding sprint)
			var over := _button_at(e.position)
			if btn_touch.get(e.index, "") != over and btn_touch.has(e.index):
				var old: String = btn_touch[e.index]
				if old == "sprint":
					hc.set_touch_sprint(false)
				btn_touch.erase(e.index)
				if over != "":
					_press_button(over, e.index)


func _button_at(p: Vector2) -> String:
	for k in buttons.keys():
		var b: Control = buttons[k]
		var r: float = b.get_meta("r")
		if p.distance_to(b.position + Vector2(r, r)) <= r + 6.0:
			return k
	return ""


func _touch_down(idx: int, p: Vector2) -> void:
	var over := _button_at(p)
	if over != "":
		_press_button(over, idx)
		return
	var on_stick_side := (p.x < root.size.x * 0.45) if not left_handed else (p.x > root.size.x * 0.55)
	if on_stick_side and stick_touch < 0:
		stick_touch = idx
		# floating stick: it appears where the thumb lands
		stick_center = p
		stick_base.position = stick_center - stick_base.size * 0.5
		_stick_move(p)


func _press_button(action: String, idx: int) -> void:
	btn_touch[idx] = action
	match action:
		"sprint":
			hc.set_touch_sprint(true)
		"pause":
			var hud = get_parent().get_node_or_null("Hud")
			if hud:
				hud.set_paused(true)
		_:
			hc.press(action)
	var b: Control = buttons[action]
	b.modulate = Color(1.3, 1.3, 1.3)


func _touch_up(idx: int) -> void:
	if idx == stick_touch:
		stick_touch = -1
		stick_vec = Vector2.ZERO
		hc.set_touch_move(Vector2.ZERO, false)
		_layout()
		return
	if btn_touch.has(idx):
		var action: String = btn_touch[idx]
		btn_touch.erase(idx)
		if action == "sprint":
			hc.set_touch_sprint(false)
		elif action == "shoot":
			hc.release("shoot")
		buttons[action].modulate = Color.WHITE


func _stick_move(p: Vector2) -> void:
	var v := (p - stick_center) / stick_radius
	if v.length() > 1.0:
		v = v.normalized()
	stick_vec = v
	stick_knob.position = stick_center + v * stick_radius * 0.8 - stick_knob.size * 0.5
	hc.set_touch_move(v, true)
