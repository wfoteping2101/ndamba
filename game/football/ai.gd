class_name AiBrain
extends RefCounted
## Decision making for one outfield player. Modular: the team coordinator assigns a job each
## tick (press, mark, support, hold, chase), the brain turns the job into an intent.
## Difficulty changes reaction time, decision noise and execution, never the physics.

var p: Footballer
var m                      # Match
var profile: Dictionary
var think_t: float = 0.0
var hold_t: float = 0.0    # time holding the ball before deciding
var job: String = "hold"
var job_target: Vector2 = Vector2.ZERO
var mark_target: Footballer = null
var rng := RandomNumberGenerator.new()
var _plan: Dictionary = {}
var _plan_t: float = 0.0
var force: Dictionary = {}      # one-shot intent imposed by the match (set pieces)


static func profile_for(difficulty: int) -> Dictionary:
	# reaction: seconds between decisions; noise: radians of aim error; pass_err: extra pass error;
	# shoot_range: px from goal to attempt; speed: movement multiplier; press_dist: how far a presser engages
	match clampi(difficulty, 0, 4):
		0: return {"reaction": 0.55, "noise": 0.30, "pass_err": 0.25, "shoot_range": 52.0, "speed": 0.84, "press": 55.0, "dribble": 0.6, "intercept": 0.5, "name": "beginner"}
		1: return {"reaction": 0.40, "noise": 0.20, "pass_err": 0.15, "shoot_range": 62.0, "speed": 0.92, "press": 70.0, "dribble": 0.5, "intercept": 0.7, "name": "casual"}
		2: return {"reaction": 0.28, "noise": 0.12, "pass_err": 0.08, "shoot_range": 72.0, "speed": 1.0, "press": 85.0, "dribble": 0.42, "intercept": 0.85, "name": "intermediate"}
		3: return {"reaction": 0.18, "noise": 0.07, "pass_err": 0.04, "shoot_range": 82.0, "speed": 1.03, "press": 100.0, "dribble": 0.35, "intercept": 0.95, "name": "advanced"}
		_: return {"reaction": 0.12, "noise": 0.04, "pass_err": 0.02, "shoot_range": 92.0, "speed": 1.06, "press": 115.0, "dribble": 0.3, "intercept": 1.0, "name": "expert"}


func _init(player: Footballer, match_node, difficulty: int) -> void:
	p = player
	m = match_node
	profile = profile_for(difficulty)
	rng.seed = hash(player.name) + 17
	think_t = rng.randf_range(0.0, profile["reaction"])
	p.speed_boost = profile["speed"]


func tick(dt: float) -> void:
	p.clear_intent()
	if not force.is_empty():
		for k in force.keys():
			p.set(k, force[k])
		force = {}
		return
	if not p.can_act():
		return
	if m.phase == Match.Phase.KICKOFF and m.setpiece.get("taker") != p:
		p.in_face = (m.ball.pos - p.pos)
		return
	think_t -= dt
	var ball: Ball = m.ball
	if p.has_ball:
		_with_ball(dt)
		return
	# off the ball: follow the job given by the team coordinator
	match job:
		"chase":
			_chase(dt)
		"press":
			_press(dt)
		"mark":
			_mark(dt)
		"support", "hold", "cover":
			_go_to(job_target, _needs_sprint(job_target))
		"intercept":
			_go_to(job_target, true)
	# contextual tackles when pressing or chasing a dribbler
	if (job == "press" or job == "chase") and ball.owner_player != null and ball.owner_player.team_index != p.team_index:
		var d := p.feet_point().distance_to(ball.pos)
		if d < 14.0 and think_t <= 0.0:
			var slide_ok: bool = d > 9.0 and ball.owner_player.vel.length() > 70.0 and rng.randf() < 0.35
			if slide_ok:
				p.in_slide = true
			else:
				p.in_tackle = true
			think_t = profile["reaction"] * 1.5


func _needs_sprint(target: Vector2) -> bool:
	return p.pos.distance_to(target) > 60.0 and p.stamina > 0.25


func _go_to(target: Vector2, sprint: bool) -> void:
	var d := target - p.pos
	if d.length() < 3.0:
		p.in_move = Vector2.ZERO
		p.in_face = (m.ball.pos - p.pos)
		return
	var dist := d.length()
	# ease in so players do not jitter around their spot
	var mag := clampf(dist / 18.0, 0.25, 1.0)
	p.in_move = d.normalized() * mag
	p.in_sprint = sprint and dist > 40.0


