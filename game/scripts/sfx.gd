extends Node
## Sfx autoload: short effects (pooled players), crowd ambience, stadium sound layers and music.
##
## Stadium sound: on top of the crowd murmur (crowd_loop) three loops play during a match —
## claps, a tam-tam section and a chant. Each has its own volume that fades toward a target
## derived from the match "excitement" (set_excitement) and from short bursts (crowd_burst).
## Music: the title plays music_loop (menu_music); matches play the track chosen in
## Game.settings["music_track"] (match_music): off | menu | makossa | bikutsi.

const DIR := "res://assets/audio/"
const POOL := 10

## Fade speed of the stadium layers: 2 dB per 0.1 s.
const LAYER_FADE_DB_PER_S := 20.0
## Layer volumes (dB) at excitement 0 (murmur only) and at excitement 1 (full stand).
const LAYER_QUIET := {"claps": -30.0, "tamtam": -22.0, "chant": -40.0}
const LAYER_FULL := {"claps": -8.0, "tamtam": -6.0, "chant": -10.0}
const LAYER_STREAMS := {"claps": "crowd_claps", "tamtam": "crowd_tamtam", "chant": "crowd_chant"}
const CROWD_DEFAULT_DB := -9.0
const MUSIC_TRACKS := {"makossa": "music_makossa", "bikutsi": "music_bikutsi"}

var _streams: Dictionary = {}
var _pool: Array[AudioStreamPlayer] = []
var _next := 0
var _crowd: AudioStreamPlayer
var _music: AudioStreamPlayer
var _music_name := ""
var enabled := true

var _layers: Dictionary = {}          # name -> AudioStreamPlayer
var _layer_burst: Dictionary = {}     # name -> seconds left at full volume
var _layers_on := false
var _crowd_offset := 0.0              # the layers follow the crowd volume (title plays it softer)
var _excitement := 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in range(POOL):
		var p := AudioStreamPlayer.new()
		p.bus = "Sfx"
		add_child(p)
		_pool.append(p)
	_crowd = AudioStreamPlayer.new()
	_crowd.bus = "Sfx"
	add_child(_crowd)
	_music = AudioStreamPlayer.new()
	_music.bus = "Music"
	add_child(_music)
	for layer in LAYER_STREAMS.keys():
		var lp := AudioStreamPlayer.new()
		lp.bus = "Sfx"
		lp.volume_db = float(LAYER_QUIET[layer])
		add_child(lp)
		_layers[layer] = lp
		_layer_burst[layer] = 0.0


func _process(delta: float) -> void:
	if not _layers_on:
		return
	for layer in _layers.keys():
		var lp: AudioStreamPlayer = _layers[layer]
		var left: float = float(_layer_burst[layer])
		if left > 0.0:
			left -= delta
			_layer_burst[layer] = maxf(left, 0.0)
		var target := _layer_target(layer)
		lp.volume_db = move_toward(lp.volume_db, target, LAYER_FADE_DB_PER_S * delta)


func _stream(name: String) -> AudioStream:
	if _streams.has(name):
		return _streams[name]
	var s: AudioStream = null
	for ext in ["wav", "ogg"]:
		var path: String = DIR + name + "." + ext
		if ResourceLoader.exists(path):
			s = load(path)
			break
	_streams[name] = s
	return s


func play(name: String, _at: Vector2 = Vector2.ZERO, volume_db: float = 0.0, pitch_jitter: float = 0.06) -> void:
	if not enabled:
		return
	var s := _stream(name)
	if s == null:
		return
	var p := _pool[_next]
	_next = (_next + 1) % POOL
	p.stream = s
	p.volume_db = volume_db
	p.pitch_scale = 1.0 + randf_range(-pitch_jitter, pitch_jitter)
	p.play()


# ---------------------------------------------------------------------------
# Crowd: murmur + stadium layers
# ---------------------------------------------------------------------------

## Crowd murmur on/off. When on and Game.settings["stadium_sound"] is true, the clap, tam-tam
## and chant layers start with it (quiet until set_excitement / crowd_burst raise them).
func crowd(on: bool, volume_db: float = CROWD_DEFAULT_DB) -> void:
	if on:
		var s := _stream("crowd_loop")
		if s != null:
			if s is AudioStreamOggVorbis:
				s.loop = true
			_crowd.stream = s
			_crowd.volume_db = volume_db
			if not _crowd.playing:
				_crowd.play()
		_crowd_offset = volume_db - CROWD_DEFAULT_DB
		if stadium_sound_enabled():
			_start_layers()
		else:
			_stop_layers()
	else:
		_crowd.stop()
		_stop_layers()


func stadium_sound_enabled() -> bool:
	return bool(Game.settings.get("stadium_sound", true))


func _start_layers() -> void:
	for layer in LAYER_STREAMS.keys():
		var lp: AudioStreamPlayer = _layers[layer]
		var s := _stream(str(LAYER_STREAMS[layer]))
		if s == null:
			continue
		if s is AudioStreamOggVorbis:
			s.loop = true
		if lp.stream != s:
			lp.stream = s
		if not lp.playing:
			lp.volume_db = _layer_target(layer)
			lp.play()
	_layers_on = true


func _stop_layers() -> void:
	for layer in _layers.keys():
		var lp: AudioStreamPlayer = _layers[layer]
		lp.stop()
		_layer_burst[layer] = 0.0
	_layers_on = false


func _layer_target(layer: String) -> float:
	var quiet: float = float(LAYER_QUIET[layer])
	var full: float = float(LAYER_FULL[layer])
	var level := _excitement
	if float(_layer_burst[layer]) > 0.0:
		level = 1.0
	return lerpf(quiet, full, level) + _crowd_offset


## How lively the stand is, 0 (murmur only) .. 1 (everything up). The layers fade toward it.
func set_excitement(level: float) -> void:
	_excitement = clampf(level, 0.0, 1.0)


## Short events: "goal" (tam-tam + chant at full for 6 s, then back to the excitement level),
## "chance" (claps at full for 2 s), "halftime" (everything down).
func crowd_burst(kind: String) -> void:
	match kind:
		"goal":
			_layer_burst["tamtam"] = 6.0
			_layer_burst["chant"] = 6.0
		"chance":
			_layer_burst["claps"] = 2.0
		"halftime":
			_excitement = 0.0
			for layer in _layer_burst.keys():
				_layer_burst[layer] = 0.0


# ---------------------------------------------------------------------------
# Music
# ---------------------------------------------------------------------------

func music(name: String, on: bool = true) -> void:
	if not on:
		_music.stop()
		_music_name = ""
		return
	if _music_name == name and _music.playing:
		return
	var s := _stream(name)
	if s == null:
		return
	if s is AudioStreamOggVorbis:
		s.loop = true
	_music.stream = s
	_music.volume_db = -6.0
	_music.play()
	_music_name = name


func music_track() -> String:
	return str(Game.settings.get("music_track", "menu"))


## Title screen: the menu loop, unless music is off.
func menu_music() -> void:
	if music_track() == "off":
		music("", false)
	else:
		music("music_loop", true)


## Match: the stadium track chosen in the settings; silence for "off" and "menu".
func match_music() -> void:
	var track := music_track()
	if MUSIC_TRACKS.has(track):
		music(str(MUSIC_TRACKS[track]), true)
	else:
		music("", false)
