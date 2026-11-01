shader_type canvas_item;
// Palette swap for the shared NDAMBA sprite sheets. Each key colour is replaced by its
// counterpart (exact match with a small tolerance; textures are nearest-filtered, so no
// blending ever produces in-between colours).

uniform vec4 keys[36] : source_color;
uniform vec4 repl[36] : source_color;
uniform int count = 0;
uniform float tint_strength : hint_range(0.0, 1.0) = 0.0;
uniform vec4 tint : source_color = vec4(1.0);
uniform float flash : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	vec3 rgb = c.rgb;
	for (int i = 0; i < count; i++) {
		if (distance(rgb, keys[i].rgb) < 0.02) {
			rgb = repl[i].rgb;
			break;
		}
	}
	rgb = mix(rgb, rgb * tint.rgb, tint_strength);
	rgb = mix(rgb, vec3(1.0), flash);
	COLOR = vec4(rgb, c.a) * vec4(1.0, 1.0, 1.0, COLOR.a);
}
