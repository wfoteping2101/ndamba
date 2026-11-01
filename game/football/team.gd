class_name Team
extends RefCounted
## A team on the pitch: its players, formation and the coordinator that hands out jobs.

var index: int = 0
var data: Dictionary = {}
var players: Array[Footballer] = []
var keeper: Footballer = null
var attack_dir: int = 1
var formation: String = "1-2-1-1"
var m                                   # Match
var pressing: float = 1.0               # 0.6 (sit) .. 1.4 (high press)
var shape_shift: float = 0.35
var slots: Array = []                   # [{role, x, y}] normalised (x: 0 own goal .. 1 opp goal)
var score: int = 0
var human: bool = false
var stats := {"shots": 0, "on_target": 0, "passes": 0, "pass_ok": 0, "tackles": 0, "possession": 0.0, "fouls": 0, "corners": 0}
var _rng := RandomNumberGenerator.new()


func _init(p_index: int, p_data: Dictionary, p_match) -> void:
	index = p_index
	data = p_data
	m = p_match
	formation = p_data.get("formation", "1-2-1-1")
	slots = formation_slots(formation)
	_rng.seed = 1000 + p_index


static func formation_slots(f: String) -> Array:
	var parts := f.split("-")
	var out: Array = [{"role": "GK", "x": 0.04, "y": 0.5}]
	var lines := [["DEF", 0.24], ["MID", 0.50], ["FWD", 0.76]]
	for li in range(3):
		var n := int(parts[li + 1]) if parts.size() > li + 1 else 0
		for i in range(n):
			var y := 0.5 if n == 1 else lerpf(0.22, 0.78, float(i) / float(n - 1))
			out.append({"role": lines[li][0], "x": lines[li][1], "y": y})
	return out


func outfield() -> Array:
	var out := []
	for p in players:
		if not p.is_keeper:
			out.append(p)
	return out


## Home position of slot i in world px, shaped by the ball position and possession.
func home_position(i: int, ball_pos: Vector2, in_possession: bool) -> Vector2:
	var s: Dictionary = slots[i]
	var rect: Rect2 = m.pitch_rect
	var bx := (ball_pos.x - rect.position.x) / rect.size.x
	if attack_dir < 0:
		bx = 1.0 - bx
	var by := (ball_pos.y - rect.position.y) / rect.size.y
	var x: float = s["x"]
	var y: float = s["y"]
	if s["role"] != "GK":
		var push := (bx - 0.5) * shape_shift
		if in_possession:
			push += 0.08
		else:
			push -= 0.06 * (2.0 - pressing)
		x = clampf(x + push, 0.05, 0.95)
		y = clampf(y + (by - 0.5) * 0.30, 0.06, 0.94)
	var wx := rect.position.x + (x if attack_dir > 0 else 1.0 - x) * rect.size.x
	var wy := rect.position.y + y * rect.size.y
	return Vector2(wx, wy)


func slot_of(p: Footballer) -> int:
	var i := players.find(p)
	return i if i >= 0 else 0


## Hand out jobs for this tick.
func coordinate(ball: Ball) -> void:
	var holder = ball.owner_player
	var we_have: bool = holder != null and holder.team_index == index
	var they_have: bool = holder != null and holder.team_index != index
	var loose := holder == null
	var in_poss: bool = we_have or (loose and _closest_team_to_ball(ball) == index)
	# sort outfield players by distance to the ball
	var by_dist := outfield()
	by_dist.sort_custom(func(a, b): return a.pos.distance_to(ball.pos) < b.pos.distance_to(ball.pos))
	var marked := {}
	for k in range(by_dist.size()):
		var p: Footballer = by_dist[k]
		if p.brain == null or p.human_controlled:
			continue
		var brain: AiBrain = p.brain
		var home := home_position(slot_of(p), ball.pos, in_poss)
		brain.mark_target = null
		if we_have:
			if p == holder:
				brain.job = "with_ball"
			else:
				brain.job = "support"
				brain.job_target = _support_point(p, home, holder, ball)
		elif loose:
			if k == 0 or (k == 1 and ball.vel.length() > 60.0):
				brain.job = "chase"
			else:
				brain.job = "hold"
				brain.job_target = home
		else:
			# defending
			if k == 0:
				brain.job = "press"
			elif k == 1 and p.pos.distance_to(holder.pos) < 90.0:
				brain.job = "cover"
				var og: Vector2 = m.goal_center(index, true)
				brain.job_target = holder.pos.lerp(og, 0.25) + Vector2(0, 0.0)
			else:
				# mark the most dangerous unmarked opponent near our half, else hold shape
				var target = _dangerous_opponent(p, marked)
				if target != null and target.pos.distance_to(home) < 110.0:
					brain.job = "mark"
					brain.mark_target = target
					marked[target] = true
				else:
					brain.job = "hold"
					brain.job_target = home
	# possession stats
	if we_have:
		stats["possession"] += 1.0


func _closest_team_to_ball(ball: Ball) -> int:
	var best := INF
	var best_team := index
	for t in m.teams:
		for p in t.players:
			var d: float = p.pos.distance_to(ball.pos)
			if d < best:
				best = d
				best_team = t.index
	return best_team


func _support_point(p: Footballer, home: Vector2, holder: Footballer, ball: Ball) -> Vector2:
	# offer a passing option: ahead of the carrier, away from opponents, within the pitch
	var goal: Vector2 = m.goal_center(index, false)
	var fwd := Vector2(attack_dir, 0)
	var target := home
	var s: Dictionary = slots[slot_of(p)]
	if s["role"] == "FWD":
		# forwards make runs into space ahead of the ball, never too far from the carrier
		target = holder.pos + fwd * 70.0 + Vector2(0, (p.pos.y - holder.pos.y)).limit_length(60.0)
		target.x = clampf(target.x, m.pitch_rect.position.x + 12.0, m.pitch_rect.end.x - 12.0)
	elif s["role"] == "MID":
		target = home.lerp(holder.pos + fwd * 30.0, 0.35)
	else:
		target = home.lerp(holder.pos - fwd * 50.0, 0.25)
	# nudge away from the nearest opponent
	for o in m.opponents_of(p):
		var rel: Vector2 = target - o.pos
		if rel.length() < 28.0:
			target += rel.normalized() * (28.0 - rel.length())
	# keep lateral spacing from the carrier
	if absf(target.y - holder.pos.y) < 18.0 and target.distance_to(holder.pos) < 50.0:
		target.y += 24.0 * (1.0 if p.pos.y > holder.pos.y else -1.0)
	return m.clamp_to_pitch(target, 8.0)


func _dangerous_opponent(p: Footballer, marked: Dictionary):
	var own_goal: Vector2 = m.goal_center(index, true)
	var best = null
	var best_d := INF
	for o in m.opponents_of(p):
		if o.is_keeper or marked.has(o) or o.has_ball:
			continue
		var d: float = o.pos.distance_to(own_goal) + o.pos.distance_to(p.pos) * 0.5
		if d < best_d:
			best_d = d
			best = o
	return best


func reset_stats() -> void:
	for k in stats.keys():
		stats[k] = 0 if typeof(stats[k]) == TYPE_INT else 0.0
