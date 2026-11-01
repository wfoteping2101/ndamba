extends Control
## "Les Lionceaux" story campaign: chapter list on the left, the chapter page on the right.

var story: Story
var root: HBoxContainer
var panel: PanelContainer
var page: VBoxContainer
var selected := 0
var chapter_buttons: Array = []
var just_played := -1
var just_ok := false


func _ready() -> void:
	theme = UiTheme.theme()
	story = Story.new()
	story.load_game()
	_consume_result()
	var bg := ColorRect.new()
	bg.color = UiTheme.NIGHT
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var ground := TextureRect.new()
	ground.texture = load("res://assets/stadium/ground_terre.png")
	ground.set_anchors_preset(Control.PRESET_FULL_RECT)
	ground.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	ground.modulate = Color(0.5, 0.46, 0.44)
	add_child(ground)
	panel = PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	panel.add_child(v)
	var title := UiTheme.label(Loc.t("menu.story"), 12, true, UiTheme.SUN)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(title)
	root = HBoxContainer.new()
	root.add_theme_constant_override("separation", 12)
	v.add_child(root)
	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation", 2)
	root.add_child(list)
	for i in range(Story.CHAPTERS.size()):
		var b := UiTheme.button("", 180)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.pressed.connect(func(): _select(i))
		list.add_child(b)
		chapter_buttons.append(b)
	var back := UiTheme.button(Loc.t("setup.back"), 180)
	back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/title.tscn"))
	list.add_child(back)
	page = VBoxContainer.new()
	page.add_theme_constant_override("separation", 3)
	page.custom_minimum_size.x = 300
	root.add_child(page)
	selected = just_played if just_played >= 0 else mini(story.unlocked(), Story.CHAPTERS.size() - 1)
	_refresh_list()
	_select(selected)


func _consume_result() -> void:
	var p: Dictionary = Game.pending
	if p.is_empty() or p.get("kind", "") != "story":
		return
	var r: Dictionary = Game.last_result
	if r.is_empty() or r.get("home", "") != p.get("home", "") or r.get("away", "") != p.get("away", ""):
		return
	just_played = int(p["chapter"])
	just_ok = story.judge(just_played, r)
	Game.pending = {}


func _refresh_list() -> void:
	for i in range(chapter_buttons.size()):
		var b: Button = chapter_buttons[i]
		var done: bool = story.result_of(i).get("ok", false)
		var locked: bool = i > story.unlocked()
		var mark := "v " if done else ("  " if not locked else "x ")
		b.text = "%s%d. %s" % [mark, i + 1, Loc.t("story.title%d" % (i + 1))]
		b.disabled = locked
		b.focus_mode = Control.FOCUS_NONE if locked else Control.FOCUS_ALL


func _select(i: int) -> void:
	selected = i
	for c in page.get_children():
		c.queue_free()
	var ch := story.chapter(i)
	var head := UiTheme.label("%s  ·  %s" % [Loc.t("story.chapter_n", {"n": i + 1}), Loc.t("story.title%d" % (i + 1))], 8, true, UiTheme.SUN)
	page.add_child(head)
	var text := UiTheme.label(Loc.t("story.text%d" % (i + 1)), 8, false, UiTheme.CREAM)
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text.custom_minimum_size.x = 300
	page.add_child(text)
	var lesson := UiTheme.label(Loc.t("story.lesson") + " " + Loc.t(ch["lesson"]), 8, false, UiTheme.SUN)
	lesson.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lesson.custom_minimum_size.x = 300
	page.add_child(lesson)
	var opp := Content.team(ch["opp"])
	var st := Content.stadium(ch["stadium"])
	var cond := UiTheme.label("%s %s  ·  %s  ·  %s  ·  %s" % [Loc.t("intro.vs"), opp.get("name", ""), Loc.field(st, "name"), ch["format"], Loc.t("setup.rain" if ch["weather"] == "rain" else "setup.dry")], 8, false, Color(UiTheme.CREAM, 0.75))
	cond.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	cond.custom_minimum_size.x = 300
	page.add_child(cond)
	page.add_child(UiTheme.label(Loc.t("story.objective") + " " + Loc.t("story.obj_" + ch["objective"]), 8, false, UiTheme.CREAM))
	var res := story.result_of(i)
	if not res.is_empty():
		var sc: Array = res["score"]
		var line := "%s  %d - %d" % [Loc.t("story.last_result"), sc[0], sc[1]]
		if res["pens"].size() == 2:
			line += "  (%d-%d tab)" % [res["pens"][0], res["pens"][1]]
		line += "   " + (Loc.t("story.done") if res["ok"] else Loc.t("story.retry"))
		page.add_child(UiTheme.label(line, 8, true, UiTheme.SUN if res["ok"] else UiTheme.CLAY))
	# options: half length and difficulty for the story
	var opts := HBoxContainer.new()
	opts.add_theme_constant_override("separation", 6)
	page.add_child(opts)
	var half_b := UiTheme.button("%s: %d min" % [Loc.t("setup.half"), int(Game.settings.get("story_half", 3.0))], 120)
	half_b.pressed.connect(func():
		var h: float = float(Game.settings.get("story_half", 3.0))
		h = 2.0 if h >= 4.0 else h + 1.0
		Game.settings["story_half"] = h
		Game.save_settings()
		half_b.text = "%s: %d min" % [Loc.t("setup.half"), int(h)])
	opts.add_child(half_b)
	var diff_b := UiTheme.button(Loc.t(Game.difficulty_name(int(Game.settings.get("story_difficulty", 1)))), 120)
	diff_b.pressed.connect(func():
		var d: int = (int(Game.settings.get("story_difficulty", 1)) + 1) % 5
		Game.settings["story_difficulty"] = d
		Game.save_settings()
		diff_b.text = Loc.t(Game.difficulty_name(d)))
	opts.add_child(diff_b)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	page.add_child(h)
	var locked: bool = i > story.unlocked()
	var play := UiTheme.button(Loc.t("story.play"), 150)
	play.disabled = locked
	play.pressed.connect(func(): _play(i))
	h.add_child(play)
	if story.completed():
		var fin := UiTheme.label(Loc.t("story.complete"), 8, true, UiTheme.SUN)
		page.add_child(fin)
	await get_tree().process_frame
	panel.position = ((size - panel.size) * 0.5).round()
	if not locked:
		play.grab_focus()
	else:
		chapter_buttons[mini(i, story.unlocked())].grab_focus()


func _play(i: int) -> void:
	Sfx.play("ui_select")
	story.configure_match(i, scene_file_path)
	get_tree().change_scene_to_file("res://scenes/match.tscn")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_tree().change_scene_to_file("res://scenes/title.tscn")
