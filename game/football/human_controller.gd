class_name HumanController
extends Node
## Turns input into the intent of the controlled player, and handles player switching.
## Reads InputMap actions; touch controls feed the same actions through TouchControls.

var m
var team: Team
var team_index: int = 0
var current: Footballer = null
var device: int = 0
var charge_t: float = 0.0
var charging: bool = false
var switch_cooldown: float = 0.0
var auto_switch_cooldown: float = 0.0
var last_input_t: float = 0.0
var prefix: String = ""        # "" for player 1, "p2_" for player 2 (second keyboard/pad mapping)

var _pass_pressed := false
var _through_pressed := false
var _shoot_pressed := false
var _shoot_released := false
var _switch_pressed := false
var _move_override: Vector2 = Vector2.ZERO
var _use_override := false


func setup(p_match, p_team: Team, p_index: int) -> void:
	m = p_match
	team = p_team
	team_index = p_index
	select(_default_player())


func _default_player() -> Footballer:
	for p in team.players:
		if not p.is_keeper and p.role == "MID":
			return p
	for p in team.players:
		if not p.is_keeper:
			return p
	return team.players[0]


func select(p: Footballer) -> void:
	if p == null or p == current:
		return
	if current != null:
		current.human_controlled = false
		current.clear_intent()
	current = p
	current.human_controlled = true
	charging = false
	charge_t = 0.0
	m.controlled_changed.emit(current)


func on_teammate_got_ball(p: Footballer) -> void:
	if p.team_index == team_index and not p.is_keeper and p != current:
		select(p)


## Called by TouchControls so phones can inject the stick/buttons.
func set_touch_move(v: Vector2, active: bool) -> void:
	_move_override = v
	_use_override = active


func _input(event: InputEvent) -> void:
	if event.is_action_pressed(prefix + "pass"):
		_pass_pressed = true
	if event.is_action_pressed(prefix + "through"):
		_through_pressed = true
	if event.is_action_pressed(prefix + "shoot"):
		_shoot_pressed = true
	if event.is_action_released(prefix + "shoot"):
		_shoot_released = true
	if event.is_action_pressed(prefix + "switch_player"):
		_switch_pressed = true


func press(action: String) -> void:
	match action:
		"pass": _pass_pressed = true
		"through": _through_pressed = true
		"shoot": _shoot_pressed = true
		"switch": _switch_pressed = true


func release(action: String) -> void:
	if action == "shoot":
		_shoot_released = true


func tick(dt: float) -> void:
	switch_cooldown = maxf(0.0, switch_cooldown - dt)
	auto_switch_cooldown = maxf(0.0, auto_switch_cooldown - dt)
	if current == null:
		return
	var p := current
	p.clear_intent()
	var mv := Input.get_vector(prefix + "move_left", prefix + "move_right", prefix + "move_up", prefix + "move_down")
	if _use_override:
		mv = _move_override
	var sprint := Input.is_action_pressed(prefix + "sprint") or _touch_sprint
	if mv.length() > 0.05:
		last_input_t = 0.0
	else:
		last_input_t += dt
	var simple: bool = Game.settings.get("simple_controls", false)
	if p.has_ball:
		p.in_move = mv
		p.in_sprint = sprint
		# shooting: hold to charge, release to shoot
		if _shoot_pressed:
			charging = true
			charge_t = 0.0
		if charging:
			charge_t += dt
			p.charging = true
			p.charge = clampf(charge_t / 0.9, 0.0, 1.0)
			if charge_t >= 0.9 or _shoot_released:
				p.in_shoot = true
				p.in_shoot_power = clampf(charge_t / 0.9, 0.2, 1.0)
				charging = false
				p.charging = false
				p.charge = 0.0
		elif _pass_pressed:
			if simple and _near_goal(p):
				p.in_shoot = true
				p.in_shoot_power = 0.65
			else:
				p.in_pass = true
		elif _through_pressed:
			p.in_through = true
	else:
		charging = false
		p.charging = false
		p.charge = 0.0
		p.in_move = mv
		p.in_sprint = sprint
		if _pass_pressed:
			p.in_tackle = true
		elif _shoot_pressed:
			p.in_slide = true
		elif _through_pressed:
			p.in_tackle = true
		if _switch_pressed and switch_cooldown <= 0.0:
			_switch_nearest()
			switch_cooldown = 0.25
		else:
			_auto_switch(dt)
	_pass_pressed = false
	_through_pressed = false
	_shoot_pressed = false
	_shoot_released = false
	_switch_pressed = false


var _touch_sprint := false

func set_touch_sprint(on: bool) -> void:
	_touch_sprint = on


func _near_goal(p: Footballer) -> bool:
	return p.pos.distance_to(m.goal_center(team_index, false)) < 95.0


func _switch_nearest() -> void:
	var best: Footballer = null
	var bd := INF
	for q in team.players:
		if q == current or q.is_keeper:
			continue
		var d := q.pos.distance_to(m.ball.predict(0.25))
		if d < bd:
			bd = d
			best = q
	if best != null:
		select(best)


func _auto_switch(dt: float) -> void:
	if auto_switch_cooldown > 0.0 or current.busy():
		return
	if m.is_setpiece_wait():
		return
	var holder = m.ball.owner_player
	if holder != null and holder.team_index == team_index:
		return
	# switch when another teammate is clearly closer to where the ball is going
	var target: Vector2 = m.ball.predict(0.3)
	var cur_d := current.pos.distance_to(target)
	var best: Footballer = null
	var bd := cur_d * 0.68 - 6.0
	for q in team.players:
		if q == current or q.is_keeper:
			continue
		var d := q.pos.distance_to(target)
		if d < bd:
			bd = d
			best = q
	if best != null and (last_input_t > 0.15 or cur_d > 90.0):
		select(best)
		auto_switch_cooldown = 0.9
