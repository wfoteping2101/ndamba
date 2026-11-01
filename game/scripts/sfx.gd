extends Node
## Sfx autoload: short effects (pooled players), crowd ambience and music.

const DIR := "res://assets/audio/"
const POOL := 10

var _streams: Dictionary = {}
var _pool: Array[AudioStreamPlayer] = []
var _next := 0
var _crowd: AudioStreamPlayer
var _music: AudioStreamPlayer
var _music_name := ""
var enabled := true


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


func crowd(on: bool, volume_db: float = -9.0) -> void:
	if on:
		var s := _stream("crowd_loop")
		if s == null:
			return
		if s is AudioStreamOggVorbis:
			s.loop = true
		_crowd.stream = s
		_crowd.volume_db = volume_db
		if not _crowd.playing:
			_crowd.play()
	else:
		_crowd.stop()


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
