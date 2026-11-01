extends Node
## Renders a scene and saves a screenshot: godot --path . res://tests/screenshot.tscn -- --scene res://scenes/x.tscn --out /tmp/x.png [--frames 20] [--prep story|cup|league|pens]

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var scene := "res://scenes/title.tscn"
	var out := "/tmp/shot.png"
	var frames := 20
	var prep := ""
	for i in range(args.size()):
		if args[i] == "--scene" and i + 1 < args.size():
			scene = args[i + 1]
		if args[i] == "--out" and i + 1 < args.size():
			out = args[i + 1]
		if args[i] == "--frames" and i + 1 < args.size():
			frames = int(args[i + 1])
		if args[i] == "--prep" and i + 1 < args.size():
			prep = args[i + 1]
	match prep:
		"pens":
			Game.match_config["home"] = "lionceaux_bonamoussadi"
			Game.match_config["away"] = "pantheres_deido"
			Game.match_config["stadium"] = "bonamoussadi_terre"
			Game.match_config["format"] = "5v5"
			Game.match_config["human_home"] = true
			Game.match_config["human_away"] = false
			Game.last_result = {"home": "lionceaux_bonamoussadi", "away": "pantheres_deido", "score": [1, 1]}
		"league", "cup":
			var c := Competition.new(prep)
			c.new_game("lionceaux_bonamoussadi", {"format": "11v11", "half_minutes": 3.0, "difficulty": 2}, 4)
			for k in range(2):
				var f := c.next_fixture()
				if f.is_empty():
					break
				var sc := [2, 1] if f["home"] == "lionceaux_bonamoussadi" else [1, 2]
				c.apply_result(f["home"], f["away"], sc)
			c.save()
		"touch":
			Game.settings["show_touch"] = "on"
			Game.match_config["home"] = "lionceaux_bonamoussadi"
			Game.match_config["away"] = "requins_bepanda"
			Game.match_config["stadium"] = "stade_wouri"
			Game.match_config["format"] = "11v11"
			Game.match_config["human_home"] = true
			Game.match_config["human_away"] = false
			Game.match_config["half_minutes"] = 1.0
		"story":
			var st := Story.new()
			st.reset()
			st.judge(0, {"score": [3, 2], "stats": [{}, {}]})
	var packed: PackedScene = load(scene)
	var inst = packed.instantiate()
	add_child(inst)
	for i in range(frames):
		await get_tree().process_frame
	var img := get_viewport().get_texture().get_image()
	img.save_png(out)
	print("saved ", out)
	get_tree().quit(0)
