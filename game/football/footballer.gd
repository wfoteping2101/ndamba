class_name Footballer
extends Node2D
## One player on the pitch: movement, ball control, actions, animation. Driven by an intent
## that is filled each tick either by the human controller or by the AI brain.

signal action_done(kind: String)

enum State { MOVE, KICK, TACKLE, SLIDE, FALL, GETUP, JUMP, CELEBRATE, SAD, GK_SET, GK_DIVE, GK_CATCH, FROZEN }

const DIRS := ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
const CONTROL_RADIUS := 8.5           # AI players (about 1 m from the feet point)
const HUMAN_CONTROL_RADIUS := 13.0    # the controlled player collects from further away
const MAGNET_RADIUS := 24.0           # soft collection zone for the controlled player
const CONTROL_HEIGHT := 11.0
const FEET_OFFSET := 5.5

var data: Dictionary = {}
var attrs: Dictionary = {}
var team_index: int = 0
var role: String = "MID"
var number: int = 0
var is_keeper: bool = false
var match_ref = null
var ball: Ball = null
var brain = null                  # AiBrain or KeeperBrain (null for a human-controlled player)
var human_controlled: bool = false
var home_pos: Vector2 = Vector2.ZERO   # formation anchor (relative to attacking direction)
var attack_dir: int = 1           # +1 attacks toward +x, -1 toward -x

# Intent for this tick
var in_move: Vector2 = Vector2.ZERO
var in_sprint: bool = false
var in_pass: bool = false
var in_through: bool = false
var in_shoot: bool = false
var in_shoot_power: float = 0.0
var in_tackle: bool = false
var in_slide: bool = false
var in_face: Vector2 = Vector2.ZERO    # preferred facing when still

# Physical state
var pos: Vector2 = Vector2.ZERO
var vel: Vector2 = Vector2.ZERO
var facing: Vector2 = Vector2.RIGHT
var state: State = State.MOVE
var state_t: float = 0.0
var stamina: float = 1.0
var charge: float = 0.0
var charging: bool = false
var has_ball: bool = false
var control_lock: float = 0.0     # seconds before this player can take the ball again
var stun: float = 0.0
var dive_dir: int = 0
var catch_hold: float = 0.0
var surface_speed: float = 1.0
var speed_boost: float = 1.0      # difficulty handicap for the AI
var dust_t: float = 0.0
var celebrate_t: float = 0.0

var sprite: AnimatedSprite2D
var shadow: Sprite2D
var _anim_name: String = ""
var _dir_name: String = "S"
var _kick_pending: Dictionary = {}
var _tackle_hit: bool = false

static var _shadow_tex: Texture2D = null


func setup(p_data: Dictionary, p_team: int, p_kit: Dictionary, p_keeper: bool, p_match) -> void:
	data = p_data
	attrs = p_data.get("attrs", {})
	team_index = p_team
	role = "GK" if p_keeper else p_data.get("role", "MID")
	number = int(p_data.get("number", 0))
	is_keeper = p_keeper
	match_ref = p_match
	name = "P_%d_%s" % [p_team, p_data.get("id", "x")]
	var hair: String = p_data.get("hair", "short")
	var pattern: String = p_kit.get("pattern", "plain")
	if pattern == "rags":
		pattern = p_data.get("shirt_pattern", "plain")
	var sheet: String = ("gk_" + hair) if p_keeper else ("%s_%s" % [hair, pattern])
	sprite = AnimatedSprite2D.new()
	sprite.sprite_frames = Sprites.player_frames(sheet)
	sprite.offset = Sprites.feet_offset() + Vector2(Sprites.half_cell(), 0)
	sprite.centered = false
	sprite.position = Vector2(-Sprites.half_cell(), 0)
	sprite.material = Sprites.palette_material(Sprites.player_palette(p_kit, p_data, p_keeper))
	sprite.play("idle_S")
	if _shadow_tex == null:
		var img := Image.create(16, 8, false, Image.FORMAT_RGBA8)
		for y in range(8):
			for x in range(16):
				var dx := (x + 0.5 - 8.0) / 8.0
				var dy := (y + 0.5 - 4.0) / 4.0
				var r := dx * dx + dy * dy
				if r <= 1.0:
					img.set_pixel(x, y, Color(0.12, 0.05, 0.05, 0.42 if r < 0.6 else 0.22))
		_shadow_tex = ImageTexture.create_from_image(img)
	shadow = Sprite2D.new()
	shadow.texture = _shadow_tex
	shadow.position = Vector2(0, -1)
	shadow.z_index = -1
	add_child(shadow)
	add_child(sprite)


