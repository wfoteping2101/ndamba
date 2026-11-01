class_name UiTheme
extends RefCounted
## Shared look for every screen: warm, editorial, pixel-crisp. Colours follow the Ndamba
## app palette (forest, terra, sun, clay, cream, night) so the game and the app feel related.

const FOREST := Color("1F4D3A")
const FOREST_LIGHT := Color("2E6B45")
const TERRA := Color("C5762F")
const SUN := Color("E3A92B")
const CLAY := Color("B8432F")
const CREAM := Color("F6F1E4")
const PAPER := Color("FFFBF2")
const NIGHT := Color("101814")
const INK := Color("1E1A17")
const LINE := Color("D8CDB8")

static var _font_big: FontFile = null
static var _font_small: FontFile = null
static var _theme: Theme = null


static func font_big() -> FontFile:
	if _font_big == null:
		_font_big = load("res://assets/fonts/PressStart2P-Regular.ttf")
		_font_big.antialiasing = TextServer.FONT_ANTIALIASING_NONE
		_font_big.hinting = TextServer.HINTING_NONE
		_font_big.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	return _font_big


static func font_small() -> FontFile:
	if _font_small == null:
		_font_small = load("res://assets/fonts/Silkscreen-Regular.ttf")
		_font_small.antialiasing = TextServer.FONT_ANTIALIASING_NONE
		_font_small.hinting = TextServer.HINTING_NONE
		_font_small.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	return _font_small


static func panel(bg: Color, border: Color = Color(0, 0, 0, 0), radius: int = 0, pad: int = 6, border_w: int = 1) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(border_w if border.a > 0.0 else 0)
	sb.set_corner_radius_all(radius)
	sb.set_content_margin_all(pad)
	sb.anti_aliasing = false
	return sb


static func theme() -> Theme:
	if _theme != null:
		return _theme
	var t := Theme.new()
	t.default_font = font_small()
	t.default_font_size = 8
	# Buttons
	var normal := panel(CREAM, INK, 0, 6, 1)
	var hover := panel(SUN, INK, 0, 6, 1)
	var pressed := panel(TERRA, INK, 0, 6, 1)
	var focus := panel(Color(0, 0, 0, 0), SUN, 0, 6, 2)
	t.set_stylebox("normal", "Button", normal)
	t.set_stylebox("hover", "Button", hover)
	t.set_stylebox("pressed", "Button", pressed)
	t.set_stylebox("focus", "Button", focus)
	t.set_stylebox("disabled", "Button", panel(Color(0.85, 0.82, 0.76), LINE, 0, 6, 1))
	t.set_color("font_color", "Button", INK)
	t.set_color("font_hover_color", "Button", INK)
	t.set_color("font_pressed_color", "Button", CREAM)
	t.set_color("font_focus_color", "Button", INK)
	t.set_color("font_disabled_color", "Button", Color(0.45, 0.42, 0.4))
	t.set_font("font", "Button", font_small())
	t.set_font_size("font_size", "Button", 8)
	# Labels
	t.set_color("font_color", "Label", CREAM)
	t.set_font("font", "Label", font_small())
	t.set_font_size("font_size", "Label", 8)
	# Panels
	t.set_stylebox("panel", "PanelContainer", panel(Color(NIGHT, 0.86), SUN, 0, 8, 1))
	t.set_stylebox("panel", "Panel", panel(Color(NIGHT, 0.86), SUN, 0, 8, 1))
	# Sliders
	t.set_stylebox("slider", "HSlider", panel(Color(CREAM, 0.35), Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("grabber_area", "HSlider", panel(SUN, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("grabber_area_highlight", "HSlider", panel(TERRA, Color(0, 0, 0, 0), 0, 0))
	_theme = t
	return t


static func label(text: String, size: int = 8, big: bool = false, color: Color = CREAM) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font_big() if big else font_small())
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
	l.add_theme_constant_override("shadow_offset_x", 1)
	l.add_theme_constant_override("shadow_offset_y", 1)
	return l


static func button(text: String, min_w: int = 120) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(min_w, 18)
	b.focus_mode = Control.FOCUS_ALL
	return b
