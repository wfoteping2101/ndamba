extends Node
## Localisation autoload. French first, English second. Strings live in res://content/strings.json
## as {"key": {"fr": "...", "en": "..."}}. Use Loc.t("key") or Loc.t("key", {"n": 3}).

signal language_changed(lang: String)

var lang: String = "fr"
var _strings: Dictionary = {}


func _ready() -> void:
	var txt := FileAccess.get_file_as_string("res://content/strings.json")
	var parsed: Variant = JSON.parse_string(txt)
	if typeof(parsed) == TYPE_DICTIONARY:
		_strings = parsed
	var sys := OS.get_locale_language()
	lang = "fr" if sys == "fr" else ("en" if sys == "en" else "fr")


func set_language(l: String) -> void:
	if l != lang and (l == "fr" or l == "en"):
		lang = l
		language_changed.emit(lang)


func toggle() -> void:
	set_language("en" if lang == "fr" else "fr")


func t(key: String, vars: Dictionary = {}) -> String:
	var entry: Variant = _strings.get(key)
	var s: String
	if entry == null:
		s = key
	else:
		s = entry.get(lang, entry.get("fr", key))
	for k in vars.keys():
		s = s.replace("{%s}" % k, str(vars[k]))
	return s


## Pick a language field from a content dictionary: name_fr / name_en.
func field(d: Dictionary, base: String) -> String:
	var k := "%s_%s" % [base, lang]
	if d.has(k):
		return d[k]
	return d.get(base + "_fr", d.get(base, ""))