func attr(key: String, default: float = 50.0) -> float:
	return float(attrs.get(key, default))


## Max run speed in px/s (walk is slower, sprint faster).
func max_speed(sprint: bool) -> float:
	var base := 78.0 + attr("spd") * 0.55       # 94..130
	if sprint:
		base += 22.0 + attr("spd") * 0.25        # +34..46
	base *= surface_speed * speed_boost
	base *= 0.72 + 0.28 * stamina
	if has_ball:
		base *= 0.90 + attr("ctl") * 0.0012       # dribblers lose less speed
	return base


func acceleration() -> float:
	return 520.0 + attr("acc") * 5.0


func dir_name_for(v: Vector2) -> String:
	var a := atan2(v.y, v.x)   # screen space: +y down
	var idx := int(round((a + PI / 2.0) / (PI / 4.0)))   # 0 = S
	idx = ((idx % 8) + 8) % 8
	return DIRS[idx]


func feet_point() -> Vector2:
	return pos + facing * FEET_OFFSET


func control_radius() -> float:
	return HUMAN_CONTROL_RADIUS if human_controlled else CONTROL_RADIUS


func can_act() -> bool:
	return state == State.MOVE or state == State.GK_SET


func busy() -> bool:
	return state in [State.KICK, State.TACKLE, State.SLIDE, State.FALL, State.GETUP, State.JUMP, State.GK_DIVE, State.GK_CATCH, State.FROZEN]


func clear_intent() -> void:
	in_move = Vector2.ZERO
	in_sprint = false
	in_pass = false
	in_through = false
	in_shoot = false
	in_shoot_power = 0.0
	in_tackle = false
	in_slide = false


func freeze(on: bool) -> void:
	if on:
		state = State.FROZEN
		vel = Vector2.ZERO
	elif state == State.FROZEN:
		state = State.MOVE
	state_t = 0.0


func teleport(p: Vector2, face: Vector2 = Vector2.ZERO) -> void:
	pos = p
	vel = Vector2.ZERO
	if face != Vector2.ZERO:
		facing = face.normalized()
	_update_visual()


# ---------------------------------------------------------------------------
# Simulation step
# ---------------------------------------------------------------------------

func step(dt: float) -> void:
	if match_ref != null and sprite != null and sprite.speed_scale != match_ref.time_scale:
		sprite.speed_scale = match_ref.time_scale
	state_t += dt
	control_lock = maxf(0.0, control_lock - dt)
	stun = maxf(0.0, stun - dt)
	match state:
		State.MOVE, State.GK_SET:
			_step_move(dt)
		State.KICK:
			_step_kick(dt)
		State.TACKLE:
			_step_tackle(dt)
		State.SLIDE:
			_step_slide(dt)
		State.FALL:
			_decel(dt, 900.0)
			if state_t > 0.55:
				_enter(State.GETUP)
		State.GETUP:
			vel = Vector2.ZERO
			if state_t > 0.4:
				_enter(State.MOVE)
		State.JUMP:
			_decel(dt, 300.0)
			if state_t > 0.5:
				_enter(State.MOVE)
		State.CELEBRATE, State.SAD:
			_decel(dt, 600.0)
		State.GK_DIVE:
			_step_dive(dt)
		State.GK_CATCH:
			vel = Vector2.ZERO
			catch_hold -= dt
			if catch_hold <= 0.0:
				_enter(State.MOVE)
		State.FROZEN:
			vel = Vector2.ZERO
	_apply_motion(dt)
	_stamina(dt)
	_ball_control(dt)
	_update_visual()


