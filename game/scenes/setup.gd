extends Control
## Friendly match setup: teams, ground, half length, difficulty, weather, who you play.

var home_i := 0
var away_i := 1
var stadium_i := 0
var half_i := 1
var diff_i := 2
var weather_i := 0
var you_i := 0
const HALVES := [2.0, 3.0, 5.0, 8.0]
var labels: Dictionary = {}
var teams: Array = []
var stadiums: Array = []
var preview: Control


func _ready() -> void:
	theme = UiTheme.theme()
	teams = Content.team_index
	stadiums = Content.stadium_index
	diff_i = int(Game.match_config.get("difficulty", 2))
	var bg := ColorRect.new()
	bg.color = UiTheme.NIGHT
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var ground := TextureRect.new()
	ground.texture = load("res://assets/stadium/ground_terre.png")
	ground.set_anchors_preset(Control.PRESET_FULL_RECT)
	ground.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	ground.modulate = Color(0.55, 0.5, 0.48)
	add_child(ground)
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 5)
	panel.add_child(v)
	var title := UiTheme.label(Loc.t("setup.title"), 12, true, UiTheme.SUN)
	v.add_child(title)
	_row(v, "setup.home", "home")
	_row(v, "setup.away", "away")
	_row(v, "setup.stadium", "stadium")
	_row(v, "setup.half", "half")
	_row(v, "setup.difficulty", "diff")
	_row(v, "setup.weather", "weather")
	_row(v, "setup.you", "you")
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(h)
	var back := UiTheme.button(Loc.t("setup.back"), 110)
	back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/title.tscn"))
	h.add_child(back)
	var go := UiTheme.button(Loc.t("setup.kickoff"), 150)
	go.pressed.connect(_start)
	h.add_child(go)
	_refresh()
	await get_tree().process_frame
	panel.position = ((size - panel.size) * 0.5).round()
	go.grab_focus()


func _row(v: VBoxContainer, key: String, id: String) -> void:
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
	v.add_child(h)


func _change(id: String, d: int) -> void:
	Sfx.play("ui_move", Vector2.ZERO, -6.0)
	match id:
		"home":
			home_i = posmod(home_i + d, teams.size())
			if home_i == away_i:
				away_i = posmod(away_i + d, teams.size())
			stadium_i = _stadium_of(teams[home_i]["stadium"])
		"away":
			away_i = posmod(away_i + d, teams.size())
			if away_i == home_i:
				home_i = posmod(home_i + d, teams.size())
		"stadium":
			stadium_i = posmod(stadium_i + d, stadiums.size())
		"half":
			half_i = posmod(half_i + d, HALVES.size())
		"diff":
			diff_i = posmod(diff_i + d, 5)
		"weather":
			weather_i = posmod(weather_i + d, 2)
		"you":
			you_i = posmod(you_i + d, 3)
	_refresh()


func _stadium_of(id: String) -> int:
	for i in range(stadiums.size()):
		if stadiums[i]["id"] == id:
			return i
	return 0


func _refresh() -> void:
	labels["home"].text = "%s (%s)" % [teams[home_i]["name"], teams[home_i]["neighborhood"]]
	labels["away"].text = "%s (%s)" % [teams[away_i]["name"], teams[away_i]["neighborhood"]]
	var s: Dictionary = stadiums[stadium_i]
	labels["stadium"].text = "%s, %s" % [Loc.field(s, "name"), s["city"]]
	labels["half"].text = Loc.t("setup.minutes", {"n": int(HALVES[half_i])})
	labels["diff"].text = Loc.t(Game.difficulty_name(diff_i))
	labels["weather"].text = Loc.t("setup.dry" if weather_i == 0 else "setup.rain")
	labels["you"].text = [teams[home_i]["short"], teams[away_i]["short"], "CPU vs CPU"][you_i]


func _start() -> void:
	Sfx.play("ui_select")
	var c := Game.match_config
	c["home"] = teams[home_i]["id"]
	c["away"] = teams[away_i]["id"]
	c["stadium"] = stadiums[stadium_i]["id"]
	c["half_minutes"] = HALVES[half_i]
	c["difficulty"] = diff_i
	c["weather"] = "dry" if weather_i == 0 else "rain"
	c["human_home"] = you_i == 0
	c["human_away"] = you_i == 1
	c["competition"] = "friendly"
	get_tree().change_scene_to_file("res://scenes/match.tscn")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_tree().change_scene_to_file("res://scenes/title.tscn")
