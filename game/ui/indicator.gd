class_name PlayerIndicator
extends Node2D
## Draws the arrow over the human's player, the shot charge bar, and a pass/shot aim hint.

var m
var _t: float = 0.0


func _ready() -> void:
	z_index = 20


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw_tag(p: Footballer, col: Color, strong: bool) -> void:
	var font := UiTheme.font_small()
	var txt := Content.tag_name(p.data).to_upper()
	var w := font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
	var at := p.position + Vector2(-w * 0.5, -40)
	draw_rect(Rect2(at.x - 2, at.y - 7, w + 4, 9), Color(0, 0, 0, 0.62 if strong else 0.45))
	draw_string(font, at, txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, col if strong else Color(col, 0.85))


func _draw() -> void:
	if m == null:
		return
	# the ball is small and often behind a body: a ring on the ground marks it at all times,
	# and when the ball is in the air a thin line ties it to its shadow
	if m.ball != null and m.phase != Match.Phase.INTRO:
		var bp: Vector2 = m.ball.pos
		draw_arc(bp, 6.0, 0.0, TAU, 20, Color(1, 1, 1, 0.55), 1.0)
		draw_arc(bp, 7.0, 0.0, TAU, 20, Color(0, 0, 0, 0.35), 1.0)
		if m.ball.h > 3.0:
			draw_line(bp, bp - Vector2(0, m.ball.h), Color(1, 1, 1, 0.35), 1.0)
	# pass intention: a chevron under the teammate the assist would pick for the stick direction
	for ti in m.humans.keys():
		var hp: Footballer = m.humans[ti].current
		if hp == null or not hp.has_ball:
			continue
		var aim: Vector2 = hp.in_move if hp.in_move.length() > 0.2 else hp.facing
		var choice: Dictionary = m.choose_pass(hp, aim.normalized(), false)
		var tgt = choice.get("target")
		if tgt != null:
			var q: Vector2 = tgt.position + Vector2(0, 4)
			var kit: Dictionary = m.teams[ti].data.get("kit_home", {})
			var c := Color.html(kit.get("jersey", "#ffffff"))
			if c.get_luminance() < 0.35:
				c = Color.html(kit.get("jersey2", "#ffffff"))
			draw_arc(q, 9.0, 0.0, TAU, 24, Color(0, 0, 0, 0.45), 2.0)
			draw_arc(q, 9.0, 0.0, TAU, 24, Color(c, 0.9), 1.0)
			# dotted line from the carrier to the target
			var from: Vector2 = hp.position
			var dirv := (q - from).normalized()
			var dist := from.distance_to(q)
			var k := 14.0
			while k < dist - 10.0:
				var pt := from + dirv * k
				draw_rect(Rect2(pt.x - 1, pt.y - 1, 2, 2), Color(1, 1, 1, 0.35))
				k += 8.0
	# name tags: the controlled players and the ball carrier (setting "names")
	if Game.settings.get("names", true) and m.phase != Match.Phase.INTRO:
		var tagged := {}
		for ti in m.humans.keys():
			var hp: Footballer = m.humans[ti].current
			if hp != null:
				_draw_tag(hp, UiTheme.CREAM, true)
				tagged[hp] = true
		if m.ball != null and m.ball.owner_player != null and not tagged.has(m.ball.owner_player):
			var bp: Footballer = m.ball.owner_player
			var kit: Dictionary = m.teams[bp.team_index].data.get("kit_home", {})
			var c := Color.html(kit.get("jersey", "#ffffff"))
			if c.get_luminance() < 0.3:
				c = Color.html(kit.get("jersey2", "#ffffff"))
			_draw_tag(bp, c.lerp(Color.WHITE, 0.5), false)
	for ti in m.humans.keys():
		var p: Footballer = m.humans[ti].current
		if p == null:
			continue
		var kit: Dictionary = m.teams[ti].data.get("kit_home", {})
		var col := Color.html(kit.get("jersey", "#ffffff"))
		if col.get_luminance() < 0.35:
			col = Color.html(kit.get("jersey2", "#ffffff"))
		var top := p.position + Vector2(0, -46 + sin(_t * 6.0) * 1.5)
		var pts := PackedVector2Array([top + Vector2(-4, -5), top + Vector2(4, -5), top + Vector2(0, 0)])
		draw_colored_polygon(pts, Color(0, 0, 0, 0.6))
		draw_colored_polygon(PackedVector2Array([top + Vector2(-3, -5), top + Vector2(3, -5), top + Vector2(0, -1)]), col)
		# the number under the arrow helps when two players stand close
		if p.charging:
			var w := 22
			var x := p.position.x - w * 0.5
			var y := p.position.y + 3
			draw_rect(Rect2(x - 1, y - 1, w + 2, 5), Color(0, 0, 0, 0.7))
			var fill := int(w * p.charge)
			var c := UiTheme.SUN.lerp(UiTheme.CLAY, p.charge)
			draw_rect(Rect2(x, y, fill, 3), c)
		# aim hint: short dotted line in the input direction when the player has the ball
		if p.has_ball and p.in_move.length() > 0.2:
			var dir := p.in_move.normalized()
			for i in range(3):
				var q := p.position + dir * (12 + i * 6)
				draw_rect(Rect2(q.x - 1, q.y - 1, 2, 2), Color(1, 1, 1, 0.55 - i * 0.15))
