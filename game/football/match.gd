class_name Match
extends Node2D
## The match orchestrator: builds teams and stadium, runs the fixed-step simulation,
## enforces the rules (kick-off, outs, corners, goal kicks, free kicks, goals, halves),
## and exposes helpers used by the AI, the human controller and the HUD.

signal score_changed(home: int, away: int)
signal clock_changed(text: String)
signal event(kind: String, text: String, team: int)
signal phase_changed(phase: String)
signal match_ended(result: Dictionary)
signal controlled_changed(player: Footballer)

enum Phase { INTRO, KICKOFF, PLAY, GOAL, SETPIECE, HALFTIME, FULLTIME, PAUSED }

const DISPLAY_MINUTES_PER_HALF := 45.0

var config: Dictionary = {}
var teams: Array[Team] = []
var ball: Ball
var pitch_rect: Rect2
var world_size: Vector2
var phase: Phase = Phase.INTRO
var phase_t: float = 0.0
var half: int = 1
var half_real_seconds: float = 180.0
var elapsed_real: float = 0.0        # in this half, playing time only
var ball_in_play: bool = false
var surface: Dictionary = {}
var stadium: Dictionary = {}
var posts: Array = []
var goal_left: Vector2
var goal_right: Vector2
var humans: Dictionary = {}          # team index -> HumanController
var setpiece: Dictionary = {}        # {kind, team, pos, taker}
var last_event_t: float = 0.0
var pass_chain: Dictionary = {0: 0, 1: 0}
var _pending_pass: Dictionary = {}   # tracks who passed last to credit completion
var _dust_scene: PackedScene
var _goal_h: float
var _goal_half: float
var result: Dictionary = {}
var rng := RandomNumberGenerator.new()
var time_scale: float = 1.0
var intro_seconds: float = 9.0     # stadium fly-over before the first kick-off (skippable)
var intro_skip: bool = false
var _ht_done := false
var commentary_enabled: bool = true

@onready var world: Node2D = $World
@onready var ysort: Node2D = $World/YSort
@onready var fx: Node2D = $World/FX
@onready var cam: Camera2D = $Cam


func _ready() -> void:
	rng.randomize()
	config = Game.match_config.duplicate(true)
	stadium = Content.stadium(config["stadium"])
	Content.set_layout(stadium.get("layout", "street"))
	# the format follows the ground: 11v11 only fits a full-size pitch, 5v5 only a street ground
	var fmt: String = config.get("format", "5v5")
	var allowed: Array = Content.pitch.get("formats", ["5v5"])
	if not allowed.has(fmt):
		fmt = allowed[0]
		config["format"] = fmt
	time_scale = Game.speed_scale()
	pitch_rect = Content.pitch_rect()
	world_size = Content.world_size()
	_goal_h = Content.goal_height()
	_goal_half = Content.goal_half_width()
	goal_left = Vector2(pitch_rect.position.x, pitch_rect.position.y + pitch_rect.size.y * 0.5)
	goal_right = Vector2(pitch_rect.end.x, goal_left.y)
	half_real_seconds = float(config.get("half_minutes", 3.0)) * 60.0
	surface = Content.surface(stadium.get("surface", "terre")).duplicate()
	if config.get("weather", "dry") == "rain" and stadium.get("surface", "terre") == "terre":
		surface = Content.surface("mud").duplicate()
	_build_stadium()
	_build_ball()
	_build_teams()
	_setup_posts()
	_enter_phase(Phase.INTRO)
	cam.setup(self)
	commentary_enabled = bool(Game.settings.get("commentary", true))


# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------

func _build_stadium() -> void:
	var s := StadiumView.new()
	s.name = "Stadium"
	world.add_child(s)
	world.move_child(s, 0)
	s.build(stadium, ysort, config.get("weather", "dry"))


func _build_ball() -> void:
	ball = Ball.new()
	ball.name = "Ball"
	ball.set_surface(surface)
	ysort.add_child(ball)
	ball.place(pitch_rect.get_center())
	ball.bounced.connect(_on_ball_bounce)
	ball.hit_post.connect(func(): _say("post", 0))


