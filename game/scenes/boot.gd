extends Control
## Boot: the dedication screen, then the title. In QA mode it jumps straight to the match.

var _t: float = 0.0
var _done := false


func _ready() -> void:
	if Game.qa_mode:
		call_deferred("_go_match")
		return
	theme = UiTheme.theme()
	var bg := ColorRect.new()
	bg.color = UiTheme.NIGHT
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_CENTER)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 10)
	add_child(v)
	var ball := TextureRect.new()
	ball.texture = _ball_tex()
	ball.stretch_mode = TextureRect.STRETCH_KEEP_CENTERED
	v.add_child(ball)
	var l1 := UiTheme.label(Loc.t("dedication.1"), 10, true, UiTheme.SUN)
	l1.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(l1)
	var l2 := UiTheme.label(Loc.t("dedication.2"), 8, false, UiTheme.CREAM)
	l2.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l2.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l2.custom_minimum_size.x = 380
	v.add_child(l2)
	modulate.a = 0.0
	await get_tree().process_frame
	v.position = ((size - v.size) * 0.5).round()
	var tw := create_tween()
	tw.tween_property(self, "modulate:a", 1.0, 0.9)


func _ball_tex() -> Texture2D:
	var at := AtlasTexture.new()
	at.atlas = load("res://assets/fx/ball.png")
	at.region = Rect2(0, 0, 8, 8)
	var img := at.get_image()
	img.resize(32, 32, Image.INTERPOLATE_NEAREST)
	return ImageTexture.create_from_image(img)


func _process(delta: float) -> void:
	_t += delta
	if _t > 4.2 and not _done:
		_go_title()


func _unhandled_input(event: InputEvent) -> void:
	if _t > 0.6 and (event.is_action_pressed("ui_accept") or event is InputEventScreenTouch or (event is InputEventMouseButton and event.pressed)):
		_go_title()


func _go_title() -> void:
	if _done:
		return
	_done = true
	var tw := create_tween()
	tw.tween_property(self, "modulate:a", 0.0, 0.4)
	tw.tween_callback(func(): get_tree().change_scene_to_file("res://scenes/title.tscn"))


func _go_match() -> void:
	get_tree().change_scene_to_file("res://scenes/match.tscn")
