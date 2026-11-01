class_name SaveStore
extends RefCounted
## Versioned JSON save slots in user:// with forward migration (from game-studio/templates/godot-4).
## migrations: { from_version(int): Callable(data) -> data }

var version: int
var dir: String
var migrations: Dictionary


func _init(p_version: int = 1, p_dir: String = "user://saves", p_migrations: Dictionary = {}) -> void:
	version = p_version
	dir = p_dir
	migrations = p_migrations


func _path(slot: String) -> String:
	return "%s/%s.json" % [dir, slot]


func write(slot: String, data: Dictionary) -> Error:
	DirAccess.make_dir_recursive_absolute(dir)
	var f := FileAccess.open(_path(slot), FileAccess.WRITE)
	if f == null:
		return FileAccess.get_open_error()
	# from_native/to_native keep Variant types (plain JSON turns every int into a float).
	f.store_string(JSON.stringify(JSON.from_native({"version": version, "data": data})))
	return OK


func read(slot: String) -> Variant:
	if not FileAccess.file_exists(_path(slot)):
		return null
	var raw: Variant = JSON.parse_string(FileAccess.get_file_as_string(_path(slot)))
	var parsed: Variant = JSON.to_native(raw) if raw != null else null
	if typeof(parsed) != TYPE_DICTIONARY or not parsed.has("version"):
		push_warning("save '%s' is corrupt" % slot)
		return null
	var v := int(parsed["version"])
	if v > version:
		return null
	var data: Variant = parsed["data"]
	while v < version:
		if not migrations.has(v):
			return null
		data = migrations[v].call(data)
		v += 1
	return data


func exists(slot: String) -> bool:
	return FileAccess.file_exists(_path(slot))


func remove(slot: String) -> void:
	if exists(slot):
		DirAccess.remove_absolute(_path(slot))