func _build_teams() -> void:
	for i in range(2):
		var tid: String = config["home"] if i == 0 else config["away"]
		var tdata := Content.team(tid)
		var team := Team.new(i, tdata, self)
		team.attack_dir = 1 if i == 0 else -1
		team.human = bool(config["human_home"]) if i == 0 else bool(config["human_away"])
		var kit: Dictionary = tdata.get("kit_home", {})
		if config.get("competition", "friendly") in ["street", "story"] and tdata.has("kit_story"):
			kit = tdata["kit_story"]
		if i == 1:
			# avoid a colour clash: away team wears its away kit when jerseys are similar
			var home_kit: Dictionary = Content.team(config["home"]).get("kit_home", {})
			kit = tdata.get("kit_away", kit) if _kits_clash(home_kit, tdata.get("kit_home", {})) else tdata.get("kit_home", {})
		var lineup := Content.lineup(tid, config.get("format", "5v5"))
		var used: Dictionary = {}
		var slots := team.slots
		for si in range(slots.size()):
			var role: String = slots[si]["role"]
			var pdata := _pick_for_role(lineup, role, used)
			if pdata.is_empty():
				continue
			var is_gk := role == "GK"
			var f := Footballer.new()
			f.setup(pdata, i, tdata.get("kit_gk", kit) if is_gk else kit, is_gk, self)
			f.ball = ball
			f.attack_dir = team.attack_dir
			f.surface_speed = float(surface.get("player_speed", 1.0))
			ysort.add_child(f)
			team.players.append(f)
			if is_gk:
				team.keeper = f
				f.brain = KeeperBrain.new(f, self, _ai_difficulty_for(i))
			else:
				f.brain = AiBrain.new(f, self, _ai_difficulty_for(i))
		teams.append(team)
	var human_count := 0
	Game.set_pad_devices(bool(config["human_home"]) and bool(config["human_away"]))
	for i in range(2):
		if teams[i].human:
			var hc := HumanController.new()
			hc.prefix = "p2_" if human_count == 1 else ""
			hc.device = human_count
			hc.setup(self, teams[i], i)
			humans[i] = hc
			add_child(hc)
			human_count += 1
	_place_formation(true)


func _ai_difficulty_for(team_index: int) -> int:
	var d := int(config.get("difficulty", 2))
	var human_team := int(config["human_home"]) == 1 or int(config["human_away"]) == 1
	if not human_team:
		return d
	var is_human: bool = (team_index == 0 and config["human_home"]) or (team_index == 1 and config["human_away"])
	# the human's own AI teammates play at a solid, steady level so the game stays fun
	return 3 if is_human else d


func _pick_for_role(lineup: Array, role: String, used: Dictionary) -> Dictionary:
	for p in lineup:
		if p.get("role", "") == role and not used.has(p["id"]):
			used[p["id"]] = true
			return p
	for p in lineup:
		if not used.has(p["id"]) and p.get("role", "") != "GK":
			used[p["id"]] = true
			return p
	return {}


func _kits_clash(a: Dictionary, b: Dictionary) -> bool:
	var ca := Color.html(a.get("jersey", "#000000"))
	var cb := Color.html(b.get("jersey", "#ffffff"))
	return (Vector3(ca.r, ca.g, ca.b) - Vector3(cb.r, cb.g, cb.b)).length() < 0.42


func _setup_posts() -> void:
	posts = []
	for g in [goal_left, goal_right]:
		posts.append([Vector2(g.x, g.y - _goal_half), 1.6, _goal_h])
		posts.append([Vector2(g.x, g.y + _goal_half), 1.6, _goal_h])


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

func goal_center(team_index: int, own: bool) -> Vector2:
	var t := teams[team_index]
	var attacking_right := t.attack_dir > 0
	if own:
		return goal_left if attacking_right else goal_right
	return goal_right if attacking_right else goal_left


func keeper_zone(team_index: int) -> Rect2:
	var g := goal_center(team_index, true)
	var depth := 7.0 * Content.ppm()
	var halfw := 7.5 * Content.ppm()
	var x0 := g.x - 4.0 if teams[team_index].attack_dir > 0 else g.x - depth
	return Rect2(x0, g.y - halfw, depth + 4.0, halfw * 2.0)


func keeper_of(team_index: int) -> Footballer:
	return teams[team_index].keeper


func teammates_of(p: Footballer) -> Array:
	return teams[p.team_index].players


func opponents_of(p: Footballer) -> Array:
	return teams[1 - p.team_index].players


func all_players() -> Array:
	var out := []
	for t in teams:
		out.append_array(t.players)
	return out


func clamp_to_pitch(v: Vector2, margin: float) -> Vector2:
	var r := pitch_rect.grow(-margin)
	return Vector2(clampf(v.x, r.position.x, r.end.x), clampf(v.y, r.position.y, r.end.y))


func nearest_to_ball(team_index: int, exclude: Footballer = null, include_keeper: bool = false) -> Footballer:
	var best: Footballer = null
	var bd := INF
	for p in teams[team_index].players:
		if p == exclude or (p.is_keeper and not include_keeper):
			continue
		var d := p.pos.distance_to(ball.pos)
		if d < bd:
			bd = d
			best = p
	return best


# ---------------------------------------------------------------------------
# Passing and shooting decisions (shared by humans and AI)
# ---------------------------------------------------------------------------

