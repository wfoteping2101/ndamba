class_name SettingsPanel
extends PanelContainer
## Settings: audio, commentary, aim assist, simple controls, touch layout, reduced motion.

signal closed


func _ready() -> void:
	theme = UiTheme.theme()
	set_anchors_preset(Control.PRESET_CENTER)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 5)
	add_child(v)
	var title := UiTheme.label(Loc.t("settings.title"), 10, true, UiTheme.SUN)
	v.add_child(title)
	_slider(v, "settings.music", "music")
	_slider(v, "settings.sfx", "sfx")
	_cycle(v, "settings.speed", "speed", ["slow", "medium", "fast"], ["speed.slow", "speed.medium", "speed.fast"])
	_toggle(v, "settings.names", "names")
	_toggle(v, "settings.assist_run", "assist_run")
	_cycle(v, "settings.pad_style", "pad_style", ["auto", "xbox", "playstation"], ["settings.auto", "pad.xbox", "pad.playstation"])
	var hp := _row(v, "settings.pad_setup")
	var pb := UiTheme.button(Loc.t("pad.configure"), 110)
	pb.pressed.connect(func():
		var ps := PadSetup.new()
		get_parent().add_child(ps)
		ps.closed.connect(func(): pb.grab_focus()))
	hp.add_child(pb)
	_cycle(v, "settings.quality", "quality", ["auto", "low", "high"], ["settings.auto", "quality.low", "quality.high"])
	_toggle(v, "settings.commentary", "commentary")
	_toggle(v, "settings.assist", "assist_aim")
	_toggle(v, "settings.simple", "simple_controls")
	_toggle(v, "settings.reduced_motion", "reduced_motion")
	_cycle(v, "settings.touch", "show_touch", ["auto", "on", "off"], ["settings.auto", "settings.on", "settings.off"])
	_cycle(v, "settings.left_handed", "touch_layout", ["right", "left"], ["settings.off", "settings.on"])
	_slider(v, "settings.touch_size", "touch_scale", 0.7, 1.4)
	_slider(v, "settings.touch_opacity", "touch_opacity", 0.3, 1.0)
	var back := UiTheme.button(Loc.t("setup.back"), 150)
	back.pressed.connect(_close)
	v.add_child(back)
	await get_tree().process_frame
	position = ((get_parent_area_size() - size) * 0.5).round()
	(v.get_child(1).get_child(1) as Control).grab_focus()


func _row(v: VBoxContainer, key: String) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	var l := UiTheme.label(Loc.t(key), 8)
	l.custom_minimum_size.x = 150
	h.add_child(l)
	v.add_child(h)
	return h


func _slider(v: VBoxContainer, key: String, setting: String, lo: float = 0.0, hi: float = 1.0) -> void:
	var h := _row(v, key)
	var s := HSlider.new()
	s.min_value = lo
	s.max_value = hi
	s.step = 0.05
	s.value = float(Game.settings[setting])
	s.custom_minimum_size = Vector2(110, 12)
	s.value_changed.connect(func(val): Game.settings[setting] = val; Game.apply_audio(); Game.save_settings())
	h.add_child(s)


func _toggle(v: VBoxContainer, key: String, setting: String) -> void:
	var h := _row(v, key)
	var b := UiTheme.button(Loc.t("settings.on") if Game.settings[setting] else Loc.t("settings.off"), 110)
	b.pressed.connect(func():
		Game.settings[setting] = not Game.settings[setting]
		b.text = Loc.t("settings.on") if Game.settings[setting] else Loc.t("settings.off")
		Game.save_settings()
		Sfx.play("ui_select", Vector2.ZERO, -6.0))
	h.add_child(b)


func _cycle(v: VBoxContainer, key: String, setting: String, values: Array, labels: Array) -> void:
	var h := _row(v, key)
	var idx := values.find(Game.settings[setting])
	if idx < 0:
		idx = 0
	var b := UiTheme.button(Loc.t(labels[idx]), 110)
	b.pressed.connect(func():
		var i := (values.find(Game.settings[setting]) + 1) % values.size()
		Game.settings[setting] = values[i]
		b.text = Loc.t(labels[i])
		Game.save_settings()
		Sfx.play("ui_select", Vector2.ZERO, -6.0))
	h.add_child(b)


func _close() -> void:
	Game.save_settings()
	closed.emit()
	queue_free()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		_close()
		get_viewport().set_input_as_handled()
