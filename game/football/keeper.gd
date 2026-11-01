class_name KeeperBrain
extends RefCounted
## Goalkeeper: positions on the line between the ball and the goal centre, comes out for
## loose balls in the box, dives at shots with a reaction delay, catches or parries, and
## distributes to a free teammate.

var p: Footballer
var m
var profile: Dictionary
var rng := RandomNumberGenerator.new()
var reaction_left: float = 0.0
var tracked_shot: bool = false
var hold_t: float = 0.0
var force: Dictionary = {}


func _init(player: Footballer, match_node, difficulty: int) -> void:
	p = player
	m = match_node
	profile = AiBrain.profile_for(difficulty)
	rng.seed = hash(player.name) + 99


func tick(dt: float) -> void:
	p.clear_intent()
	if not force.is_empty():
		for key in force.keys():
			p.set(key, force[key])
		force = {}
		return
	if not p.can_act():
		return
	if m.phase == Match.Phase.KICKOFF and m.setpiece.get("taker") != p:
		p.in_face = (m.ball.pos - p.pos)
		return
	var ball: Ball = m.ball
	var goal: Vector2 = m.goal_center(p.team_index, true)
	var into := float(p.attack_dir)           # from our goal line into the pitch
	if p.has_ball:
		_distribute(dt)
		return
	# shot detection: ball moving toward our goal line and reaching it inside the posts
	var incoming := _incoming_shot(ball, goal)
	if incoming["is_shot"]:
		reaction_left -= dt
		if not tracked_shot:
			tracked_shot = true
			# keepers read the shot early: reaction is short and scales with skill and difficulty
			reaction_left = 0.05 + (1.0 - p.attr("gk") / 100.0) * 0.22 + profile["reaction"] * 0.25
		if reaction_left <= 0.0:
			var y_hit: float = incoming["y"]
			var eta: float = incoming["eta"]
			var dy := y_hit - p.pos.y
			var reach := 8.0 + p.attr("gk") * 0.06
			if absf(dy) <= reach:
				# in reach: slide across and let the hands do the work (resolved in match)
				p.in_move = Vector2(0, signf(dy) * clampf(absf(dy) / 6.0, 0.0, 1.0))
				p.in_sprint = true
			elif absf(dy) <= 46.0 and eta < 0.75:
				p.start_dive(1 if dy > 0 else -1, clampf(absf(dy) / 22.0, 0.8, 1.4))
			else:
				p.in_move = Vector2(0, signf(dy))
				p.in_sprint = true
		return
	tracked_shot = false
	# loose ball nearby inside our area: go and get it
	var zone: Rect2 = m.keeper_zone(p.team_index)
	var ball_free := ball.owner_player == null
	var ball_near := zone.grow(6.0).has_point(ball.pos)
	var danger: bool = ball.owner_player != null and ball.owner_player.team_index != p.team_index and zone.grow(4.0).has_point(ball.pos)
	if (ball_free and ball_near and ball.vel.length() < 220.0) or (danger and p.pos.distance_to(ball.pos) < 20.0):
		var tgt := ball.predict(0.2)
		p.in_move = (tgt - p.pos).normalized()
		p.in_sprint = true
		var d := p.feet_point().distance_to(ball.pos)
		if d < 10.0 and danger:
			p.in_tackle = true
		return
	# positioning: on the line from the ball to the goal centre, 8 to 14 px off the line
	var ball_p := ball.pos
	var depth: float = clampf(8.0 + (ball_p.distance_to(goal) / 400.0) * 10.0, 6.0, 16.0)
	var dir := (ball_p - goal).normalized()
	var target := goal + dir * depth
	var half: float = Content.goal_half_width() - 2.0
	target.y = clampf(target.y, goal.y - half - 4.0, goal.y + half + 4.0)
	target.x = goal.x + into * clampf((target.x - goal.x) * into, 4.0, 18.0)
	var rel := target - p.pos
	if rel.length() > 2.0:
		p.in_move = rel.normalized() * clampf(rel.length() / 12.0, 0.3, 1.0)
		p.in_sprint = rel.length() > 30.0
	else:
		p.in_move = Vector2.ZERO
	p.in_face = Vector2(into, 0)


func _incoming_shot(ball: Ball, goal: Vector2) -> Dictionary:
	var out := {"is_shot": false, "y": 0.0, "eta": 0.0}
	if ball.owner_player != null or ball.vel.length() < 90.0:
		return out
	var toward := signf(goal.x - ball.pos.x)
	if signf(ball.vel.x) != toward or absf(ball.vel.x) < 40.0:
		return out
	var t := (goal.x - ball.pos.x) / ball.vel.x
	if t < 0.0 or t > 1.6:
		return out
	var y := ball.pos.y + ball.vel.y * t
	var half: float = Content.goal_half_width() + 14.0
	if absf(y - goal.y) > half:
		return out
	out["is_shot"] = true
	out["y"] = y
	out["eta"] = t
	return out


func _distribute(dt: float) -> void:
	hold_t += dt
	if hold_t < 0.6:
		p.in_move = Vector2.ZERO
		return
	hold_t = 0.0
	# pick the freest teammate; prefer forward ones; otherwise kick long
	var best = null
	var best_s := -INF
	for t in m.teammates_of(p):
		if t == p:
			continue
		var free := INF
		for o in m.opponents_of(p):
			free = minf(free, o.pos.distance_to(t.pos))
		var fwd: float = (t.pos.x - p.pos.x) * float(p.attack_dir)
		var s: float = minf(free, 60.0) / 60.0 + fwd / 300.0 - p.pos.distance_to(t.pos) / 500.0
		if s > best_s:
			best_s = s
			best = t
	if best != null and best_s > 0.4 and (best.pos.x - p.pos.x) * float(p.attack_dir) > 4.0:
		var d: Vector2 = (best.pos - p.pos)
		var dist: float = d.length()
		var power := clampf(dist * 1.5 + 100.0, 150.0, 330.0)
		var lift := 0.0 if dist < 120.0 else clampf(dist * 0.35, 30.0, 95.0)
		p.keeper_distribute(d, power, lift)
	else:
		var d := Vector2(float(p.attack_dir), rng.randf_range(-0.4, 0.4))
		p.keeper_distribute(d, 360.0, 110.0)
