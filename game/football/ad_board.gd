class_name AdBoard
extends Node2D
## A perimeter advertising board drawn at run time from the sponsor list (Content.sponsors()),
## so a new sponsor needs no new artwork. Anchored at its bottom centre like the pre-rendered props.

const W := 96
const H := 13

var sponsor: Dictionary = {}


func setup(s: Dictionary) -> void:
	sponsor = s
	queue_redraw()


func _draw() -> void:
	var bg := Color.html(sponsor.get("bg", "#1F4D3A"))
	var fg := Color.html(sponsor.get("fg", "#F6F1E4"))
	var r := Rect2(-W * 0.5, -H, W, H)
	draw_rect(r, Color(0.118, 0.094, 0.086))
	draw_rect(r.grow(-1), bg)
	draw_rect(Rect2(r.position.x + 1, r.end.y - 2, W - 2, 1), bg.darkened(0.3))
	draw_rect(Rect2(r.position.x + 1, r.position.y + 1, W - 2, 1), bg.lightened(0.18))
	var font := UiTheme.font_small()
	var text: String = str(sponsor.get("name", ""))
	var size := 8
	var tw := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	draw_string(font, Vector2(floor(-tw * 0.5), -4), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, fg)