func _enter(s: State) -> void:
	state = s
	state_t = 0.0


func _decel(dt: float, rate: float) -> void:
	var sp := vel.length()
	if sp > 0.0:
		vel = vel.normalized() * maxf(0.0, sp - rate * dt)


func _step_move(dt: float) -> void:
	var want := in_move
	if want.length() > 1.0:
		want = want.normalized()
	var target_speed := max_speed(in_sprint and want.length() > 0.3) * want.length()
	var target_vel := want * target_speed
	if stun > 0.0:
		target_vel = Vector2.ZERO
	var acc := acceleration()
	if want.length() < 0.05:
		acc *= 1.6     # braking is quicker than accelerating
	vel = vel.move_toward(target_vel, acc * dt)
	if want.length() > 0.05:
		# turning while carrying the ball is a little slower (keeps dribbling honest)
		var turn := 14.0 if has_ball else 22.0
		facing = facing.slerp(want.normalized(), clampf(turn * dt, 0.0, 1.0)).normalized()
	elif in_face != Vector2.ZERO and not has_ball:
		facing = facing.slerp(in_face.normalized(), clampf(6.0 * dt, 0.0, 1.0)).normalized()
	# actions
	if in_shoot and has_ball:
		_do_shoot(in_shoot_power)
	elif in_through and has_ball:
		_do_pass(true)
	elif in_pass and has_ball:
		_do_pass(false)
	elif in_slide and not has_ball and not is_keeper:
		_enter(State.SLIDE)
		_tackle_hit = false
		var d := facing if want.length() < 0.1 else want.normalized()
		facing = d
		vel = d * (max_speed(true) * 1.15)
	elif in_tackle and not has_ball:
		_enter(State.TACKLE)
		_tackle_hit = false
		var d := facing if want.length() < 0.1 else want.normalized()
		facing = d
		vel = d * (max_speed(true) * 0.95)
	if is_keeper and state == State.MOVE and match_ref != null and match_ref.ball_in_play and want.length() < 0.05 and not has_ball:
		state = State.GK_SET


func _step_kick(dt: float) -> void:
	_decel(dt, 700.0)
	if state_t >= 0.08 and not _kick_pending.is_empty():
		_release_kick()
	if state_t > 0.20:
		_enter(State.MOVE)


func _step_tackle(dt: float) -> void:
	_decel(dt, 500.0)
	if not _tackle_hit and state_t < 0.26:
		_try_win_ball(1.0)
	if state_t > 0.32:
		_enter(State.MOVE)


func _step_slide(dt: float) -> void:
	_decel(dt, 320.0)
	if not _tackle_hit and state_t < 0.45:
		_try_win_ball(1.35)
	if state_t > 0.55:
		_enter(State.GETUP)
		control_lock = 0.1


func _step_dive(dt: float) -> void:
	_decel(dt, 220.0)
	if state_t > 0.55:
		_enter(State.GETUP)


func _apply_motion(dt: float) -> void:
	pos += vel * dt
	# keep players inside the world (they may leave the pitch, not the world)
	var ws: Vector2 = Content.world_size()
	pos.x = clampf(pos.x, 8.0, ws.x - 8.0)
	pos.y = clampf(pos.y, 60.0, ws.y - 8.0)
	if is_keeper and match_ref != null and match_ref.ball_in_play and state != State.GK_DIVE and not has_ball:
		# keepers stay in their own box area unless chasing a loose ball nearby
		var box: Rect2 = match_ref.keeper_zone(team_index)
		pos.x = clampf(pos.x, box.position.x, box.end.x)
		pos.y = clampf(pos.y, box.position.y, box.end.y)


