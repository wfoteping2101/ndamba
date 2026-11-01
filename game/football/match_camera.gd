class_name MatchCamera
extends Camera2D
## Follows the ball with a little look-ahead, never leaves the world, stays calm.

const ZOOM := 1.25

var m
var _target: Vector2 = Vector2.ZERO
var shake: float = 0.0


func setup(p_match) -> void:
	m = p_match
	var ws: Vector2 = Content.world_size()
	limit_left = 0
	limit_top = 0
	limit_right = int(ws.x)
	limit_bottom = int(ws.y)
	position_smoothing_enabled = false
	_target = Content.pitch_rect().get_center()
	position = _target
	zoom = Vector2.ONE * ZOOM
	make_current()


func follow(dt: float) -> void:
	if m == null or m.ball == null:
		return
	var ball: Ball = m.ball
	var look := ball.pos + ball.vel * 0.28
	# bias a little toward the attacking goal of the team in possession
	if ball.owner_player != null:
		look.x += float(ball.owner_player.attack_dir) * 18.0
	var vp := get_viewport_rect().size / zoom
	var ws: Vector2 = Content.world_size()
	look.x = clampf(look.x, vp.x * 0.5, ws.x - vp.x * 0.5)
	look.y = clampf(look.y, vp.y * 0.5, ws.y - vp.y * 0.5)
	# critically damped-ish smoothing, faster when far away
	var k := 4.5 if _target.distance_to(look) > 120.0 else 3.2
	_target = _target.lerp(look, clampf(k * dt, 0.0, 1.0))
	var p := _target
	if shake > 0.0:
		p += Vector2(randf_range(-1, 1), randf_range(-1, 1)) * shake
		shake = maxf(0.0, shake - dt * 6.0)
	position = p.round()