func choose_pass(p: Footballer, aim: Vector2, through: bool) -> Dictionary:
	var best: Footballer = null
	var best_s := -INF
	var fwd := Vector2(float(p.attack_dir), 0)
	# a plain pass always finds a teammate (wide search, the aim direction weighted most);
	# a through ball keeps the narrower cone so it can be played into space on purpose
	var cone := 0.95 if Game.settings.get("assist_aim", true) else 0.55
	if not through and p.human_controlled:
		cone = 2.4
	for t in teammates_of(p):
		if t == p:
			continue
		var rel: Vector2 = t.pos - p.pos
		var d: float = rel.length()
		if d < 8.0 or d > 300.0:
			continue
		var ang := aim.angle_to(rel.normalized())
		if absf(ang) > cone:
			continue
		# the player's aim matters most; distance a little; a blocked lane counts against
		var s: float = 1.0 - absf(ang) * 1.3 - d / 600.0
		if p.human_controlled and _lane_blocked(p.pos, t.pos):
			s -= 0.35
		if absf(ang) > 0.95:
			s -= 0.4   # behind or far to the side: only when nothing better exists
		if through:
			s += rel.normalized().dot(fwd) * 0.5 + t.vel.length() / 300.0
		if t.is_keeper:
			s -= 0.6
		if s > best_s:
			best_s = s
			best = t
	if best == null:
		# no option in the cone: play the ball into that direction
		return {"dir": aim, "power": 190.0 if not through else 260.0, "lift": 0.0 if not through else 25.0, "target": null}
	var target_pos := best.pos
	var d := p.pos.distance_to(target_pos)
	var power := clampf(d * 1.3 + 105.0, 150.0, 300.0)
	if p.human_controlled:
		power = clampf(d * 1.5 + 130.0, 170.0, 330.0)   # a crisper ball: harder to intercept, still trappable
	if through:
		target_pos = best.pos + best.vel.limit_length(120.0) * 0.55 + fwd * 36.0
		target_pos = clamp_to_pitch(target_pos, 6.0)
		d = p.pos.distance_to(target_pos)
		power = clampf(d * 1.6 + 140.0, 190.0, 380.0)
	else:
		# lead the runner a little
		var tt := d / power
		target_pos += best.vel * tt * 0.75
	var lift := 0.0
	if through and _lane_blocked(p.pos, target_pos):
		lift = clampf(d * 0.33, 35.0, 85.0)
		power *= 1.08
	_pending_pass = {"from": p, "team": p.team_index, "target": best, "t": 0.0}
	teams[p.team_index].stats["passes"] += 1
	return {"dir": (target_pos - p.pos).normalized(), "power": power, "lift": lift, "target": best}


func _lane_blocked(a: Vector2, b: Vector2) -> bool:
	for p in all_players():
		var seg := b - a
		if seg.length_squared() < 1.0:
			return false
		var t := clampf((p.pos - a).dot(seg) / seg.length_squared(), 0.0, 1.0)
		if t > 0.1 and t < 0.9 and p.pos.distance_to(a + seg * t) < 9.0:
			return true
	return false


func choose_shot(p: Footballer, aim: Vector2, power01: float) -> Dictionary:
	var goal := goal_center(p.team_index, false)
	var dir := aim
	var assist := Game.settings.get("assist_aim", true)
	# where does the aim line cross the goal line?
	var dx := goal.x - p.pos.x
	var target := goal
	if absf(aim.x) > 0.05 and signf(aim.x) == signf(dx):
		var t := dx / aim.x
		var y := p.pos.y + aim.y * t
		var inner := _goal_half - 3.0
		if assist:
			y = clampf(y, goal.y - inner, goal.y + inner)
		elif absf(y - goal.y) > inner + 30.0:
			y = clampf(y, goal.y - inner - 30.0, goal.y + inner + 30.0)
		target = Vector2(goal.x, y)
		dir = (target - p.pos).normalized()
	elif assist:
		# aiming sideways/backwards: still send it toward the near corner
		var corner_y := goal.y + (_goal_half - 4.0) * (1.0 if aim.y > 0 else -1.0)
		dir = (Vector2(goal.x, corner_y) - p.pos).normalized()
	var power := 240.0 + power01 * 180.0 + p.attr("sho") * 0.35
	var lift := 14.0 + power01 * 58.0 + rng.randf_range(-6.0, 6.0) * (1.3 - p.attr("sho") / 100.0)
	# far shots need a little air to reach
	var d := p.pos.distance_to(target)
	if d > 150.0:
		lift += (d - 150.0) * 0.15
	teams[p.team_index].stats["shots"] += 1
	return {"dir": dir, "power": power, "lift": lift, "target": target}


# ---------------------------------------------------------------------------
# Event hooks from players
# ---------------------------------------------------------------------------

func on_possession(p: Footballer) -> void:
	if not _pending_pass.is_empty():
		if _pending_pass["team"] == p.team_index and _pending_pass["from"] != p:
			teams[p.team_index].stats["pass_ok"] += 1
			pass_chain[p.team_index] = int(pass_chain[p.team_index]) + 1
			if int(pass_chain[p.team_index]) == 5:
				_say("chain", p.team_index)
		elif _pending_pass["team"] != p.team_index:
			_say("intercept", p.team_index)
		_pending_pass = {}
	if ball.last_touch_team != p.team_index:
		pass_chain[1 - p.team_index] = 0
	if humans.has(p.team_index):
		humans[p.team_index].on_teammate_got_ball(p)


