extends Node
## Manager UI smoke test: instantiate the manager scene, start a career with a fixed seed,
## walk through every screen, play a few weeks and check nothing is empty. Run:
##   godot --headless --path game res://tests/manager_ui_tests.tscn
## Exits 0 when every check passes, 1 otherwise.

var passed := 0
var failed := 0
var ui: Control


func _ready() -> void:
	await get_tree().process_frame
	# the tests must not touch the real career save: redirect the save store to a scratch dir
	Game.save = SaveStore.new(Game.SAVE_VERSION, "user://test_saves_manager")
	Game.save.remove("manager")
	# headless windows are 64x64 (the visible rect becomes 640x640): pin the scene to 640x360
	var frame := Control.new()
	frame.size = Vector2(640, 360)
	add_child(frame)
	var packed: PackedScene = load("res://scenes/manager.tscn")
	ui = packed.instantiate()
	frame.add_child(ui)
	await get_tree().process_frame
	await test_start_screen()
	await test_pick_screen()
	await test_hub()
	await test_plan_cycling()
	await test_sub_screens()
	await test_play_weeks()
	await test_save_and_continue()
	await test_season_end_report()
	print("Results: %d passed, %d failed" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)


func check(cond: bool, label: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		push_error("FAIL " + label)
		print("FAIL " + label)


func _labels(node: Node = null) -> Array:
	if node == null:
		node = ui.root
	var out := []
	if node is Label and (node as Label).text.strip_edges() != "":
		out.append(node)
	for c in node.get_children():
		out += _labels(c)
	return out


func _buttons(node: Node = null) -> Array:
	if node == null:
		node = ui.root
	var out := []
	if node is Button:
		out.append(node)
	for c in node.get_children():
		out += _buttons(c)
	return out


func _texts() -> String:
	var parts := []
	for l in _labels():
		parts.append((l as Label).text)
	for b in _buttons():
		parts.append((b as Button).text)
	return "\n".join(parts)


func _check_screen(name: String, min_labels: int, min_buttons: int) -> void:
	check(ui.screen == name, "screen is " + name)
	var nl := _labels().size()
	var nb := _buttons().size()
	check(nl >= min_labels, "%s has at least %d labels (%d)" % [name, min_labels, nl])
	check(nb >= min_buttons, "%s has at least %d buttons (%d)" % [name, min_buttons, nb])
	await get_tree().process_frame
	var focus := get_viewport().gui_get_focus_owner()
	check(focus != null and focus is Button, "%s focuses a button" % name)
	check(ui.size == Vector2(640, 360), "%s scene is 640x360 (%s)" % [name, str(ui.size)])
	# no label or button may spill outside the 640x360 frame (rows inside a scroll list are clipped)
	for l in _labels():
		if _in_scroll(l):
			continue
		var r: Rect2 = (l as Label).get_global_rect()
		check(r.position.x >= 0.0 and r.end.x <= 640.5 and r.position.y >= 0.0 and r.end.y <= 360.5, "%s label inside viewport: '%s' %s" % [name, (l as Label).text.left(24), str(r)])
	for b in _buttons():
		if _in_scroll(b):
			continue
		var r: Rect2 = (b as Button).get_global_rect()
		check(r.end.x <= 640.5 and r.end.y <= 360.5, "%s button inside viewport: '%s' %s" % [name, (b as Button).text, str(r)])
	for sc in _scrolls():
		var r: Rect2 = (sc as Control).get_global_rect()
		check(r.end.x <= 640.5 and r.end.y <= 360.5, "%s scroll list inside viewport %s" % [name, str(r)])


func _in_scroll(n: Node) -> bool:
	var p := n.get_parent()
	while p != null and p != ui.root:
		if p is ScrollContainer:
			return true
		p = p.get_parent()
	return false


func _scrolls(node: Node = null) -> Array:
	if node == null:
		node = ui.root
	var out := []
	if node is ScrollContainer:
		out.append(node)
	for c in node.get_children():
		out += _scrolls(c)
	return out


func test_start_screen() -> void:
	await _check_screen("start", 2, 2)
	check(not _texts().contains(Loc.t("mgr.continue")), "no continue button without a save")
	check(_texts().contains(Loc.t("mgr.new_career")), "new career button present")


func test_pick_screen() -> void:
	ui.show_screen("pick")
	await _check_screen("pick", 3, 4)
	check(ui.l3_clubs.size() >= 8, "Ligue 3 clubs listed (%d)" % ui.l3_clubs.size())
	var before := _texts()
	ui.club_i = posmod(ui.club_i + 1, ui.l3_clubs.size())
	ui.show_screen("pick")
	check(_texts() != before, "club selector changes the shown club")
	var nm: String = ui.career.clubs[ui.l3_clubs[ui.club_i]]["name"]
	check(_texts().contains(nm), "pick shows the club name " + nm)


func test_hub() -> void:
	ui.new_career("lionceaux_bonamoussadi", 7)
	await _check_screen("hub", 10, 12)
	var t := _texts()
	check(t.contains(ui.career.club_name("lionceaux_bonamoussadi")), "hub shows the club name")
	check(t.contains(Loc.t("mgr.division", {"n": 3})), "hub shows Ligue 3")
	check(t.contains("k FCFA"), "hub shows the budget")
	check(t.contains(Loc.t("mgr.play_week")), "hub has Play the week")
	check(t.contains(Loc.t("mgr.auto_plan")), "hub has the auto plan button")
	check(t.contains("Njangi"), "hub has the Njangi tip")
	check(ui._plan_rows.size() == 4, "hub has four plan rows")
	for row in ui._plan_rows:
		check(row["title"].text.length() > 3, "plan row has a drill title: " + row["title"].text)
		check(row["sub"].text.length() > 3, "plan row has intensity and intentions: " + row["sub"].text)
	var fx: Dictionary = ui.career.our_fixture(1)
	var opp: String = fx["away"] if fx["home"] == "lionceaux_bonamoussadi" else fx["home"]
	check(t.contains(ui.career.club_name(opp)), "hub shows the next opponent")


func test_plan_cycling() -> void:
	var before: Array = ui.career.state["plan"].duplicate()
	ui.cycle_drill(4, 1)
	var after: Array = ui.career.state["plan"]
	check(after[0] != before[0], "cycling MD-4 changes the first drill")
	check(ui.career.drills_for_session(4).has(after[0]), "cycled drill belongs to the MD-4 pool")
	check(ui._plan_rows[0]["title"].text.contains(after[0]), "plan row label updated to " + after[0])
	ui.cycle_drill(4, -1)
	check(ui.career.state["plan"][0] == before[0], "cycling back restores the drill")
	ui.cycle_drill(1, 1)
	check(ui.career.drills_for_session(1).has(ui.career.state["plan"][3]), "MD-1 drill belongs to the MD-1 pool")
	ui.auto_plan()
	check(ui.career.state["plan"].size() == 4, "auto plan fills four slots")


func test_sub_screens() -> void:
	ui.show_screen("squad")
	await _check_screen("squad", 20, 17)
	check(_texts().contains("*"), "squad marks the starting eleven")
	# select the first player and check the skill bars appear
	var first: Dictionary = ui.career.state["squad"][0]
	ui.selected_pid = first["id"]
	ui._fill_player_panel()
	check(_texts().contains(ui.career.player_name(first)), "selected player shown in the skill panel")
	check(_texts().contains(Loc.t("mgr.skill.passe")), "skill bars listed")
	check(_texts().contains(Loc.t("mgr.release")), "release button offered with 16 players")
	var n_before: int = ui.career.state["squad"].size()
	check(ui.career.release_player(first["id"]), "release works")
	check(ui.career.state["squad"].size() == n_before - 1, "squad shrinks after release")
	ui.show_screen("table")
	await _check_screen("table", 30, 1)
	check(_texts().contains(ui.career.club_name("lionceaux_bonamoussadi")), "table lists our club")
	check(_texts().contains(Loc.t("mgr.hist.none")), "table shows empty history line")
	ui.show_screen("market")
	await _check_screen("market", 6, 6)
	var t := _texts()
	check(t.contains(Loc.t("mgr.sign")), "market has Sign buttons")
	check(t.contains(Loc.t("mgr.upgrade", {"n": Career.FACILITY_COST[1]})), "market has the upgrade button with its cost")
	# signing with too little money shows a status, not a crash
	var budget0: int = int(ui.career.state["budget"])
	ui.career.state["budget"] = 0
	ui._sign(0)
	check(ui._status != null and ui._status.text == Loc.t("mgr.too_poor"), "sign with no money shows a message")
	ui.career.state["budget"] = budget0 + 100000
	var market_n: int = ui.career.state["market"].size()
	ui._sign(0)
	check(ui.career.state["market"].size() == market_n - 1, "sign works with money")
	check(ui.screen == "market", "market rebuilt after signing")
	ui._upgrade()
	check(int(ui.career.state["facilities"]) == 2, "facilities upgraded")
	ui.career.state["budget"] = budget0
	ui.show_screen("hub")
	await _check_screen("hub", 10, 12)


func test_play_weeks() -> void:
	for i in range(3):
		var week: int = int(ui.career.state["week"])
		ui.play_week()
		await _check_screen("report", 12, 1)
		var t := _texts()
		check(t.contains(Loc.t("mgr.report", {"w": week})), "report is for week %d" % week)
		check(t.contains(Loc.t("mgr.indice")), "report has the Indice panel")
		var total: float = float(ui.report["match"]["indice"]["total"])
		check(t.contains("%.1f" % total), "report shows the Indice total %.1f" % total)
		check(t.contains(Loc.t("mgr.band.%d" % Njangi.band(total))), "report shows the band label")
		for k in Njangi.SUBS:
			check(t.contains(Loc.t("mgr.sub." + k)), "report lists sub-index " + k)
		check(t.contains(Loc.t("mgr.training")), "report has training")
		check(t.contains(" - "), "report has a score line")
		check(t.contains(Loc.t("mgr.continue")), "report has Continue")
		var bars := 0
		for c in _color_rects():
			bars += 1
		check(bars >= 10, "report draws the five bars (%d rects)" % bars)
		ui._leave_report()
		await _check_screen("hub", 10, 12)
	check(int(ui.career.state["week"]) == 4, "three weeks played")


func _color_rects(node: Node = null) -> Array:
	if node == null:
		node = ui.root
	var out := []
	if node is ColorRect:
		out.append(node)
	for c in node.get_children():
		out += _color_rects(c)
	return out


func test_save_and_continue() -> void:
	ui.save_career()
	check(Career.has_save(), "career saved")
	var week: int = int(ui.career.state["week"])
	ui.show_screen("start")
	await _check_screen("start", 2, 3)
	check(_texts().contains(Loc.t("mgr.continue")), "continue button shown with a save")
	check(ui.continue_career(), "continue loads the save")
	await _check_screen("hub", 10, 12)
	check(int(ui.career.state["week"]) == week, "loaded career is at the same week")
	ui.show_screen("squad")
	await _check_screen("squad", 20, 16)
	check(not _texts().contains(".0 "), "no float-formatted integers in the squad list after reload")
	ui.show_screen("table")
	await _check_screen("table", 30, 1)
	ui.show_screen("market")
	await _check_screen("market", 6, 4)
	Game.save.remove("manager")


func test_season_end_report() -> void:
	# play to the end of the season and check the summary
	var total: int = ui.career.season_weeks()
	while int(ui.career.state["season"]) == 1 and int(ui.career.state["week"]) <= total:
		ui.play_week()
		if ui.report.has("season_end"):
			break
	check(ui.report.has("season_end"), "season end reached")
	await _check_screen("report", 14, 1)
	var t := _texts()
	check(t.contains(Loc.t("mgr.season_end", {"n": 1})), "season summary shown")
	check(t.contains(Loc.t("mgr.new_season")), "New season button shown")
	check(t.contains(Loc.t("mgr.se.youth", {"names": ""}).left(6)), "youth arrivals listed")
	ui._leave_report()
	await _check_screen("hub", 10, 12)
	check(int(ui.career.state["season"]) == 2, "season 2 started")
	ui.show_screen("table")
	await _check_screen("table", 30, 1)
	check(_texts().contains("S1 "), "history lists season 1")
