extends Node
## Headless tests for the Académie Njangi screen:
##   godot --headless --path game res://tests/academy_tests.tscn
## Exits 0 when every assertion passes, 1 otherwise.

var passed := 0
var failed := 0


func _ready() -> void:
	await get_tree().process_frame
	await test_academy()
	print("Results: %d passed, %d failed" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)


func check(cond: bool, label: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		push_error("FAIL " + label)
		print("FAIL " + label)


func test_academy() -> void:
	# start from a clean slot so the done-toggle test is deterministic
	Game.save.remove("academy")
	var scene: PackedScene = load("res://scenes/academy.tscn")
	check(scene != null, "academy scene loads")
	var academy: Control = scene.instantiate()
	add_child(academy)
	await get_tree().process_frame
	await get_tree().process_frame
	check(academy.drills.size() == 64, "64 drills loaded (got %d)" % academy.drills.size())
	check(academy.list_view.visible and not academy.page_view.visible, "starts on the family list")
	check(academy.get_viewport().gui_get_focus_owner() != null, "something has focus on the list")
	var total := 0
	for f in academy.FAMILIES:
		academy.open_family(f)
		var arr: Array = academy.by_family[f]
		check(arr.size() > 0, "family %s has drills" % f)
		check(academy.drill_buttons.size() == arr.size(), "family %s lists %d drill buttons" % [f, arr.size()])
		check(academy.family_counts[f].text == "0/%d" % arr.size(), "family %s count label" % f)
		total += arr.size()
		for d in arr:
			var id: String = str(d["id"])
			check(academy.drill_buttons.has(id), "drill button for %s" % id)
			academy.open_drill(id)
			check(academy.page_view.visible, "%s page opens" % id)
			check(academy.current["id"] == id, "%s is current" % id)
			check(academy.diagram.player_count() > 0, "%s diagram has players" % id)
			check(academy._page_title.text != "", "%s title shown" % id)
			check(academy._page_text.get_child_count() >= 6, "%s page has text sections" % id)
			# a frame so the diagram actually draws (surfaces _draw errors as SCRIPT ERROR lines)
			await get_tree().process_frame
	check(total == 64, "families cover all 64 drills")
	# previous / next inside a family
	academy.open_drill("C01")
	check(academy._prev_button.disabled, "C01 has no previous")
	check(not academy._next_button.disabled, "C01 has a next")
	academy.next_drill(1)
	await get_tree().process_frame
	check(academy.current["id"] == "C02", "next drill from C01 is C02")
	academy.next_drill(-1)
	await get_tree().process_frame
	check(academy.current["id"] == "C01", "previous drill from C02 is C01")
	var last: Dictionary = academy.by_family["technique"].back()
	academy.open_drill(str(last["id"]))
	check(academy._next_button.disabled, "last technique drill has no next")
	# done toggle persists
	academy.open_drill("C01")
	check(not academy.is_done("C01"), "C01 not done at start")
	academy.toggle_done()
	check(academy.is_done("C01"), "C01 marked done")
	check(academy.done_button.text == Loc.t("acad.mark_undone"), "done button flips to 'not done'")
	var saved: Variant = Game.save.read("academy")
	check(typeof(saved) == TYPE_DICTIONARY and saved.get("done", []).has("C01"), "done persisted in slot academy")
	academy.back_to_list()
	await get_tree().process_frame
	await get_tree().process_frame
	check(academy.list_view.visible and not academy.page_view.visible, "back returns to the list")
	check(academy.family_counts["technique"].text == "1/14", "technique count shows 1/14")
	check(academy.drill_checks["C01"].checked, "C01 row shows the check mark")
	var focus := academy.get_viewport().gui_get_focus_owner()
	check(focus == academy.drill_buttons["C01"], "focus returns to the C01 row")
	# a fresh instance reads the saved state back
	academy.queue_free()
	await get_tree().process_frame
	var again: Control = scene.instantiate()
	add_child(again)
	await get_tree().process_frame
	check(again.is_done("C01"), "done state reloaded from save")
	again.open_drill("C01")
	again.toggle_done()
	check(not again.is_done("C01"), "toggle back to not done")
	var saved2: Variant = Game.save.read("academy")
	check(typeof(saved2) == TYPE_DICTIONARY and not saved2.get("done", []).has("C01"), "undone persisted")
	# strings exist in both languages
	for key in ["acad.title", "acad.mark_done", "acad.family.rondo", "acad.intent.fixer", "acad.skill.scan"]:
		check(Loc.t(key) != key, "string %s exists" % key)
	Loc.set_language("en")
	check(Loc.t("acad.title") == "Njangi Academy", "english academy title")
	Loc.set_language("fr")
	check(Loc.t("acad.title") == "Académie Njangi", "french academy title")
	again.queue_free()
	Game.save.remove("academy")
