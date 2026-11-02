extends Control
## Title screen: a live neighbourhood match plays behind the menu (CPU vs CPU), with the
## logo, the menu and the credits over it.

var menu: VBoxContainer
var attract: Match
var settings_panel: PanelContainer
var _lang_btn: Button


func _ready() -> void:
	theme = UiTheme.theme()
	Game.attract_mode = true
	_build_attract()
	_build_menu()
	Sfx.menu_music()
	Sfx.crowd(true, -16.0)
	Loc.language_changed.connect(func(_l): _rebuild_menu())
	Input.joy_connection_changed.connect(func(_d, _c): if is_inside_tree(): _rebuild_menu())


func _exit_tree() -> void:
	Game.attract_mode = false


func _build_attract() -> void:
	var saved := Game.match_config.duplicate(true)
	Game.match_config["home"] = "lionceaux_bonamoussadi"
	Game.match_config["away"] = "requins_bepanda"
	Game.match_config["stadium"] = "bonamoussadi_terre"
	Game.match_config["human_home"] = false
	Game.match_config["human_away"] = false
	Game.match_config["half_minutes"] = 20.0
	Game.match_config["difficulty"] = 2
	Game.match_config["weather"] = "dry"
	Game.match_config["competition"] = "street"
	var holder := SubViewportContainer.new()
	holder.set_anchors_preset(Control.PRESET_FULL_RECT)
	holder.stretch = true
	holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(holder)
	var vp := SubViewport.new()
	vp.size = Vector2i(640, 360)
	vp.canvas_item_default_texture_filter = Viewport.DEFAULT_CANVAS_ITEM_TEXTURE_FILTER_NEAREST
	vp.snap_2d_transforms_to_pixel = true
	holder.add_child(vp)
	var attract_node := Node2D.new()
	attract_node.set_script(load("res://football/match.gd"))
	attract_node.name = "Match"
	attract = attract_node
	var world := Node2D.new()
	world.name = "World"
	attract.add_child(world)
	var ys := Node2D.new()
	ys.name = "YSort"
	ys.y_sort_enabled = true
	world.add_child(ys)
	var fx := Node2D.new()
	fx.name = "FX"
	fx.z_index = 3
	world.add_child(fx)
	var cam := Camera2D.new()
	cam.name = "Cam"
	cam.set_script(load("res://football/match_camera.gd"))
	attract.add_child(cam)
	vp.add_child(attract)
	attract.commentary_enabled = false
	Game.match_config = saved
	# a warm dusk wash so the menu reads over the pitch
	var wash := ColorRect.new()
	wash.color = Color(0.08, 0.06, 0.05, 0.42)
	wash.set_anchors_preset(Control.PRESET_FULL_RECT)
	wash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(wash)


func _build_menu() -> void:
	menu = VBoxContainer.new()
	menu.add_theme_constant_override("separation", 3)
	add_child(menu)
	_rebuild_menu()


func _rebuild_menu() -> void:
	for c in menu.get_children():
		c.queue_free()
	var title := UiTheme.label(Loc.t("title"), 26, true, UiTheme.SUN)
	menu.add_child(title)
	var sub := UiTheme.label(Loc.t("subtitle"), 8, false, UiTheme.CREAM)
	menu.add_child(sub)
	var spacer := Control.new()
	spacer.custom_minimum_size.y = 2
	menu.add_child(spacer)
	var play := UiTheme.button(Loc.t("menu.play"), 190)
	play.pressed.connect(func(): Sfx.play("ui_select"); _clear_match_config(); get_tree().change_scene_to_file("res://scenes/setup.tscn"))
	menu.add_child(play)
	for entry in [["menu.story", "res://scenes/story.tscn"], ["menu.league", "res://scenes/league.tscn"], ["menu.cup", "res://scenes/cup.tscn"], ["menu.manager", "res://scenes/manager.tscn"], ["menu.academy", "res://scenes/academy.tscn"]]:
		var b := UiTheme.button(Loc.t(entry[0]), 190)
		var path: String = entry[1]
		if ResourceLoader.exists(path):
			b.pressed.connect(func(): Sfx.play("ui_select"); _clear_match_config(); get_tree().change_scene_to_file(path))
		else:
			b.text = "%s  (%s)" % [Loc.t(entry[0]), Loc.t("menu.soon")]
			b.disabled = true
			b.focus_mode = Control.FOCUS_NONE
		menu.add_child(b)
	var settings := UiTheme.button(Loc.t("menu.settings"), 190)
	settings.pressed.connect(_open_settings)
	menu.add_child(settings)
	_lang_btn = UiTheme.button(Loc.t("menu.language"), 190)
	_lang_btn.pressed.connect(func(): Loc.toggle(); Game.save_settings())
	menu.add_child(_lang_btn)
	if not OS.has_feature("web"):
		var quit := UiTheme.button(Loc.t("menu.quit"), 190)
		quit.pressed.connect(func(): get_tree().quit())
		menu.add_child(quit)
	var pad := Game.pad_name()
	var pad_line := UiTheme.label(Loc.t("title.pad", {"name": pad}) if pad != "" else Loc.t("title.no_pad"), 8, false, Color(UiTheme.SUN, 0.9) if pad != "" else Color(UiTheme.CREAM, 0.5))
	pad_line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	pad_line.custom_minimum_size.x = 190
	menu.add_child(pad_line)
	var credits := UiTheme.label(Loc.t("credits"), 8, false, Color(UiTheme.CREAM, 0.6))
	credits.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	credits.custom_minimum_size.x = 190
	menu.add_child(credits)
	for b in menu.get_children():
		if b is Button:
			b.focus_entered.connect(func(): Sfx.play("ui_move", Vector2.ZERO, -6.0))
	await get_tree().process_frame
	menu.position = Vector2(26, 12)
	play.grab_focus()


## Friendly / campaign configs must not leak into each other.
func _clear_match_config() -> void:
	Game.match_config.erase("return_to")
	Game.match_config["label"] = ""
	Game.pending = {}


func _watch() -> void:
	Sfx.play("ui_select")
	_clear_match_config()
	Game.match_config["human_home"] = false
	Game.match_config["human_away"] = false
	Game.match_config["half_minutes"] = 2.0
	get_tree().change_scene_to_file("res://scenes/match.tscn")


func _open_settings() -> void:
	Sfx.play("ui_select")
	if settings_panel != null:
		settings_panel.queue_free()
	settings_panel = SettingsPanel.new()
	add_child(settings_panel)
	settings_panel.closed.connect(func(): settings_panel = null; _rebuild_menu())
