class_name PadSetup
extends PanelContainer
## Controller mapping: press the pad button you want for each action, in turn. Works with any
## pad (Xbox, PlayStation, Stadia, generic), since it records the raw button index. Saved in
## Game.settings["pad_map"] and applied to the InputMap at start-up and on save.

signal closed

const STEPS := [["pass", "hud.pass_hint"], ["shoot", "hud.shoot_hint"], ["through", "hud.through_hint"], ["switch_player", "hud.switch_hint"], ["sprint", "hud.sprint_hint"], ["pause", "hud.pause"]]

var step := 0
var map: Dictionary = {}
var prompt: Label
var status: Label
var last: Label
var _cool := 0.0


func _ready() -> void:
	theme = UiTheme.theme()
	set_anchors_preset(Control.PRESET_CENTER)
	process_mode = Node.PROCESS_MODE_ALWAYS
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	add_child(v)
	var title := UiTheme.label(Loc.t("pad.setup_title"), 10, true, UiTheme.SUN)
	v.add_child(title)
	var name := Game.pad_name()
	var n := UiTheme.label(Loc.t("title.pad", {"name": name}) if name != "" else Loc.t("title.no_pad"), 8, false, Color(UiTheme.CREAM, 0.8))
	n.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	n.custom_minimum_size.x = 300
	v.add_child(n)
	prompt = UiTheme.label("", 10, true, UiTheme.CREAM)
	prompt.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	prompt.custom_minimum_size.x = 300
	v.add_child(prompt)
	last = UiTheme.label("", 8, false, Color(UiTheme.CREAM, 0.7))
	v.add_child(last)
	status = UiTheme.label(Loc.t("pad.setup_hint"), 8, false, Color(UiTheme.CREAM, 0.6))
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status.custom_minimum_size.x = 300
	v.add_child(status)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	v.add_child(h)
	var reset := UiTheme.button(Loc.t("pad.reset"), 140)
	reset.pressed.connect(func():
		Game.settings["pad_map"] = {}
		Game.apply_pad_map()
		Game.save_settings()
		_close())
	h.add_child(reset)
	var cancel := UiTheme.button(Loc.t("setup.back"), 140)
	cancel.pressed.connect(_close)
	h.add_child(cancel)
	_show_step()
	await get_tree().process_frame
	position = ((get_parent_area_size() - size) * 0.5).round()


func _show_step() -> void:
	if step >= STEPS.size():
		Game.settings["pad_map"] = map
		Game.apply_pad_map()
		Game.save_settings()
		prompt.text = Loc.t("pad.setup_done")
		status.text = ""
		return
	prompt.text = Loc.t("pad.press_for", {"action": Loc.t(STEPS[step][1])})


func _process(delta: float) -> void:
	_cool = maxf(0.0, _cool - delta)


func _input(event: InputEvent) -> void:
	if step >= STEPS.size() or _cool > 0.0:
		return
	var rec: Dictionary = {}
	if event is InputEventJoypadButton and event.pressed:
		rec = {"type": "button", "index": int(event.button_index)}
		last.text = Loc.t("pad.detected", {"what": "button %d" % event.button_index})
	elif event is InputEventJoypadMotion and absf(event.axis_value) > 0.75 and event.axis >= 4:
		# triggers (axes 4 and 5) for sprint
		rec = {"type": "axis", "index": int(event.axis), "value": 1.0 if event.axis_value > 0.0 else -1.0}
		last.text = Loc.t("pad.detected", {"what": "axis %d" % event.axis})
	if rec.is_empty():
		return
	get_viewport().set_input_as_handled()
	map[STEPS[step][0]] = rec
	step += 1
	_cool = 0.45
	_show_step()


func _close() -> void:
	closed.emit()
	queue_free()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		_close()
		get_viewport().set_input_as_handled()
