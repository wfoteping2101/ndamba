extends Node
## Control-feel harness: a scripted "thumb" drives the real HumanController (touch override
## path, same code as the stick) through the situations that frustrated the family:
##   1. running onto a loose ball        2. receiving a pass        3. dribbling under pressure
##   4. passing to a teammate            5. switching when the other side has the ball
## Each scenario is repeated and the metrics are printed; thresholds are the acceptance bar.
##   godot --headless --path game res://tests/feel_tests.tscn [-- --difficulty N --format 11v11]

var passed := 0
var failed := 0
var difficulty := 1
var format := "5v5"
var stadium := "bonamoussadi_terre"
var home := "lionceaux_bonamoussadi"
var away := "requins_bepanda"


func _ready() -> void:
	await get_tree().process_frame
	var args := OS.get_cmdline_user_args()
	for i in range(args.size()):
		if args[i] == "--difficulty" and i + 1 < args.size():
			difficulty = int(args[i + 1])
		if args[i] == "--format" and i + 1 < args.size():
			format = args[i + 1]
			if format == "11v11":
				stadium = "stade_wouri"
	Game.sim_speed_override = Game.speed_scale()
	print("feel tests: format %s, difficulty %d, speed %.2f" % [format, difficulty, Game.speed_scale()])
	await scenario_loose_ball()
	await scenario_receive_pass()
	await scenario_dribble_pressure()
	await scenario_pass_completion()
	await scenario_auto_switch()
	print("Results: %d passed, %d failed" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)