## A human passed toward `target`: the controller follows the ball to the receiver at once.
func on_human_pass(p: Footballer, target: Footballer) -> void:
	if humans.has(p.team_index):
		humans[p.team_index].pre_select(target)


func on_kick(p: Footballer, kind: String, power: float) -> void:
	Sfx.play("kick_soft" if power < 240.0 else "kick_hard", p.pos)
	if kind == "shot":
		_say("shot", p.team_index)
		_track_shot(p)
	_puff(ball.pos, 0.6)


var _shot_tracker: Dictionary = {}

func _track_shot(p: Footballer) -> void:
	_shot_tracker = {"team": p.team_index, "t": 0.0, "resolved": false}


func on_tackle(tackler: Footballer, holder: Footballer, success: bool) -> void:
	teams[tackler.team_index].stats["tackles"] += 1
	if success:
		Sfx.play("tackle", tackler.pos)
		_say("tackle", tackler.team_index)
		_puff(tackler.pos, 1.0)
		pass_chain[holder.team_index] = 0
		# a slide from behind inside play is a foul (kept simple and readable)
		var from_behind := (holder.pos - tackler.pos).normalized().dot(holder.facing) > 0.6
		if tackler.state == Footballer.State.SLIDE and from_behind and rng.randf() < 0.55:
			_foul(tackler, holder)


func _foul(tackler: Footballer, victim: Footballer) -> void:
	teams[tackler.team_index].stats["fouls"] += 1
	Sfx.play("whistle_short")
	_say("foul", victim.team_index)
	var own_box := keeper_zone(tackler.team_index)
	var kind := "penalty" if own_box.grow(8.0).has_point(ball.pos) else "freekick"
	_start_setpiece(kind, victim.team_index, ball.pos)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

func _physics_process(delta: float) -> void:
	if phase == Phase.PAUSED:
		return
	var dt := delta * time_scale
	phase_t += dt
	match phase:
		Phase.INTRO:
			cam.intro_tick(dt, phase_t / maxf(0.1, intro_seconds))
			if phase_t > intro_seconds or (Game.qa_mode and not Game.qa_intro) or intro_skip or Game.attract_mode:
				cam.end_intro()
				_kickoff(0 if config.get("kickoff_home", true) else 1)
		Phase.KICKOFF:
			_step_kickoff(dt)
		Phase.PLAY:
			_step_play(dt)
		Phase.GOAL:
			_step_goal_celebration(dt)
		Phase.SETPIECE:
			_step_setpiece(dt)
		Phase.HALFTIME:
			if phase_t > 3.0 or Game.qa_mode:
				_second_half()
		Phase.FULLTIME:
			pass


func _enter_phase(p: Phase) -> void:
	phase = p
	phase_t = 0.0
	phase_changed.emit(Phase.keys()[p])


func _step_sim(dt: float, players_act: bool) -> void:
	for t in teams:
		t.coordinate(ball)
	for i in humans.keys():
		humans[i].tick(dt)
	for p in all_players():
		if p.brain != null and not p.human_controlled:
			p.brain.tick(dt)
		p.step(dt)
	ball.step(dt, posts)
	_keeper_hands(dt)
	cam.follow(dt)


func _step_kickoff(dt: float) -> void:
	ball_in_play = false
	_step_sim(dt, true)
	# the taker kicks after a short pause (AI) or when the human passes/shoots
	var taker: Footballer = setpiece.get("taker")
	if taker == null:
		return
	if not taker.has_ball:
		taker.pos = ball.pos - Vector2(float(taker.attack_dir) * 9.0, 0)
		taker.facing = Vector2(float(taker.attack_dir), 0)
		if phase_t > 0.3:
			ball.owner_player = taker
			taker.has_ball = true
			ball.carry_to(taker.feet_point())
	elif taker.human_controlled:
		pass   # the human controller decides
	elif phase_t > 1.2 and taker.brain != null:
		taker.brain.force = {"in_pass": true, "in_move": Vector2(-float(taker.attack_dir) * 0.3, 1.0 if taker.pos.y < pitch_rect.get_center().y else -1.0)}
	if taker.state == Footballer.State.KICK or (ball_in_play == false and not taker.has_ball and ball.owner_player == null and ball.vel.length() > 10.0):
		_resume_play()


func _resume_play() -> void:
	ball_in_play = true
	setpiece = {}
	_enter_phase(Phase.PLAY)
	for p in all_players():
		p.in_face = Vector2.ZERO


