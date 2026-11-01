extends Node
## Manager campaign soak: run N seasons with the auto plan (and sensible club actions) and print
## how the squad, the Indice and the league position evolve. Run:
##   godot --headless --path game res://tests/manager_calib.tscn -- --seasons 8 --seed 7

func _ready() -> void:
	await get_tree().process_frame
	var seasons := 8
	var seed_v := 7
	var args := OS.get_cmdline_user_args()
	for i in range(args.size()):
		if args[i] == "--seasons" and i + 1 < args.size():
			seasons = int(args[i + 1])
		if args[i] == "--seed" and i + 1 < args.size():
			seed_v = int(args[i + 1])
	var c := Career.new()
	c.new_game("lionceaux_bonamoussadi", seed_v)
	var t0 := Time.get_ticks_msec()
	for s in range(seasons):
		var goals_for := 0
		var goals_against := 0
		var ind := 0.0
		var n := 0
		var start_season: int = c.state["season"]
		while int(c.state["season"]) == start_season:
			# a plausible manager: upgrade facilities when affordable, sign one player per window
			if c.state["week"] == 2:
				c.upgrade_facilities()
				if c.state["market"].size() > 0 and int(c.state["budget"]) > int(c.state["market"][0]["price"]) + 500:
					c.sign_player(0)
			var rep := c.advance()
			if rep["match"].has("score"):
				var side: int = rep["match"]["side"]
				goals_for += rep["match"]["score"][side]
				goals_against += rep["match"]["score"][1 - side]
				ind += rep["match"]["indice"]["total"]
				n += 1
		var h: Dictionary = c.state["history"][-1]
		print("season %d  div %d  pos %2d  pts %2d  gf %2d ga %2d  indice %.1f  strength %.1f  fac %d budget %d  promo %s releg %s  cup %s" % [
			h["season"], h["division"], h["position"], h["points"], goals_for, goals_against, ind / maxi(1, n), c.squad_strength(),
			c.state["facilities"], c.state["budget"], h["promoted"], h["relegated"], str(h["cup"].get("results", []).size()) + " ties, won=" + str(h["cup"].get("won", false))])
	print("titles: %s  continental won: %s  (%d ms)" % [c.state["titles"], c.state["won_continental"], Time.get_ticks_msec() - t0])
	c.save()
	var c2 := Career.new()
	print("reload ok: %s season %d" % [c2.load_game(), c2.state.get("season", -1)])
	get_tree().quit(0)
