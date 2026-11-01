class_name Ball
extends Node2D
## The ball: a simulated point with ground position, height and velocity. Fixed timestep
## (called from the match's _physics_process). Surface physics are data driven.

signal bounced(strength: float)
signal hit_post
signal kicked(by, power: float)

const GRAVITY := 78.5          # px/s^2 (9.81 m/s^2 at 8 px/m)
const RADIUS := 3.0
const MAX_SPEED := 520.0

var pos: Vector2 = Vector2.ZERO    # ground position (world px)
var h: float = 0.0                 # height above ground (px)
var vel: Vector2 = Vector2.ZERO
var vh: float = 0.0
var spin: float = 0.0              # visual roll
var owner_player = null            # Footballer controlling the ball, or null
var last_touch = null              # Footballer who last touched the ball
var last_touch_team: int = -1
var last_kicker = null
var kick_cooldown: float = 0.0     # seconds during which the kicker cannot re-control
var surface: Dictionary = {"roll": 150.0, "drag": 0.55, "bounce": 0.52, "bounce_drag": 0.82}
var rolling_dist: float = 0.0
var out_of_play: bool = false

var _sprite: Sprite2D
var _shadow: Sprite2D
var _frame_t: float = 0.0


func _ready() -> void:
	_shadow = Sprite2D.new()
	_shadow.texture = load("res://assets/fx/ball.png")
	_shadow.hframes = 5
	_shadow.frame = 4
	_shadow.z_index = -1
	add_child(_shadow)
	_sprite = Sprite2D.new()
	_sprite.texture = load("res://assets/fx/ball.png")
	_sprite.hframes = 5
	add_child(_sprite)
	_update_visual()


func set_surface(s: Dictionary) -> void:
	surface = s


func place(p: Vector2, height: float = 0.0) -> void:
	pos = p
	h = height
	vel = Vector2.ZERO
	vh = 0.0
	owner_player = null
	_update_visual()


func speed() -> float:
	return vel.length()


func in_air() -> bool:
	return h > 1.5


## Kick with a ground impulse (px/s) and vertical speed (px/s).
func kick(direction: Vector2, power: float, lift: float, by = null) -> void:
	vel = direction.normalized() * minf(power, MAX_SPEED)
	vh = lift
	if vh > 0.0:
		h = maxf(h, 0.5)
	owner_player = null
	if by != null:
		last_touch = by
		last_touch_team = by.team_index
		last_kicker = by
		kick_cooldown = 0.22
	kicked.emit(by, power)


func touch(by) -> void:
	last_touch = by
	last_touch_team = by.team_index


## Predict the ground position after t seconds (ignores bounces; good enough for AI).
func predict(t: float) -> Vector2:
	var v := vel
	var p := pos
	var dt := 1.0 / 30.0
	var elapsed := 0.0
	var roll: float = surface.get("roll", 150.0)
	var drag: float = surface.get("drag", 0.55)
	while elapsed < t and v.length() > 1.0:
		var sp := v.length()
		var dec := roll * (0.35 if h > 1.5 else 1.0) + drag * sp
		var nsp := maxf(0.0, sp - dec * dt)
		v = v.normalized() * nsp
		p += v * dt
		elapsed += dt
	return p


## Time for the ball to reach (approximately) a point along its path, or -1 if it stops first.
func time_to_reach(target: Vector2, tolerance: float = 10.0) -> float:
	var v := vel
	var p := pos
	var dt := 1.0 / 30.0
	var elapsed := 0.0
	var roll: float = surface.get("roll", 150.0)
	var drag: float = surface.get("drag", 0.55)
	var best := -1.0
	var best_d := INF
	while elapsed < 4.0:
		var d := p.distance_to(target)
		if d < best_d:
			best_d = d
			best = elapsed
		if d < tolerance:
			return elapsed
		var sp := v.length()
		if sp < 2.0:
			break
		var dec := roll * (0.35 if h > 1.5 else 1.0) + drag * sp
		v = v.normalized() * maxf(0.0, sp - dec * dt)
		p += v * dt
		elapsed += dt
	return best if best_d < tolerance * 3.0 else -1.0


func step(dt: float, posts: Array) -> void:
	kick_cooldown = maxf(0.0, kick_cooldown - dt)
	if owner_player != null:
		return
	# vertical
	if h > 0.0 or vh > 0.0:
		vh -= GRAVITY * dt
		h += vh * dt
		if h <= 0.0:
			h = 0.0
			if vh < -25.0:
				var strength: float = -vh
				vh = -vh * float(surface.get("bounce", 0.5))
				vel *= float(surface.get("bounce_drag", 0.8))
				bounced.emit(strength)
				if vh < 12.0:
					vh = 0.0
			else:
				vh = 0.0
	# ground friction (air: only drag)
	var sp := vel.length()
	if sp > 0.0:
		var dec: float
		if h > 1.5:
			dec = float(surface.get("drag", 0.5)) * sp * 0.6 + 8.0
		else:
			dec = float(surface.get("roll", 150.0)) + float(surface.get("drag", 0.55)) * sp
		var nsp := maxf(0.0, sp - dec * dt)
		vel = vel.normalized() * nsp
	var prev := pos
	pos += vel * dt
	rolling_dist += vel.length() * dt
	# goal posts: circles in world space [Vector2 position, radius]
	for post in posts:
		var pp: Vector2 = post[0]
		var pr: float = post[1]
		var ph: float = post[2]    # post height; ball above it is free
		if h > ph:
			continue
		var d := pos.distance_to(pp)
		if d < pr + RADIUS:
			var n := (pos - pp).normalized()
			if n == Vector2.ZERO:
				n = Vector2.RIGHT
			pos = pp + n * (pr + RADIUS + 0.1)
			var vn := vel.dot(n)
			if vn < 0.0:
				vel -= 1.85 * vn * n
				vel *= 0.75
				hit_post.emit()
	if vel.length() < 2.0 and h <= 0.0:
		vel = Vector2.ZERO
	spin += vel.length() * dt * 0.06
	_update_visual()


func _update_visual() -> void:
	position = Vector2(round(pos.x), round(pos.y - h))
	_shadow.position = Vector2(0, h)
	_shadow.scale = Vector2.ONE * clampf(1.0 - h / 120.0, 0.45, 1.0)
	_shadow.modulate.a = clampf(1.0 - h / 90.0, 0.35, 1.0)
	if _sprite:
		_sprite.frame = int(spin) % 4
	z_index = 2 if h > 14.0 else 0


func carry_to(p: Vector2) -> void:
	pos = p
	h = 0.0
	vel = Vector2.ZERO
	vh = 0.0
	spin += 0.15
	_update_visual()