func _chase(dt: float) -> void:
	# run to where the ball will be
	var ball: Ball = m.ball
	var t := clampf(p.pos.distance_to(ball.pos) / 140.0, 0.0, 1.2)
	var target: Vector2 = ball.predict(t * profile["intercept"]) if ball.owner_player == null else ball.pos + ball.owner_player.vel * 0.25
	_go_to(target, true)


func _press(dt: float) -> void:
	var holder = m.ball.owner_player
	if holder == null:
		_chase(dt)
		return
	# approach from the goal side: get between the carrier and our goal
	var own_goal: Vector2 = m.goal_center(p.team_index, true)
	var to_goal: Vector2 = (own_goal - holder.pos).normalized()
	var target: Vector2 = holder.pos + to_goal * 10.0
	_go_to(target, true)


func _mark(dt: float) -> void:
	if mark_target == null:
		_go_to(job_target, false)
		return
	var own_goal: Vector2 = m.goal_center(p.team_index, true)
	var to_goal := (own_goal - mark_target.pos).normalized()
	var target := mark_target.pos + to_goal * 14.0
	_go_to(target, p.pos.distance_to(target) > 50.0)


# ---------------------------------------------------------------------------
# With the ball
# ---------------------------------------------------------------------------

func _with_ball(dt: float) -> void:
	hold_t += dt
	var goal: Vector2 = m.goal_center(p.team_index, false)
	var to_goal := goal - p.pos
	var dist_goal := to_goal.length()
	var pressure := _pressure()
	if think_t > 0.0 and hold_t < 0.15:
		# keep moving forward while thinking
		p.in_move = _dribble_dir(to_goal)
		return
	if think_t <= 0.0:
		think_t = profile["reaction"]
		_plan = _decide(goal, dist_goal, pressure)
		_plan_t = 0.0
	_plan_t += dt
	match _plan.get("kind", "dribble"):
		"shoot":
			p.in_shoot = true
			p.in_shoot_power = _plan.get("power", 0.7)
			p.in_move = (_plan.get("aim", to_goal) as Vector2).normalized()
		"pass":
			p.in_pass = true
			p.in_move = (_plan.get("aim", to_goal) as Vector2).normalized()
		"through":
			p.in_through = true
			p.in_move = (_plan.get("aim", to_goal) as Vector2).normalized()
		"clear":
			p.in_pass = true
			p.in_move = (_plan.get("aim", to_goal) as Vector2).normalized()
		_:
			p.in_move = _dribble_dir(to_goal)
			p.in_sprint = pressure < 0.5 and p.stamina > 0.2 and dist_goal > 60.0


func _pressure() -> float:
	var best := 0.0
	for o in m.opponents_of(p):
		var d: float = o.pos.distance_to(p.pos)
		var facing_us: float = (p.pos - o.pos).normalized().dot(o.vel.normalized()) if o.vel.length() > 10.0 else 0.0
		var v := clampf(1.0 - d / 40.0, 0.0, 1.0) * (0.7 + 0.3 * maxf(0.0, facing_us))
		best = maxf(best, v)
	return best


func _decide(goal: Vector2, dist_goal: float, pressure: float) -> Dictionary:
	var noise: float = profile["noise"]
	# 1. shoot?
	var shoot_range: float = profile["shoot_range"] + p.attr("sho") * 0.22
	var angle_ok := _goal_angle_open(goal)
	var close := dist_goal < 48.0
	var want_shot := (angle_ok > 0.45 or (close and angle_ok > 0.2)) and (pressure < 0.7 or close)
	if dist_goal < shoot_range and want_shot and rng.randf() < (0.8 if close else 0.4):
		var power := clampf(0.45 + dist_goal / 160.0 + rng.randf_range(-0.1, 0.1), 0.35, 1.0)
		var aim := _shot_aim(goal)
		return {"kind": "shoot", "power": power, "aim": aim.rotated(rng.randf_range(-noise, noise) * 0.5)}
	# 2. pass options
	var best = null
	var best_score := -INF
	for t in m.teammates_of(p):
		if t == p or t.is_keeper:
			continue
		var s := _pass_score(t, goal, pressure)
		if s > best_score:
			best_score = s
			best = t
	var dribble_score := _dribble_score(goal, dist_goal, pressure)
	if best != null and best_score > dribble_score:
		var lead: Vector2 = best.vel * 0.35
		var aim: Vector2 = (best.pos + lead - p.pos)
		var through: bool = (best.pos - p.pos).dot((goal - p.pos).normalized()) > 20.0 and best.vel.length() > 40.0 and pressure < 0.6
		return {"kind": "through" if through else "pass", "aim": aim.rotated(rng.randf_range(-noise, noise))}
	if pressure > 0.85 and dist_goal > 200.0 and rng.randf() < 0.5:
		return {"kind": "clear", "aim": (goal - p.pos).rotated(rng.randf_range(-0.6, 0.6))}
	return {"kind": "dribble"}