func _stamina(dt: float) -> void:
	var sp := vel.length()
	if in_sprint and sp > 100.0:
		stamina = maxf(0.0, stamina - dt * (0.055 - attr("sta") * 0.00035))
	else:
		stamina = minf(1.0, stamina + dt * (0.02 + attr("sta") * 0.0002))


# ---------------------------------------------------------------------------
# Ball control
# ---------------------------------------------------------------------------

func _ball_control(dt: float) -> void:
	if ball == null:
		return
	if has_ball:
		if ball.owner_player != self:
			has_ball = false
			return
		# the ball sits in front of the feet; while sprinting it runs a little ahead
		var sp := vel.length()
		var ahead := FEET_OFFSET + (sp / 100.0) * (2.0 if in_sprint else 1.0)
		var target := pos + facing * ahead
		# surface noise makes dribbling honest on bad ground
		var err: float = float(ball.surface.get("dribble_error", 0.1)) * (sp / 130.0) * (1.0 - attr("ctl") / 110.0)
		if err > 0.0:
			target += Vector2(randf_range(-1, 1), randf_range(-1, 1)) * err * 6.0
		ball.carry_to(target)
		return
	if busy() and state != State.TACKLE and state != State.SLIDE:
		return
	if control_lock > 0.0 or ball.owner_player != null:
		return
	if ball.kick_cooldown > 0.0 and ball.last_kicker == self:
		return
	if match_ref != null and not match_ref.ball_in_play and match_ref.setpiece.get("taker") != self:
		return   # only the taker may touch a dead ball
	if ball.h > CONTROL_HEIGHT:
		return
	var fp := feet_point()
	var d := fp.distance_to(ball.pos)
	var body_d := pos.distance_to(ball.pos)
	var radius := control_radius()
	if d < radius or body_d < radius * 0.9:
		_take_ball()
	elif human_controlled and body_d < MAGNET_RADIUS and ball.h < CONTROL_HEIGHT:
		# soft collection: a ball near the controlled player drifts toward his feet when he
		# moves toward it (or when it is slowing down next to him), like a good first touch
		var toward := (ball.pos - pos).normalized()
		var moving_to_it: bool = in_move.length() > 0.1 and in_move.normalized().dot(toward) > 0.3
		var approaching: bool = ball.vel.length() > 1.0 and ball.vel.normalized().dot(-toward) > 0.6
		if moving_to_it or approaching or ball.vel.length() < 60.0:
			var pull := (fp - ball.pos).normalized() * 110.0
			ball.vel = ball.vel.lerp(pull, clampf(7.0 * dt, 0.0, 1.0))


func _take_ball() -> void:
	# A fast ball is harder to control: weak controllers let it bounce off.
	var incoming := ball.vel.length()
	var skill := attr("ctl")
	var fail_chance := clampf((incoming - 260.0) / 420.0, 0.0, 0.5) * (1.2 - skill / 100.0)
	if ball.h > 4.0:
		fail_chance += 0.08
	if state == State.TACKLE or state == State.SLIDE:
		fail_chance *= 0.5
	if human_controlled:
		fail_chance *= 0.35   # the player's own touch is the one that must feel reliable
	ball.touch(self)
	if randf() < fail_chance:
		# touch, but the ball squirts away
		var deflect := ball.vel.normalized().rotated(randf_range(-0.9, 0.9)) * incoming * 0.35
		ball.vel = deflect
		control_lock = 0.25
		ball.kick_cooldown = 0.1
		ball.last_kicker = self
		return
	has_ball = true
	ball.owner_player = self
	ball.vel = Vector2.ZERO
	ball.vh = 0.0
	ball.h = 0.0
	charge = 0.0
	if match_ref != null:
		match_ref.on_possession(self)
	if state == State.TACKLE or state == State.SLIDE:
		_tackle_hit = true


