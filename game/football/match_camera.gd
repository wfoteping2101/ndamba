class_name MatchCamera
extends Camera2D
## Follows the ball with a little look-ahead, never leaves the world, stays calm.
## Before kick-off it flies over the stadium (end to end, then settles on the centre circle).

const ZOOM_STREET := 1.25
const ZOOM_FULL := 1.0

var m
var _target: Vector2 = Vector2.ZERO
var shake: float = 0.0
var base_zoom: float = 1.0
var _intro: bool = false


func setup(p_match) -> void:
	m = p_match
	var ws: Vector2 = Content.world_size()
	limit_left = 0
	limit_top = 0
	limit_right = int(ws.x)
	limit_bottom = int(ws.y)
	position_smoothing_enabled = false
	base_zoom = ZOOM_FULL if Content.layout_name == "full" else ZOOM_STREET
	_target = Content.pitch_rect().get_center()
	position = _target
	zoom = Vector2.ONE * base_zoom
	make_current()


func _clamp_view(look: Vector2, z: float) -> Vector2:
	var vp := get_viewport_rect().size / z
	var ws: Vector2 = Content.world_size()
	look.x = clampf(look.x, vp.x * 0.5, ws.x - vp.x * 0.5)
	look.y = clampf(look.y, vp.y * 0.5, ws.y - vp.y * 0.5)
	return look


## Fly-over: t in 0..1. West goal -> east goal along the far touchline, then a slow push
## into the centre circle with the zoom settling to the match zoom.
func intro_tick(_dt: float, t: float) -> void:
	_intro = true
	var pr: Rect2 = Content.pitch_rect()
	var z: float
	var look: Vector2
	if t < 0.62:
		var u := smoothstep(0.0, 1.0, t / 0.62)
		z = base_zoom * 0.82
		look = Vector2(lerpf(pr.position.x - 20.0, pr.end.x + 20.0, u), pr.position.y + 30.0)
	else:
		var u := smoothstep(0.0, 1.0, (t - 0.62) / 0.38)
		z = lerpf(base_zoom * 0.82, base_zoom, u)
		look = Vector2(pr.end.x + 20.0, pr.position.y + 30.0).lerp(pr.get_center(), u)
	zoom = Vector2.ONE * z
	_target = _clamp_view(look, z)
	position = _target.round()


func end_intro() -> void:
	_intro = false
	zoom = Vector2.ONE * base_zoom
	_target = _clamp_view(Content.pitch_rect().get_center(), base_zoom)
	position = _target.round()


func follow(dt: float) -> void:
	if m == null or m.ball == null or _intro:
		return
	var ball: Ball = m.ball
	var look := ball.pos + ball.vel * 0.28
	# bias a little toward the attacking goal of the team in possession
	if ball.owner_player != null:
		look.x += float(ball.owner_player.attack_dir) * (26.0 if Content.layout_name == "full" else 18.0)
	look = _clamp_view(look, zoom.x)
	# critically damped-ish smoothing, faster when far away
	var k := 4.5 if _target.distance_to(look) > 120.0 else 3.2
	_target = _target.lerp(look, clampf(k * dt, 0.0, 1.0))
	var p := _target
	if shake > 0.0:
		p += Vector2(randf_range(-1, 1), randf_range(-1, 1)) * shake
		shake = maxf(0.0, shake - dt * 6.0)
	position = p.round()