func _step_play(dt: float) -> void:
	ball_in_play = true
	elapsed_real += dt / maxf(0.05, time_scale)
	_step_sim(dt, true)
	_check_goal()
	if phase != Phase.PLAY:
		return
	_check_out()
	if phase != Phase.PLAY:
		return
	_shot_outcome(dt)
	_tick_pass_timer(dt)
	_tick_clock()
	# end of half: at the next dead ball, or after a short grace period
	if elapsed_real >= half_real_seconds:
		var grace := elapsed_real - half_real_seconds
		if ball.owner_player == null and ball.vel.length() < 40.0 or grace > 12.0:
			_end_half()


func _tick_pass_timer(dt: float) -> void:
	if not _pending_pass.is_empty():
		_pending_pass["t"] = float(_pending_pass["t"]) + dt
		if float(_pending_pass["t"]) > 3.0:
			_pending_pass = {}


func _tick_clock() -> void:
	clock_changed.emit(clock_text())


func clock_text() -> String:
	var minutes := (elapsed_real / half_real_seconds) * DISPLAY_MINUTES_PER_HALF
	minutes = minf(minutes, DISPLAY_MINUTES_PER_HALF + 5.0)
	var total := minutes + (DISPLAY_MINUTES_PER_HALF if half == 2 else 0.0)
	var mm := int(total)
	var ss := int((total - mm) * 60.0)
	return "%02d:%02d" % [mm, ss]


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------

func _check_goal() -> void:
	for gi in range(2):
		var g := goal_left if gi == 0 else goal_right
		var inside_y := absf(ball.pos.y - g.y) < _goal_half - 1.0
		var crossed := (ball.pos.x < g.x - Ball.RADIUS) if gi == 0 else (ball.pos.x > g.x + Ball.RADIUS)
		var came_from_front := (ball.pos.x - ball.vel.x * (1.0 / 60.0)) >= g.x - Ball.RADIUS if gi == 0 else (ball.pos.x - ball.vel.x * (1.0 / 60.0)) <= g.x + Ball.RADIUS
		if crossed and inside_y and came_from_front:
			if ball.h < _goal_h - 1.0:
				# GOAL for the team attacking this goal
				var scorer_team := 1 if gi == 0 else 0
				for t in teams:
					if goal_center(t.index, false) == g:
						scorer_team = t.index
				_goal(scorer_team)
				return
			elif ball.h < _goal_h + 3.0:
				# crossbar
				ball.vel.x = -ball.vel.x * 0.55
				ball.vh = -absf(ball.vh) * 0.4 - 20.0
				ball.pos.x = g.x + (Ball.RADIUS + 0.5) * (1.0 if gi == 0 else -1.0)
				ball.hit_post.emit()
				return


func _goal(team_index: int) -> void:
	teams[team_index].score += 1
	var scorer: Footballer = ball.last_touch
	var own_goal := scorer != null and scorer.team_index != team_index
	if _shot_tracker.get("team", -1) == team_index:
		teams[team_index].stats["on_target"] += 1
		_shot_tracker["resolved"] = true
	score_changed.emit(teams[0].score, teams[1].score)
	Sfx.play("goal")
	Sfx.play("whistle_short")
	_say("own_goal" if own_goal else "goal", team_index, {"name": (Content.display_name(scorer.data) if scorer != null else "")})
	result_add_goal(team_index, scorer, own_goal)
	ball.owner_player = null
	ball.vel *= 0.3
	for p in all_players():
		if p.has_ball:
			p.lose_ball()
		if p.team_index == team_index:
			p.celebrate(true)
		else:
			p.sad()
	$World/Stadium.crowd_cheer(team_index == 0)
	setpiece = {"kind": "kickoff", "team": 1 - team_index}
	_enter_phase(Phase.GOAL)


var goals_log: Array = []

func result_add_goal(team_index: int, scorer, own_goal: bool) -> void:
	goals_log.append({"team": team_index, "scorer": (Content.full_name(scorer.data) if scorer != null else "?"), "own": own_goal, "clock": clock_text(), "half": half})


func _step_goal_celebration(dt: float) -> void:
	# players keep animating, ball settles in the net
	for p in all_players():
		p.step(dt)
	ball.step(dt, posts)
	_contain_ball_in_net()
	cam.follow(dt)
	if phase_t > (0.4 if Game.qa_mode else 3.2):
		for p in all_players():
			p.celebrate(false)
		_kickoff(setpiece["team"])


func _contain_ball_in_net() -> void:
	# the net stops the ball a little behind the line
	if ball.pos.x < goal_left.x - 11.0:
		ball.pos.x = goal_left.x - 11.0
		ball.vel = Vector2.ZERO
	if ball.pos.x > goal_right.x + 11.0:
		ball.pos.x = goal_right.x + 11.0
		ball.vel = Vector2.ZERO