func lose_ball() -> void:
	if has_ball:
		has_ball = false
		if ball.owner_player == self:
			ball.owner_player = null
	control_lock = 0.35


func _try_win_ball(reach_mult: float) -> void:
	if ball == null:
		return
	var reach := CONTROL_RADIUS * reach_mult + 2.0
	var fp := feet_point()
	if fp.distance_to(ball.pos) > reach or ball.h > CONTROL_HEIGHT + 4.0:
		return
	var holder = ball.owner_player
	if holder != null and holder != self:
		if holder.team_index == team_index:
			return
		# duel: tackling vs ball control (+ a little luck)
		var p: float = 0.42 + (attr("tak") - holder.attr("ctl")) / 180.0
		if state == State.SLIDE:
			p += 0.1
		if holder.human_controlled and not human_controlled:
			p -= 0.1
		if brain != null and brain is AiBrain:
			p *= float(brain.profile.get("tackle_mult", 1.0))
		# a lunge from behind the dribbler rarely wins the ball cleanly
		var from_behind: bool = (pos - holder.pos).normalized().dot(holder.facing) < -0.3
		if from_behind:
			p *= 0.5
		# a dribbler who is moving away from the tackler is harder to catch
		if holder.vel.length() > 40.0 and holder.vel.normalized().dot((holder.pos - pos).normalized()) > 0.5:
			p -= 0.1
		p = clampf(p, 0.12, 0.85)
		_tackle_hit = true
		if randf() < p:
			holder.lose_ball()
			holder.stumble()
			ball.touch(self)
			# ball pops loose in front of the tackler (keepers always push it toward the pitch)
			var pop_dir := Vector2(float(attack_dir), 0) if is_keeper else facing
			ball.vel = pop_dir * 60.0 + Vector2(randf_range(-20, 20), randf_range(-20, 20))
			ball.kick_cooldown = 0.0
			ball.last_kicker = null
			control_lock = 0.0
			if match_ref != null:
				match_ref.on_tackle(self, holder, true)
		else:
			# failed tackle: the dribbler keeps it, tackler is beaten
			stun = 0.6
			if match_ref != null:
				match_ref.on_tackle(self, holder, false)
	else:
		# loose ball: just poke it
		_tackle_hit = true
		ball.touch(self)
		ball.vel = (Vector2(float(attack_dir), 0) if is_keeper else facing) * 90.0
		ball.kick_cooldown = 0.05


func stumble() -> void:
	if is_keeper:
		return
	_enter(State.FALL)
	vel = facing * 40.0


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

func _start_kick(direction: Vector2, power: float, lift: float, kind: String) -> void:
	facing = direction.normalized()
	_kick_pending = {"dir": facing, "power": power, "lift": lift, "kind": kind}
	_enter(State.KICK)
	vel *= 0.4
	clear_intent()


func _release_kick() -> void:
	var k := _kick_pending
	_kick_pending = {}
	if not has_ball:
		return
	has_ball = false
	ball.owner_player = null
	ball.pos = feet_point()
	ball.h = 0.0
	ball.kick(k["dir"], k["power"], k["lift"], self)
	control_lock = 0.2
	if match_ref != null:
		match_ref.on_kick(self, k["kind"], k["power"])
	action_done.emit(k["kind"])


func _do_pass(through: bool) -> void:
	if match_ref == null:
		return
	var aim: Vector2 = in_move if in_move.length() > 0.2 else facing
	var choice: Dictionary = match_ref.choose_pass(self, aim.normalized(), through)
	if human_controlled and choice.get("target") != null:
		match_ref.on_human_pass(self, choice["target"])
	var dir: Vector2 = choice["dir"]
	var power: float = choice["power"]
	var lift: float = choice["lift"]
	# passing skill: direction noise
	var noise := (1.0 - attr("pas") / 100.0) * 0.14
	dir = dir.rotated(randf_range(-noise, noise))
	_start_kick(dir, power, lift, "through" if through else "pass")


