extends Node
## Headless test runner (a scene, so the autoloads are available):
##   godot --headless --path game --import
##   godot --headless --path game res://tests/run_tests.tscn
## Exits 0 when every assertion passes, 1 otherwise.

var passed := 0
var failed := 0


func _ready() -> void:
	await get_tree().process_frame
	test_content_loaded()
	test_save_round_trip()
	test_ball_rolls_and_stops()
	test_ball_bounces()
	test_ball_post_collision()
	test_formation_slots()
	test_ai_profiles()
	await test_match_builds()
	await test_goal_detection()
	await test_out_of_bounds()
	await test_ai_vs_ai_match()
	await test_human_controls()
	print("Results: %d passed, %d failed" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)


func check(cond: bool, label: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		push_error("FAIL " + label)
		print("FAIL " + label)


func test_content_loaded() -> void:
	check(Content.teams.size() >= 4, "at least 4 teams loaded")
	check(Content.stadiums.size() >= 4, "at least 4 stadiums loaded")
	for id in Content.teams.keys():
		var t: Dictionary = Content.teams[id]
		check(t["players"].size() >= 8, "%s has 8 players" % id)
		check(t["lineup"].size() == 5, "%s lineup has 5" % id)
		var ids := {}
		for p in t["players"]:
			check(not ids.has(p["id"]), "%s unique player id %s" % [id, p["id"]])
			ids[p["id"]] = true
			for k in ["spd", "acc", "ctl", "pas", "sho", "tak", "pos", "sta", "tmw", "vis", "gk"]:
				check(p["attrs"].has(k), "%s attr %s" % [p["id"], k])
	check(Content.surface("sand")["roll"] > Content.surface("grass")["roll"], "sand slows the ball more than grass")
	check(Loc.t("hud.goal") != "hud.goal", "strings loaded")
	Loc.set_language("en")
	check(Loc.t("menu.play") == "Friendly match", "english strings")
	Loc.set_language("fr")
	check(Loc.t("menu.play") == "Match amical", "french strings")


func test_save_round_trip() -> void:
	var s := SaveStore.new(1, "user://test_saves")
	check(s.write("a", {"level": 3}) == OK, "save write")
	check(s.read("a") == {"level": 3}, "save round trip")
	check(s.read("missing") == null, "missing slot is null")
	var f := FileAccess.open("user://test_saves/bad.json", FileAccess.WRITE)
	f.store_string("{not json")
	f.close()
	check(s.read("bad") == null, "corrupt save ignored")


func _ball() -> Ball:
	var b := Ball.new()
	add_child(b)
	b.set_surface(Content.surface("terre"))
	return b


func test_ball_rolls_and_stops() -> void:
	var b := _ball()
	b.place(Vector2(100, 100))
	b.kick(Vector2.RIGHT, 300.0, 0.0)
	var t := 0.0
	while b.vel.length() > 0.0 and t < 10.0:
		b.step(1.0 / 60.0, [])
		t += 1.0 / 60.0
	check(b.vel == Vector2.ZERO, "ball stops")
	check(b.pos.x > 150.0 and b.pos.x < 420.0, "300 px/s pass travels a sensible distance (%.0f px)" % (b.pos.x - 100.0))
	check(t < 6.0, "ball stops within 6 s")
	var pred := b.predict(0.5)
	check(pred.distance_to(b.pos) < 1.0, "prediction of a resting ball")
	b.queue_free()


func test_ball_bounces() -> void:
	var b := _ball()
	b.place(Vector2(100, 100))
	b.kick(Vector2.RIGHT, 100.0, 60.0)
	var st := {"bounces": 0}
	b.bounced.connect(func(_s): st["bounces"] += 1)
	var max_h := 0.0
	for i in range(600):
		b.step(1.0 / 60.0, [])
		max_h = maxf(max_h, b.h)
	check(st["bounces"] >= 1, "a lofted ball bounces (%d)" % st["bounces"])
	check(max_h > 15.0 and max_h < 40.0, "apex height plausible (%.1f px)" % max_h)
	check(b.h == 0.0, "ball ends on the ground")
	b.queue_free()


func test_ball_post_collision() -> void:
	var b := _ball()
	b.place(Vector2(100, 100))
	b.kick(Vector2.RIGHT, 300.0, 0.0)
	var st := {"hit": false}
	b.hit_post.connect(func(): st["hit"] = true)
	var posts := [[Vector2(140, 100), 1.6, 17.0]]
	for i in range(120):
		b.step(1.0 / 60.0, posts)
	check(st["hit"], "ball hits the post")
	check(b.pos.x < 140.0, "ball bounces back off the post")
	b.queue_free()


func test_formation_slots() -> void:
	var s := Team.formation_slots("1-2-1-1")
	check(s.size() == 5, "1-2-1-1 has 5 slots")
	check(s[0]["role"] == "GK" and s[4]["role"] == "FWD", "roles in order")
	var s2 := Team.formation_slots("1-1-1-2")
	check(s2.size() == 5 and s2[3]["role"] == "FWD" and s2[4]["role"] == "FWD", "1-1-1-2 two forwards")


func test_ai_profiles() -> void:
	var a := AiBrain.profile_for(0)
	var e := AiBrain.profile_for(4)
	check(a["reaction"] > e["reaction"], "expert reacts faster than beginner")
	check(a["noise"] > e["noise"], "expert aims better than beginner")
	check(e["speed"] <= 1.08, "expert never cheats on speed beyond 8%")


func _new_match(home := "lionceaux_bonamoussadi", away := "requins_bepanda", half := 0.25) -> Match:
	Game.match_config["home"] = home
	Game.match_config["away"] = away
	Game.match_config["stadium"] = "bonamoussadi_terre"
	Game.match_config["human_home"] = false
	Game.match_config["human_away"] = false
	Game.match_config["half_minutes"] = half
	Game.match_config["difficulty"] = 2
	Game.qa_mode = true   # skips intro/celebration waits
	var packed: PackedScene = load("res://scenes/match.tscn")
	var inst = packed.instantiate()
	add_child(inst)
	await get_tree().process_frame
	return inst.get_node("Match") as Match


func test_match_builds() -> void:
	var m := await _new_match()
	check(m.teams.size() == 2, "two teams")
	check(m.teams[0].players.size() == 5 and m.teams[1].players.size() == 5, "5v5")
	check(m.teams[0].keeper != null and m.teams[1].keeper != null, "both keepers present")
	check(m.goal_center(0, false) == m.goal_right, "home attacks right in the first half")
	for p in m.all_players():
		check(p.sprite != null and p.sprite.sprite_frames.has_animation("run_S"), "%s has animations" % p.name)
		check(m.pitch_rect.grow(4.0).has_point(p.pos), "%s starts on the pitch" % p.name)
	m.get_parent().queue_free()
	await get_tree().process_frame


func test_goal_detection() -> void:
	var m := await _new_match()
	# force play, shoot the ball into the right goal
	m._enter_phase(Match.Phase.PLAY)
	m.ball_in_play = true
	for p in m.all_players():
		p.teleport(Vector2(300, 60))   # park everybody out of the way
		p.brain = null
	m.ball.place(Vector2(m.goal_right.x - 30, m.goal_right.y))
	m.ball.kick(Vector2.RIGHT, 300.0, 0.0)
	var st := {"scored": false, "scored2": false}
	m.score_changed.connect(func(h, a): st["scored"] = (h == 1 and a == 0))
	for i in range(90):
		m._physics_process(1.0 / 60.0)
	check(st["scored"], "a shot into the right goal counts for the home team")
	check(m.phase == Match.Phase.GOAL or m.phase == Match.Phase.KICKOFF, "goal phase entered")
	# a shot over the bar is not a goal
	m._enter_phase(Match.Phase.PLAY)
	m.teams[0].score = 0
	m.ball.place(Vector2(m.goal_right.x - 30, m.goal_right.y), 30.0)
	m.ball.kick(Vector2.RIGHT, 300.0, 10.0)
	st["scored"] = false
	m.score_changed.connect(func(h, a): st["scored2"] = true)
	for i in range(30):
		m._physics_process(1.0 / 60.0)
	check(not st["scored2"], "a ball above the crossbar is not a goal")
	m.get_parent().queue_free()
	await get_tree().process_frame


func test_out_of_bounds() -> void:
	var m := await _new_match()
	m._enter_phase(Match.Phase.PLAY)
	m.ball_in_play = true
	for p in m.all_players():
		p.teleport(Vector2(300, 60))
		p.brain = null
	m.ball.place(Vector2(400, m.pitch_rect.position.y + 10))
	m.ball.last_touch_team = 0
	m.ball.kick(Vector2.UP, 200.0, 0.0)
	var st := {"kind": ""}
	m.event.connect(func(k, _t, _team):
		if st["kind"] == "":
			st["kind"] = k)
	for i in range(60):
		m._physics_process(1.0 / 60.0)
	check(st["kind"] == "out", "ball over the touchline gives a kick-in (%s)" % st["kind"])
	check(m.phase == Match.Phase.SETPIECE and m.setpiece["team"] == 1, "kick-in to the other team")
	m.get_parent().queue_free()
	await get_tree().process_frame


func test_ai_vs_ai_match() -> void:
	var m := await _new_match("mokolo_etoiles", "requins_bepanda", 0.5)
	var st := {"ended": false, "res": {}}
	m.match_ended.connect(func(r): st["ended"] = true; st["res"] = r)
	var steps := 0
	var max_steps := int(60.0 * 60.0 * 2.0)   # 2 minutes of simulated time max
	var ball_moved := 0.0
	var last := m.ball.pos
	var stuck := 0
	while not st["ended"] and steps < max_steps:
		m._physics_process(1.0 / 60.0)
		steps += 1
		if steps % 60 == 0:
			var d := m.ball.pos.distance_to(last)
			ball_moved += d
			if d < 2.0 and m.phase == Match.Phase.PLAY:
				stuck += 1
			last = m.ball.pos
	var ended: bool = st["ended"]
	var res: Dictionary = st["res"]
	check(ended, "AI vs AI match finishes (phase %s after %d steps)" % [Match.Phase.keys()[m.phase], steps])
	check(stuck < 6, "ball never stays still during play for long (%d stuck seconds)" % stuck)
	check(ball_moved > 500.0, "ball travels during the match (%.0f px)" % ball_moved)
	if ended:
		var s0: Dictionary = res["stats"][0]
		var s1: Dictionary = res["stats"][1]
		check(s0["passes"] + s1["passes"] >= 6, "teams pass the ball (%d)" % (s0["passes"] + s1["passes"]))
		check(res["score"][0] + res["score"][1] <= 12, "score is not absurd %s" % str(res["score"]))
		print("AI match: score %s, shots %d/%d, passes %d/%d, tackles %d/%d" % [str(res["score"]), s0["shots"], s1["shots"], s0["passes"], s1["passes"], s0["tackles"], s1["tackles"]])
	for p in m.all_players():
		check(m.pitch_rect.grow(40.0).has_point(p.pos), "%s stayed near the pitch" % p.name)
	m.get_parent().queue_free()
	await get_tree().process_frame


func _press(action: String, pressed: bool) -> void:
	var ev := InputEventAction.new()
	ev.action = action
	ev.pressed = pressed
	Input.parse_input_event(ev)
	if pressed:
		Input.action_press(action)
	else:
		Input.action_release(action)


func test_human_controls() -> void:
	Game.match_config["human_home"] = true
	var packed: PackedScene = load("res://scenes/match.tscn")
	var inst = packed.instantiate()
	add_child(inst)
	await get_tree().process_frame
	var m: Match = inst.get_node("Match")
	Game.match_config["human_home"] = false
	check(m.humans.has(0), "human controller attached to the home team")
	var hc: HumanController = m.humans[0]
	check(hc.current != null and not hc.current.is_keeper, "a field player is controlled")
	# kick-off: the human taker holds the ball; pressing pass kicks it
	for i in range(40):
		m._physics_process(1.0 / 60.0)
	var taker: Footballer = m.setpiece.get("taker")
	check(taker != null and taker.human_controlled and taker.has_ball, "human kick-off taker has the ball")
	_press("move_down", true)
	await get_tree().process_frame
	_press("pass", true)
	await get_tree().process_frame
	for i in range(30):
		m._physics_process(1.0 / 60.0)
	_press("pass", false)
	_press("move_down", false)
	await get_tree().process_frame
	check(m.phase == Match.Phase.PLAY, "pass at kick-off resumes play (phase %s)" % Match.Phase.keys()[m.phase])
	# movement: give the ball to the controlled player and run right for a second
	var p: Footballer = hc.current
	for q in m.all_players():
		q.brain = null if q.team_index == 1 else q.brain   # park the opponents
	for q in m.all_players():
		if q.team_index == 1:
			q.teleport(Vector2(560, 150))
	m.ball.place(p.pos + Vector2(6, 0))
	for i in range(5):
		m._physics_process(1.0 / 60.0)
	var x0 := p.pos.x
	_press("move_right", true)
	await get_tree().process_frame
	for i in range(60):
		m._physics_process(1.0 / 60.0)
	_press("move_right", false)
	await get_tree().process_frame
	check(p.pos.x > x0 + 50.0, "controlled player runs right (%.0f px)" % (p.pos.x - x0))
	check(p.has_ball or m.ball.owner_player == p, "controlled player dribbles the ball")
	# shooting: hold shoot, release, the ball leaves the feet fast toward the right goal
	p.teleport(Vector2(m.goal_right.x - 70, m.goal_right.y), Vector2.RIGHT)
	m.ball.place(p.pos + Vector2(6, 0))
	for i in range(5):
		m._physics_process(1.0 / 60.0)
	_press("shoot", true)
	await get_tree().process_frame
	for i in range(30):
		m._physics_process(1.0 / 60.0)
	check(p.charging and p.charge > 0.3, "holding shoot charges the bar (%.2f)" % p.charge)
	_press("shoot", false)
	await get_tree().process_frame
	for i in range(12):
		m._physics_process(1.0 / 60.0)
	check(not p.has_ball and m.ball.vel.length() > 200.0, "releasing shoot kicks the ball (%.0f px/s)" % m.ball.vel.length())
	check(m.ball.vel.x > 0.0, "shot goes toward the right goal")
	# switching: pressing switch changes the controlled player when the ball is loose
	var before := hc.current
	m.ball.place(Vector2(300, 200))
	_press("switch_player", true)
	await get_tree().process_frame
	m._physics_process(1.0 / 60.0)
	_press("switch_player", false)
	await get_tree().process_frame
	check(hc.current != before, "switch selects another player")
	inst.queue_free()
	await get_tree().process_frame