func _check_out() -> void:
	var r := pitch_rect
	var margin := Ball.RADIUS + 0.5
	if ball.pos.y < r.position.y - margin or ball.pos.y > r.end.y + margin:
		var y := r.position.y if ball.pos.y < r.position.y else r.end.y
		var team := 1 - ball.last_touch_team if ball.last_touch_team >= 0 else 0
		Sfx.play("whistle_short")
		_say("out", team)
		_start_setpiece("kickin", team, Vector2(clampf(ball.pos.x, r.position.x + 4.0, r.end.x - 4.0), y))
		return
	if ball.pos.x < r.position.x - margin or ball.pos.x > r.end.x + margin:
		# over a goal line but not in the goal (goals were checked first)
		var left := ball.pos.x < r.position.x
		var defending_team := -1
		for t in teams:
			var own := goal_center(t.index, true)
			if (left and own == goal_left) or (not left and own == goal_right):
				defending_team = t.index
		var attacking_team := 1 - defending_team
		if ball.last_touch_team == attacking_team or ball.last_touch_team < 0:
			Sfx.play("whistle_short")
			_say("goalkick", defending_team)
			var gx := (r.position.x if left else r.end.x) + (5.0 * Content.ppm()) * (1.0 if left else -1.0)
			_start_setpiece("goalkick", defending_team, Vector2(gx, r.get_center().y + (rng.randf_range(-20, 20))))
		else:
			Sfx.play("whistle_short")
			_say("corner", attacking_team)
			teams[attacking_team].stats["corners"] += 1
			var cy := r.position.y if ball.pos.y < r.get_center().y else r.end.y
			_start_setpiece("corner", attacking_team, Vector2(r.position.x if left else r.end.x, cy))


func _start_setpiece(kind: String, team: int, at: Vector2) -> void:
	ball_in_play = false
	for p in all_players():
		if p.has_ball:
			p.lose_ball()
	ball.owner_player = null
	ball.place(at)
	if kind == "penalty":
		var g := goal_center(team, false)
		var spot := Vector2(g.x - float(teams[team].attack_dir) * 6.0 * Content.ppm(), g.y)
		ball.place(spot)
	var taker: Footballer = teams[team].keeper if kind == "goalkick" else nearest_to_ball(team)
	if humans.has(team) and kind != "goalkick":
		humans[team].select(taker)
	setpiece = {"kind": kind, "team": team, "pos": ball.pos, "taker": taker, "ready": false}
	_pending_pass = {}
	_enter_phase(Phase.SETPIECE)


func _step_setpiece(dt: float) -> void:
	var taker: Footballer = setpiece.get("taker")
	var team: int = setpiece["team"]
	var kind: String = setpiece["kind"]
	if taker == null:
		taker = nearest_to_ball(team, null, true)
		if taker == null:
			_resume_play()
			return
		setpiece["taker"] = taker
	# everybody repositions: the taker goes to the ball, opponents keep 5 m away
	for t in teams:
		t.coordinate(ball)
	for p in all_players():
		if p.human_controlled and p != taker and humans.has(p.team_index):
			humans[p.team_index].tick(dt)
		elif p.brain != null:
			p.brain.tick(dt)
		if p == taker and not setpiece["ready"]:
			var approach := ball.pos - Vector2(float(taker.attack_dir) * 8.0, 0.0)
			if kind == "corner":
				approach = ball.pos + Vector2(float(-taker.attack_dir) * 6.0, 6.0 * (1.0 if ball.pos.y < pitch_rect.get_center().y else -1.0))
			p.in_move = (approach - p.pos).normalized() * clampf((approach - p.pos).length() / 10.0, 0.0, 1.0)
			p.in_sprint = (approach - p.pos).length() > 40.0
			p.in_pass = false
			p.in_shoot = false
			p.in_through = false
		elif p == taker:
			pass   # the restart intent comes from the brain (force) or the human
		elif p.team_index != team:
			var d: float = p.pos.distance_to(ball.pos)
			if d < 42.0:
				p.in_move = (p.pos - ball.pos).normalized()
				p.in_sprint = false
		p.step(dt)
	ball.step(dt, posts)
	cam.follow(dt)
	# give the ball to the taker once he is there
	if not setpiece["ready"] and taker.pos.distance_to(ball.pos) < 14.0 and phase_t > 0.4:
		taker.vel = Vector2.ZERO
		taker.facing = (goal_center(team, false) - taker.pos).normalized() if kind != "goalkick" else Vector2(float(taker.attack_dir), 0)
		if kind == "corner":
			taker.facing = (pitch_rect.get_center() - taker.pos).normalized()
		ball.owner_player = taker
		taker.has_ball = true
		ball.carry_to(taker.feet_point())
		setpiece["ready"] = true
		setpiece["ready_t"] = 0.0
		if humans.has(team):
			humans[team].select(taker)
	if setpiece["ready"]:
		setpiece["ready_t"] = float(setpiece["ready_t"]) + dt
		if not taker.human_controlled and float(setpiece["ready_t"]) > 0.8 and taker.brain != null:
			# impose the restart on the brain for the next tick (its tick runs before step)
			if kind == "penalty":
				taker.brain.force = {"in_shoot": true, "in_shoot_power": 0.75, "in_move": (goal_center(team, false) - taker.pos).normalized()}
			elif kind == "corner":
				taker.brain.force = {"in_through": true, "in_move": (goal_center(team, false) + Vector2(-float(taker.attack_dir) * 40.0, 0) - taker.pos).normalized()}
			elif kind == "goalkick":
				taker.brain.hold_t = 10.0   # keeper distributes at once
			else:
				var choice: Dictionary = _restart_choice(taker)
				taker.brain.force = choice
		if taker.state == Footballer.State.KICK or (not taker.has_ball and ball.owner_player != taker and ball.vel.length() > 5.0):
			_resume_play()
			return
	# a human taker may also dribble away from a kick-in / free kick
	if setpiece.get("ready", false) and taker.human_controlled and taker.pos.distance_to(setpiece["pos"]) > 16.0:
		_resume_play()


