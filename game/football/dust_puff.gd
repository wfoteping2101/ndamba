class_name DustPuff
extends Sprite2D
## A short dust (or mud splash) animation at a point on the ground.

var strength: float = 1.0
var splash: bool = false
var _t: float = 0.0
const FRAMES := 6
const DUR := 0.45


func _ready() -> void:
	texture = load("res://assets/fx/dust.png")
	hframes = FRAMES
	frame = 0
	centered = true
	offset = Vector2(0, -6)
	z_index = 3
	scale = Vector2.ONE * clampf(0.6 + strength * 0.6, 0.6, 1.4)
	if splash:
		modulate = Color(0.55, 0.42, 0.36, 0.9)
	else:
		modulate = Color(1, 1, 1, clampf(0.5 + strength * 0.5, 0.5, 1.0))


func _process(delta: float) -> void:
	_t += delta
	frame = mini(FRAMES - 1, int(_t / DUR * FRAMES))
	if _t >= DUR:
		queue_free()