func check(cond: bool, label: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		push_error("FAIL " + label)
	print(("ok   " if cond else "FAIL ") + label)


func _new_match() -> Match:
	Game.match_config["home"] = home
	Game.match_config["away"] = away
	Game.match_config["stadium"] = stadium
	Game.match_config["format"] = format
	Game.match_config["human_home"] = true
	Game.match_config["human_away"] = false
	Game.match_config["half_minutes"] = 5.0
	Game.match_config["difficulty"] = difficulty
	Game.match_config.erase("return_to")
	Game.qa_mode = false
	var packed: PackedScene = load("res://scenes/match.tscn")
	var inst = packed.instantiate()
	add_child(inst)
	await get_tree().process_frame
	var m: Match = inst.get_node("Match")
	m.intro_skip = true
	m._physics_process(1.0 / 60.0)
	m._enter_phase(Match.Phase.PLAY)
	m.ball_in_play = true
	m.setpiece = {}
	return m


func _end(m: Match) -> void:
	m.get_parent().queue_free()
	await get_tree().process_frame


func _hc(m: Match) -> HumanController:
	return m.humans[0]


## Force open play (a trial may have ended with the ball out).
func _reset_play(m: Match) -> void:
	m._enter_phase(Match.Phase.PLAY)
	m.ball_in_play = true
	m.setpiece = {}
	m.ball.out_of_play = false
	for q in m.all_players():
		q.freeze(false)


## Put the ball at the player's feet and let him collect it (as after a trap).
func _give_ball(m: Match, p: Footballer) -> bool:
	_reset_play(m)
	p._enter(Footballer.State.MOVE)
	p.stun = 0.0
	p.vel = Vector2.ZERO
	m.ball.place(p.feet_point())
	m.ball.kick_cooldown = 0.0
	m.ball.last_kicker = null
	p.control_lock = 0.0
	for i in range(30):
		m._physics_process(1.0 / 60.0)
		if p.has_ball:
			return true
	return p.has_ball


func _step(m: Match, n: int) -> void:
	for i in range(n):
		m._physics_process(1.0 / 60.0)


## Park every player far away (keeps the scenario clean), then place the ones we use.
func _park(m: Match, except: Array) -> void:
	for q in m.all_players():
		if except.has(q):
			continue
		q.brain = null
		q.vel = Vector2.ZERO
		q.teleport(Vector2(m.pitch_rect.position.x - 60.0 + (q.team_index * 20.0), m.pitch_rect.position.y - 40.0 + float(m.all_players().find(q)) * 5.0))


# --------------------------------------------------------------- 1. loose ball

func scenario_loose_ball() -> void:
	var m := await _new_match()
	var hc := _hc(m)
	var p: Footballer = hc.current
	var times := []
	var fails := 0
	var centre := m.pitch_rect.get_center()
	for trial in range(20):
		_park(m, [p])
		_reset_play(m)
		p.teleport(centre, Vector2.RIGHT)
		p.lose_ball()
		var ang := float(trial) * 0.9
		var ball_at := centre + Vector2(cos(ang), sin(ang)) * 55.0
		m.ball.place(ball_at)
		# roll the ball a little, across the approach line, like a bouncing clearance
		m.ball.vel = Vector2(cos(ang + 1.5), sin(ang + 1.5)) * 30.0
		var t := 0.0
		var got := false
		while t < 3.0:
			var dir := (m.ball.pos - p.pos).normalized()
			# a human thumb: roughly toward the ball, not pixel-perfect (12 degree wobble)
			dir = dir.rotated(sin(t * 9.0) * 0.21)
			hc.set_touch_move(dir, true)
			_step(m, 1)
			t += 1.0 / 60.0
			if p.has_ball:
				got = true
				break
		hc.set_touch_move(Vector2.ZERO, false)
		if got:
			times.append(t)
		else:
			fails += 1
	var avg := 0.0
	for t in times:
		avg += t
	avg = avg / maxf(1.0, times.size())
	check(fails == 0, "loose ball: collected every time (%d misses in 20)" % fails)
	check(avg < 1.2, "loose ball: collected quickly (avg %.2f s at 55 px)" % avg)
	await _end(m)


# --------------------------------------------------------------- 2. receive a pass

func scenario_receive_pass() -> void:
	var m := await _new_match()
	var hc := _hc(m)
	var p: Footballer = hc.current
	var passer: Footballer = null
	for q in m.teams[0].players:
		if q != p and not q.is_keeper:
			passer = q
			break
	var centre := m.pitch_rect.get_center()
	var trapped := 0
	var trials := 24
	for trial in range(trials):
		_park(m, [p, passer])
		_reset_play(m)
		p.teleport(centre, Vector2.LEFT)
		p.lose_ball()
		var dist := 60.0 + float(trial % 6) * 25.0           # 60 .. 185 px
		var side := Vector2(cos(float(trial) * 0.7), sin(float(trial) * 0.7))
		passer.brain = null
		passer.teleport(centre + side * dist, (-side))
		_give_ball(m, passer)
		_step(m, 2)
		# the passer kicks like the AI does: a pass at the engine's power for that distance
		var choice := m.choose_pass(passer, (-side), false)
		passer._start_kick(choice["dir"], choice["power"], choice["lift"], "pass")
		var t := 0.0
		var got := false
		var min_d := INF
		# half the trials the thumb is still, half it leans toward the ball (both must work)
		var lean: bool = trial % 2 == 1
		while t < 2.5:
			if lean:
				hc.set_touch_move((m.ball.pos - p.pos).normalized() * 0.6, true)
			else:
				hc.set_touch_move(Vector2.ZERO, false)
			_step(m, 1)
			t += 1.0 / 60.0
			min_d = minf(min_d, p.pos.distance_to(m.ball.pos))
			if p.has_ball:
				got = true
				break
		hc.set_touch_move(Vector2.ZERO, false)
		if got:
			trapped += 1
		else:
			print("   receive miss: dist %.0f lean %s power %.0f min_d %.1f owner %s ball_speed %.0f" % [dist, lean, choice["power"], min_d, m.ball.owner_player, m.ball.vel.length()])
	check(trapped >= int(trials * 0.9), "receive: pass trapped %d/%d times (need 90%%)" % [trapped, trials])
	await _end(m)


# --------------------------------------------------------------- 3. dribble under pressure

func scenario_dribble_pressure() -> void:
	var m := await _new_match()
	var hc := _hc(m)
	var p: Footballer = hc.current
	var d1: Footballer = null
	var d2: Footballer = null
	for q in m.teams[1].players:
		if q.is_keeper:
			continue
		if d1 == null:
			d1 = q
		elif d2 == null:
			d2 = q
	var kept_times := []
	var trials := 16
	var beaten := 0
	for trial in range(trials):
		_park(m, [p, d1, d2])
		var start := Vector2(m.pitch_rect.position.x + m.pitch_rect.size.x * 0.35, m.pitch_rect.get_center().y)
		p.teleport(start, Vector2.RIGHT)
		d1.brain = null
		d2.brain = null
		d1.teleport(start + Vector2(200.0, 0.0), Vector2.LEFT)
		d2.teleport(start + Vector2(200.0, 30.0), Vector2.LEFT)
		if not _give_ball(m, p):
			check(false, "dribble: could not give the ball to the player (state %s phase %s in_play %s owner %s lock %.2f human %s)" % [Footballer.State.keys()[p.state], Match.Phase.keys()[m.phase], m.ball_in_play, m.ball.owner_player, p.control_lock, p.human_controlled])
			break
		d1.brain = AiBrain.new(d1, m, difficulty)
		d2.brain = AiBrain.new(d2, m, difficulty)
		d1.teleport(start + Vector2(48.0, -10.0 + float(trial % 3) * 10.0), Vector2.LEFT)
		d2.teleport(start + Vector2(95.0, 14.0 - float(trial % 2) * 28.0), Vector2.LEFT)
		_step(m, 3)
		var t := 0.0
		var lost_at := -1.0
		while t < 4.0:
			# the thumb: run forward, swerve around the nearest defender, sprint when clear
			var nearest := d1 if d1.pos.distance_to(p.pos) < d2.pos.distance_to(p.pos) else d2
			var dir := Vector2.RIGHT
			var rel := nearest.pos - p.pos
			var off_centre: float = p.pos.y - start.y
			if rel.length() < 40.0 and rel.x > -5.0:
				# swerve to the side away from the defender, but never run out of the corridor
				var side: float = -signf(rel.y) if absf(rel.y) > 1.0 else 1.0
				if absf(off_centre) > 55.0:
					side = -signf(off_centre)
				dir = Vector2(0.6, side).normalized()
			elif absf(off_centre) > 20.0:
				dir = Vector2(1.0, -signf(off_centre) * 0.35).normalized()
			hc.set_touch_move(dir, true)
			hc.set_touch_sprint(rel.length() > 30.0)
			_step(m, 1)
			t += 1.0 / 60.0
			if not p.has_ball and m.ball.owner_player != p:
				lost_at = t
				break
			if p.pos.x > start.x + 150.0:
				break   # got past both
		hc.set_touch_move(Vector2.ZERO, false)
		hc.set_touch_sprint(false)
		if lost_at < 0.0:
			beaten += 1
			kept_times.append(t)
		else:
			kept_times.append(lost_at)
			print("   dribble lost at %.2f s, progress %.0f px, taker %s, p state %s phase %s owner %s ball %s p %s d1 %s" % [lost_at, p.pos.x - start.x, m.ball.last_touch, Footballer.State.keys()[p.state], Match.Phase.keys()[m.phase], m.ball.owner_player, m.ball.pos, p.pos, d1.pos])
	var avg := 0.0
	for t in kept_times:
		avg += t
	avg = avg / maxf(1.0, kept_times.size())
	check(beaten >= int(trials * 0.45), "dribble: got past two pressing defenders %d/%d times (need 45%%)" % [beaten, trials])
	var need := 1.5 if difficulty <= 1 else 1.2
	check(avg > need, "dribble: kept the ball %.2f s on average under pressure (need > %.1f)" % [avg, need])
	await _end(m)


# --------------------------------------------------------------- 4. pass completion

func scenario_pass_completion() -> void:
	var m := await _new_match()
	var hc := _hc(m)
	var p: Footballer = hc.current
	var mate: Footballer = null
	var opp: Footballer = null
	for q in m.teams[0].players:
		if q != p and not q.is_keeper:
			mate = q
			break
	for q in m.teams[1].players:
		if not q.is_keeper:
			opp = q
			break
	var centre := m.pitch_rect.get_center()
	var done := 0
	var trials := 20
	var switched := 0
	for trial in range(trials):
		_park(m, [p, mate, opp])
		p.teleport(centre, Vector2.RIGHT)
		mate.brain = null
		opp.brain = null
		if not _give_ball(m, p):
			check(false, "pass: could not give the ball to the player")
			break
		var ang := -0.9 + float(trial % 10) * 0.2          # a fan of targets ahead
		var dist := 70.0 + float(trial % 4) * 30.0
		var at := centre + Vector2(cos(ang), sin(ang)) * dist
		mate.teleport(at, Vector2.LEFT)
		mate.brain = AiBrain.new(mate, m, 3)
		# a defender between, off the line, like a real lane
		opp.teleport(centre + Vector2(cos(ang + 0.7), sin(ang + 0.7)) * dist * 0.5, Vector2.LEFT)
		opp.brain = AiBrain.new(opp, m, difficulty)
		_step(m, 3)
		# the thumb points roughly at the teammate (15 degrees off) and taps pass
		var aim := (mate.pos - p.pos).normalized().rotated(0.26 if trial % 2 == 0 else -0.26)
		hc.set_touch_move(aim, true)
		_step(m, 2)
		hc.press("pass")
		_step(m, 1)
		hc.set_touch_move(Vector2.ZERO, false)
		var t := 0.0
		var ok := false
		var sw := false
		while t < 2.5:
			_step(m, 1)
			t += 1.0 / 60.0
			if hc.current == mate:
				sw = true
			if mate.has_ball:
				ok = true
				break
			if m.ball.owner_player == opp:
				break
		if ok:
			done += 1
		else:
			print("   pass miss: ang %.2f dist %.0f owner %s mate_d %.0f ball %s" % [ang, dist, m.ball.owner_player, mate.pos.distance_to(m.ball.pos), m.ball.pos])
		if sw:
			switched += 1
	check(done >= int(trials * 0.7), "pass: completed %d/%d to a teammate with a defender charging the lane (need 70%%)" % [done, trials])
	check(switched >= int(trials * 0.9), "pass: control moves to the receiver while the ball travels (%d/%d)" % [switched, trials])
	await _end(m)


# --------------------------------------------------------------- 5. auto switch

func scenario_auto_switch() -> void:
	var m := await _new_match()
	var hc := _hc(m)
	var centre := m.pitch_rect.get_center()
	var lat := []
	var trials := 12
	for trial in range(trials):
		# the opponent plays a pass across our half: the controlled player must become the
		# teammate nearest to the ball within half a second, without the stick being touched
		var ours := m.teams[0].players.filter(func(q): return not q.is_keeper)
		var theirs := m.teams[1].players.filter(func(q): return not q.is_keeper)
		_park(m, [])
		_reset_play(m)
		for i in range(ours.size()):
			ours[i].teleport(centre + Vector2(-60.0 + float(i % 3) * 60.0, -80.0 + float(i) * 40.0), Vector2.RIGHT)
		var kicker: Footballer = theirs[0]
		kicker.teleport(centre + Vector2(150.0, 0.0), Vector2.LEFT)
		_give_ball(m, kicker)
		var far: Footballer = ours[ours.size() - 1]
		hc.select(far if far != hc.current else ours[0])
		hc.auto_switch_cooldown = 0.0
		_step(m, 2)
		var target_y := -80.0 + float(trial % ours.size()) * 40.0
		var aim := (centre + Vector2(-40.0, target_y) - kicker.pos).normalized()
		kicker._start_kick(aim, 230.0, 0.0, "pass")
		var t := 0.0
		var when := -1.0
		var streak := 0
		var frame := 0
		while t < 2.0:
			hc.set_touch_move(Vector2.ZERO, false)
			_step(m, 1)
			t += 1.0 / 60.0
			frame += 1
			# the right player: the teammate nearest to where the ball will be shortly
			var ahead: Vector2 = m.ball.predict(0.3)
			var best: Footballer = null
			var bd := INF
			for q in ours:
				var d: float = q.pos.distance_to(ahead)
				if d < bd:
					bd = d
					best = q
			streak = streak + 1 if hc.current == best else 0
			if streak >= 6 and when < 0.0:
				when = t - 0.1
			if trial < 1 and frame % 15 == 0:
				print("      t %.2f current %s best %s cur_d %.0f best_d %.0f cooldown %.2f busy %s sp_wait %s ball_speed %.0f" % [t, hc.current.name, best.name, hc.current.pos.distance_to(ahead), bd, hc.auto_switch_cooldown, hc.current.busy(), m.is_setpiece_wait(), m.ball.vel.length()])
			if (m.ball.owner_player != null and m.ball.owner_player != kicker) or (when >= 0.0 and t > 1.0):
				break
		lat.append(when if when >= 0.0 else 2.0)
	var worst := 0.0
	var avg := 0.0
	for x in lat:
		worst = maxf(worst, x)
		avg += x
	avg = avg / lat.size()
	check(avg < 0.5, "switch: the nearest teammate is under control %.2f s after the pass on average (need < 0.5)" % avg)
	check(worst < 1.0, "switch: worst case %.2f s (need < 1.0)" % worst)
	await _end(m)