func _restart_choice(taker: Footballer) -> Dictionary:
	# free kick / kick-in: pass to the freest teammate, else play it forward
	var best: Footballer = null
	var best_s := -INF
	for t in teammates_of(taker):
		if t == taker or t.is_keeper:
			continue
		var free := INF
		for o in opponents_of(taker):
			free = minf(free, o.pos.distance_to(t.pos))
		var s: float = minf(free, 50.0) / 50.0 - taker.pos.distance_to(t.pos) / 400.0 + (t.pos.x - taker.pos.x) * float(taker.attack_dir) / 300.0
		if s > best_s:
			best_s = s
			best = t
	if best != null:
		return {"in_pass": true, "in_move": (best.pos - taker.pos).normalized()}
	return {"in_pass": true, "in_move": (goal_center(taker.team_index, false) - taker.pos).normalized()}


func _kickoff(team: int) -> void:
	ball_in_play = false
	ball.place(pitch_rect.get_center())
	_place_formation(false)
	var taker: Footballer = _kickoff_taker(team)
	setpiece = {"kind": "kickoff", "team": team, "taker": taker}
	if humans.has(team):
		humans[team].select(taker)
	_enter_phase(Phase.KICKOFF)


func _kickoff_taker(team: int) -> Footballer:
	var best: Footballer = null
	var bd := INF
	for p in teams[team].players:
		if p.is_keeper:
			continue
		var d := p.pos.distance_to(pitch_rect.get_center())
		if d < bd:
			bd = d
			best = p
	return best


func _place_formation(first: bool) -> void:
	for t in teams:
		for i in range(t.players.size()):
			var p: Footballer = t.players[i]
			var home := t.home_position(i, pitch_rect.get_center(), false)
			# own half only at kick-off
			var center_x := pitch_rect.get_center().x
			if t.attack_dir > 0:
				home.x = minf(home.x, center_x - 12.0)
			else:
				home.x = maxf(home.x, center_x + 12.0)
			p.teleport(home, Vector2(float(t.attack_dir), 0))
			p.lose_ball()
			p.freeze(false)
			p.stamina = minf(1.0, p.stamina + 0.15)
	ball.owner_player = null


func _end_half() -> void:
	Sfx.play("whistle_long")
	ball_in_play = false
	if half == 1:
		_say("halftime", -1)
		_enter_phase(Phase.HALFTIME)
	else:
		_full_time()


func _second_half() -> void:
	half = 2
	elapsed_real = 0.0
	for t in teams:
		t.attack_dir = -t.attack_dir
		for p in t.players:
			p.attack_dir = t.attack_dir
	_say("secondhalf", -1)
	_kickoff(1 if config.get("kickoff_home", true) else 0)


func _full_time() -> void:
	_enter_phase(Phase.FULLTIME)
	_say("fulltime", -1)
	var poss_total: float = maxf(1.0, teams[0].stats["possession"] + teams[1].stats["possession"])
	result = {
		"home": config["home"], "away": config["away"], "stadium": config["stadium"],
		"score": [teams[0].score, teams[1].score], "goals": goals_log,
		"stats": [teams[0].stats.duplicate(), teams[1].stats.duplicate()],
		"possession": [round(teams[0].stats["possession"] / poss_total * 100.0), round(teams[1].stats["possession"] / poss_total * 100.0)],
		"difficulty": config.get("difficulty", 2), "competition": config.get("competition", "friendly"),
		"date": Time.get_datetime_string_from_system(),
	}
	for p in all_players():
		if teams[0].score != teams[1].score:
			var won: bool = (p.team_index == 0) == (teams[0].score > teams[1].score)
			if won:
				p.celebrate(true)
			else:
				p.sad()
	Game.record_result(result)
	match_ended.emit(result)


func _shot_outcome(dt: float) -> void:
	if _shot_tracker.is_empty() or _shot_tracker.get("resolved", true):
		return
	_shot_tracker["t"] = float(_shot_tracker["t"]) + dt
	if float(_shot_tracker["t"]) > 2.5 or ball.owner_player != null:
		_shot_tracker["resolved"] = true


# ---------------------------------------------------------------------------
# Goalkeeper hands: catches and parries are resolved here (needs ball + keeper)
# ---------------------------------------------------------------------------

