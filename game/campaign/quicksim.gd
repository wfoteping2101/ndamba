class_name QuickSim
extends RefCounted
## Fast result for a match the player does not play (league/cup fixtures between CPU teams).
## Reuses the manager simulation with capacities derived from the team's strength.


static func caps_for(team_id: String, rng: RandomNumberGenerator) -> Dictionary:
	var t := Content.team(team_id)
	var s: float = float(t.get("strength", 55))
	var out := {}
	for k in ManagerSim.CAP_KEYS:
		out[k] = clampf(s + rng.randf_range(-6.0, 6.0), 10.0, 98.0)
	out["fitness"] = 1.0
	out["morale"] = 0.7
	return out


## Returns [home_goals, away_goals].
static func play(home: String, away: String, rng: RandomNumberGenerator) -> Array:
	var res := ManagerSim.simulate(caps_for(home, rng), caps_for(away, rng), 0, rng)
	return res["score"]


## Penalty shoot-out between two CPU teams: [home, away] goals, never equal.
static func shootout(home: String, away: String, rng: RandomNumberGenerator) -> Array:
	var a := 0
	var b := 0
	for i in range(5):
		if rng.randf() < 0.75:
			a += 1
		if rng.randf() < 0.75:
			b += 1
	while a == b:
		if rng.randf() < 0.75:
			a += 1
		if rng.randf() < 0.75:
			b += 1
	return [a, b]