func _goal_angle_open(goal: Vector2) -> float:
	# fraction of the goal mouth not shadowed by defenders / keeper
	var open := 1.0
	for o in m.opponents_of(p):
		var seg := goal - p.pos
		var t := clampf((o.pos - p.pos).dot(seg) / seg.length_squared(), 0.0, 1.0)
		var closest := p.pos + seg * t
		var d: float = o.pos.distance_to(closest)
		if t > 0.05 and d < 16.0:
			open -= 0.45 * (1.0 - d / 16.0) * (1.2 if o.is_keeper else 1.0)
	return clampf(open, 0.0, 1.0)


func _shot_aim(goal: Vector2) -> Vector2:
	# aim for the corner away from the keeper
	var keeper = m.keeper_of(1 - p.team_index)
	var half: float = Content.goal_half_width() - 3.0
	var y_off := half if keeper == null else (half if keeper.pos.y < goal.y else -half)
	if rng.randf() < 0.15:
		y_off = -y_off
	return (goal + Vector2(0, y_off) - p.pos)


func _pass_score(t: Footballer, goal: Vector2, pressure: float) -> float:
	var d := p.pos.distance_to(t.pos)
	if d < 18.0 or d > 230.0:
		return -INF
	var dir := (t.pos - p.pos).normalized()
	# lane blocked?
	var blocked := 0.0
	for o in m.opponents_of(p):
		var seg := t.pos - p.pos
		var tt := clampf((o.pos - p.pos).dot(seg) / seg.length_squared(), 0.0, 1.0)
		var closest := p.pos + seg * tt
		var od: float = o.pos.distance_to(closest)
		if tt > 0.1 and tt < 0.95 and od < 14.0:
			blocked += 1.0 - od / 14.0
	# receiver freedom
	var free := 1.0
	for o in m.opponents_of(p):
		free = minf(free, o.pos.distance_to(t.pos) / 40.0)
	var progress := dir.dot((goal - p.pos).normalized())   # -1..1
	var goal_dist_gain := (p.pos.distance_to(goal) - t.pos.distance_to(goal)) / 100.0
	var s := 0.4 + progress * 0.5 + goal_dist_gain * 0.4 + free * 0.5 - blocked * 1.4
	s -= d / 400.0
	s += pressure * 0.6           # under pressure, passing becomes more attractive
	s += (p.attr("tmw") - 50.0) / 200.0
	s += (rng.randf() - 0.5) * profile["pass_err"] * 2.0
	# keep it inside the pitch
	if not m.pitch_rect.grow(-6.0).has_point(t.pos):
		s -= 1.0
	return s


func _dribble_score(goal: Vector2, dist_goal: float, pressure: float) -> float:
	var s: float = profile["dribble"] + (p.attr("ctl") - 50.0) / 150.0 + (p.attr("spd") - 50.0) / 200.0
	s -= pressure * 1.1
	if dist_goal < 90.0:
		s += 0.2
	if hold_t > 2.5:
		s -= 0.4        # do not hold forever
	return s


func _dribble_dir(to_goal: Vector2) -> Vector2:
	# head for goal but steer around the nearest opponent; sidestep when blocked
	var d := to_goal.normalized()
	var avoid := Vector2.ZERO
	for o in m.opponents_of(p):
		var rel: Vector2 = o.pos - p.pos
		var dist: float = rel.length()
		if dist < 45.0 and rel.normalized().dot(d) > 0.2:
			var side := Vector2(-d.y, d.x)
			var sign := 1.0 if side.dot(rel) < 0.0 else -1.0
			avoid += side * sign * (1.0 - dist / 45.0) * 1.6
	var out := (d + avoid)
	# stay inside the pitch
	var inner: Rect2 = m.pitch_rect.grow(-10.0)
	if p.pos.y < inner.position.y:
		out.y += 1.0
	elif p.pos.y > inner.end.y:
		out.y -= 1.0
	return out.normalized()