func _do_shoot(power01: float) -> void:
	if match_ref == null:
		return
	var aim: Vector2 = in_move if in_move.length() > 0.2 else facing
	var choice: Dictionary = match_ref.choose_shot(self, aim.normalized(), power01)
	var dir: Vector2 = choice["dir"]
	var noise := (1.0 - attr("sho") / 100.0) * 0.16 * (0.6 + power01)
	dir = dir.rotated(randf_range(-noise, noise))
	_start_kick(dir, choice["power"], choice["lift"], "shot")


func clear_ball(direction: Vector2) -> void:
	_start_kick(direction, 300.0, 70.0, "clear")


func keeper_distribute(direction: Vector2, power: float, lift: float) -> void:
	_start_kick(direction, power, lift, "keeper")


func start_dive(side: int, strength: float = 1.0) -> void:
	if state == State.GK_DIVE:
		return
	dive_dir = side
	_enter(State.GK_DIVE)
	# dive along the goal line (screen vertical), away from the pitch slightly
	var along := Vector2(0, side)
	vel = along * (150.0 + attr("gk") * 1.4) * strength
	control_lock = 0.0


func keeper_catch() -> void:
	_enter(State.GK_CATCH)
	catch_hold = 0.9
	vel = Vector2.ZERO


func celebrate(on: bool) -> void:
	if on:
		_enter(State.CELEBRATE)
	elif state == State.CELEBRATE or state == State.SAD:
		_enter(State.MOVE)


func sad() -> void:
	_enter(State.SAD)


# ---------------------------------------------------------------------------
# Animation
# ---------------------------------------------------------------------------

func _update_visual() -> void:
	position = Vector2(round(pos.x), round(pos.y))
	var sp := vel.length()
	var anim := "idle"
	var dir := facing
	match state:
		State.MOVE:
			if sp > 118.0 and in_sprint:
				anim = "sprint"
			elif sp > 28.0:
				anim = "run"
			elif sp > 6.0:
				anim = "walk"
			else:
				anim = "idle"
			if sp > 6.0:
				dir = vel
		State.KICK:
			anim = "kick"
		State.TACKLE:
			anim = "tackle"
		State.SLIDE:
			anim = "slide"
		State.FALL:
			anim = "fall"
		State.GETUP:
			anim = "getup"
		State.JUMP:
			anim = "jump"
		State.CELEBRATE:
			anim = "celebrate"
		State.SAD:
			anim = "sad"
		State.GK_SET:
			anim = "set"
		State.GK_DIVE:
			anim = "dive_l" if dive_dir < 0 else "dive_r"
			dir = Vector2(attack_dir, 0) * -1.0   # keepers face the pitch
		State.GK_CATCH:
			anim = "catch"
		State.FROZEN:
			anim = "idle"
	if is_keeper and state == State.GK_DIVE:
		# facing the pitch: the dive goes up (dive_r when facing E means to his right = up)
		pass
	var dn := dir_name_for(dir)
	if not sprite.sprite_frames.has_animation(anim + "_" + dn):
		anim = "idle"
	var full := anim + "_" + dn
	if full != _anim_name:
		var keep_frame := (anim == _anim_name.get_slice("_", 0)) and anim in ["run", "sprint", "walk", "idle"]
		var fr := sprite.frame
		var prog := sprite.frame_progress
		sprite.play(full)
		if keep_frame:
			sprite.set_frame_and_progress(fr, prog)
		_anim_name = full
		_dir_name = dn
	# bob the sprite up a little during jumps/celebrations
	var up := 0.0
	if state == State.JUMP and state_t > 0.12 and state_t < 0.4:
		up = 6.0
	sprite.position.y = -up
