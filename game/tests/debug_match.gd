extends Node
func _ready() -> void:
	await get_tree().process_frame
	Game.match_config["home"] = "mokolo_etoiles"
	Game.match_config["away"] = "requins_bepanda"
	Game.match_config["human_home"] = false
	Game.match_config["human_away"] = false
	Game.match_config["half_minutes"] = 1.5
	Game.qa_mode = true
	var inst = load("res://scenes/match.tscn").instantiate()
	add_child(inst)
	await get_tree().process_frame
	var m: Match = inst.get_node("Match")
	m.event.connect(func(k, t, team): print("EVENT %s %d %s" % [k, team, m.clock_text()]))
	var sp := 0
	m.score_changed.connect(func(h, a):
		var g = m.ball.last_touch
		for t in m.teams:
			var k = t.keeper
			var og = m.goal_center(t.index, true)
			if m.ball.pos.distance_to(og) < 40.0:
				print("GOAL conceded by team %d: keeper %s at %s (goal %s) ball %s h=%.1f speed=%.0f shooter_dist=%.0f" % [t.index, Footballer.State.keys()[k.state], k.pos.round(), og, m.ball.pos.round(), m.ball.h, m.ball.vel.length(), (g.pos.distance_to(og) if g else -1.0)]))
	var saves := {"save": 0, "parry": 0, "shot": 0, "post": 0, "corner": 0, "out": 0, "foul": 0, "tackle": 0}
	m.event.connect(func(k, t, team): if saves.has(k): saves[k] += 1)
	for i in range(60 * 260):
		m._physics_process(1.0 / 60.0)
		sp = sp + 1 if m.phase == Match.Phase.SETPIECE else 0
		if sp > 180 and sp % 60 == 0:
			var tk = m.setpiece.get("taker")
			print("STUCK t=%.1f kind=%s ball=%s vel=%s owner=%s taker=%s tpos=%s st=%s hasball=%s ready=%s" % [i / 60.0, m.setpiece.get("kind"), m.ball.pos.round(), m.ball.vel.round(), m.ball.owner_player.name if m.ball.owner_player else "-", tk.name if tk else "-", tk.pos.round() if tk else "-", (Footballer.State.keys()[tk.state] if tk else "-"), (tk.has_ball if tk else "-"), m.setpiece.get("ready")])
		if m.phase == Match.Phase.FULLTIME:
			print("FULLTIME at ", i / 60.0, " score ", m.teams[0].score, "-", m.teams[1].score, " ", saves, " shots ", m.teams[0].stats["shots"], "/", m.teams[1].stats["shots"], " on ", m.teams[0].stats["on_target"], "/", m.teams[1].stats["on_target"], " passes ", m.teams[0].stats["pass_ok"], "/", m.teams[0].stats["passes"], " ", m.teams[1].stats["pass_ok"], "/", m.teams[1].stats["passes"])
			break
	for p in m.all_players():
		if not m.pitch_rect.grow(40.0).has_point(p.pos):
			print("OFF PITCH ", p.name, " ", p.pos.round(), " state ", Footballer.State.keys()[p.state], " job ", p.brain.job if p.brain and "job" in p.brain else "-")
	get_tree().quit()