func _keeper_hands(dt: float) -> void:
	if not ball_in_play or ball.owner_player != null:
		return
	for t in teams:
		var k := t.keeper
		if k == null or k.state in [Footballer.State.FALL, Footballer.State.GETUP, Footballer.State.KICK, Footballer.State.GK_CATCH]:
			continue
		if ball.kick_cooldown > 0.0 and ball.last_kicker == k:
			continue
		var reach := (12.0 if k.state == Footballer.State.GK_SET else 9.5) if k.state != Footballer.State.GK_DIVE else 14.0
		var hands := k.pos + Vector2(float(-k.attack_dir) * 2.0, 0)
		if k.state == Footballer.State.GK_DIVE:
			hands += Vector2(0, float(k.dive_dir) * 7.0)
		# the body counts too: a ball through the keeper is a block, not a goal
		var body_block := k.pos.distance_to(ball.pos) < 5.5 and ball.h < 22.0
		if (hands.distance_to(ball.pos) > reach or ball.h > 24.0) and not body_block:
			continue
		var speed := ball.vel.length()
		var catch_skill := k.attr("gk")
		var catch_chance := clampf(1.15 - speed / (260.0 + catch_skill * 2.2), 0.08, 0.95)
		if k.state == Footballer.State.GK_DIVE:
			catch_chance *= 0.6
		ball.touch(k)
		if rng.randf() < catch_chance:
			k.has_ball = true
			ball.owner_player = k
			ball.vel = Vector2.ZERO
			ball.vh = 0.0
			ball.h = 0.0
			k.keeper_catch()
			if _shot_tracker.get("team", -1) == 1 - k.team_index and not _shot_tracker.get("resolved", true):
				teams[1 - k.team_index].stats["on_target"] += 1
				_shot_tracker["resolved"] = true
			Sfx.play("catch", k.pos)
			_say("save", k.team_index)
			if k.brain != null:
				k.brain.hold_t = 0.0
		else:
			# parry away from goal
			var away := Vector2(float(k.attack_dir), rng.randf_range(-1.0, 1.0)).normalized()
			ball.vel = away * maxf(90.0, speed * 0.45)
			ball.vh = 30.0
			ball.kick_cooldown = 0.2
			ball.last_kicker = k
			Sfx.play("catch", k.pos)
			_say("parry", k.team_index)
			if _shot_tracker.get("team", -1) == 1 - k.team_index and not _shot_tracker.get("resolved", true):
				teams[1 - k.team_index].stats["on_target"] += 1
				_shot_tracker["resolved"] = true


# ---------------------------------------------------------------------------
# Presentation helpers
# ---------------------------------------------------------------------------

func _on_ball_bounce(strength: float) -> void:
	if strength > 40.0:
		Sfx.play("bounce", ball.pos)
		_puff(ball.pos, clampf(strength / 120.0, 0.3, 1.0) * float(surface.get("dust", 1.0)))


func _puff(at: Vector2, strength: float) -> void:
	if strength <= 0.05 or Game.settings.get("reduced_motion", false):
		return
	var d := float(surface.get("dust", 1.0))
	if d <= 0.0 and not surface.has("splash"):
		return
	var puff := DustPuff.new()
	puff.position = at
	puff.strength = strength
	puff.splash = surface.has("splash")
	fx.add_child(puff)


var _last_say: Dictionary = {}

func _say(kind: String, team: int, vars: Dictionary = {}) -> void:
	# commentary lines are keyed in strings.json as "com.<kind>.<n>"; pick one at random
	var now := Time.get_ticks_msec()
	if _last_say.get(kind, -100000) > now - 1500 and kind not in ["goal", "halftime", "fulltime"]:
		return
	_last_say[kind] = now
	var n := 1
	while Loc.t("com.%s.%d" % [kind, n + 1]) != "com.%s.%d" % [kind, n + 1]:
		n += 1
	var key := "com.%s.%d" % [kind, rng.randi_range(1, n)]
	var text := Loc.t(key, vars)
	if text == key:
		text = kind
	if team >= 0:
		vars["team"] = teams[team].data.get("name", "")
		text = text.replace("{team}", teams[team].data.get("name", ""))
	event.emit(kind, text, team)


func pause(on: bool) -> void:
	if on and phase != Phase.PAUSED and phase != Phase.FULLTIME:
		_prev_phase = phase
		phase = Phase.PAUSED
		phase_changed.emit("PAUSED")
	elif not on and phase == Phase.PAUSED:
		phase = _prev_phase
		phase_changed.emit(Phase.keys()[phase])

var _prev_phase: Phase = Phase.PLAY


func controlled_player(team_index: int) -> Footballer:
	if humans.has(team_index):
		return humans[team_index].current
	return null


func is_setpiece_wait() -> bool:
	return phase == Phase.KICKOFF or (phase == Phase.SETPIECE and setpiece.get("ready", false))
