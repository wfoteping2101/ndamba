class_name Story
extends RefCounted
## "Les Lionceaux": the story campaign, eight chapters following tome 1 of the novel
## (docs/research/BOOK_CONTENT_MAP.md, section E). Each chapter is a short illustrated text,
## a lesson of the Code Njangi, and a match with its own conditions and objective.
## Progress is saved in slot "story" as {"chapter": next_unlocked_index, "results": {idx: {...}}}.

const SLOT := "story"
const OUR := "lionceaux_bonamoussadi"

## objective kinds: win | score | unbeaten | win_pens (a draw goes to penalties) | passes (keep the ball: pass accuracy >= 70%)
const CHAPTERS := [
	{"id": 1, "opp": "gars_pharmacie", "stadium": "bonamoussadi_terre", "format": "5v5", "weather": "dry", "home": true, "objective": "win", "lesson": "story.lesson1", "drills": ["R01", "C03", "R07"]},
	{"id": 2, "opp": "requins_bepanda", "stadium": "bonamoussadi_terre", "format": "5v5", "weather": "dry", "home": true, "objective": "score", "lesson": "story.lesson2", "drills": ["S08", "C05", "R02"]},
	{"id": 3, "opp": "aigles_makepe", "stadium": "bonamoussadi_terre", "format": "5v5", "weather": "rain", "home": true, "objective": "win", "lesson": "story.lesson3", "drills": ["R01", "C04", "S01"]},
	{"id": 4, "opp": "cobras_bonaberi", "stadium": "bonamoussadi_terre", "format": "7v7", "weather": "dry", "home": true, "objective": "unbeaten", "lesson": "story.lesson4", "drills": ["S07", "C01", "S02"]},
	{"id": 5, "opp": "requins_bepanda", "stadium": "bonamoussadi_terre", "format": "7v7", "weather": "dry", "home": true, "objective": "win", "lesson": "story.lesson5", "drills": ["G02", "C10", "R03"]},
	{"id": 6, "opp": "mokolo_etoiles", "stadium": "mokolo_marche", "format": "7v7", "weather": "dry", "home": false, "objective": "win", "lesson": "story.lesson6", "drills": ["C07", "C08", "S04"]},
	{"id": 7, "opp": "pantheres_deido", "stadium": "bonamoussadi_terre", "format": "7v7", "weather": "dry", "home": true, "objective": "win_pens", "lesson": "story.lesson7", "drills": ["S06", "C11"]},
	{"id": 8, "opp": "aigles_akwa", "stadium": "stade_wouri", "format": "11v11", "weather": "dry", "home": false, "objective": "win", "lesson": "story.lesson8", "drills": ["G06"]},
]

var state: Dictionary = {"chapter": 0, "results": {}}


static func has_save() -> bool:
	return Game.save.exists(SLOT)


func load_game() -> bool:
	var d: Variant = Game.save.read(SLOT)
	if typeof(d) != TYPE_DICTIONARY or not d.has("chapter"):
		return false
	state = d
	return true


func save() -> void:
	Game.save.write(SLOT, state)


func reset() -> void:
	state = {"chapter": 0, "results": {}}
	save()


func unlocked() -> int:
	return int(state.get("chapter", 0))


func completed() -> bool:
	return unlocked() >= CHAPTERS.size()


func chapter(i: int) -> Dictionary:
	return CHAPTERS[clampi(i, 0, CHAPTERS.size() - 1)]


func result_of(i: int) -> Dictionary:
	return state["results"].get(str(i), {})


## Fill Game.match_config for chapter i.
func configure_match(i: int, return_scene: String) -> void:
	var ch := chapter(i)
	var c := Game.match_config
	c["home"] = OUR if ch["home"] else ch["opp"]
	c["away"] = ch["opp"] if ch["home"] else OUR
	c["stadium"] = ch["stadium"]
	c["format"] = ch["format"]
	c["weather"] = ch["weather"]
	c["half_minutes"] = float(Game.settings.get("story_half", 3.0))
	c["difficulty"] = int(Game.settings.get("story_difficulty", 1))
	c["human_home"] = ch["home"]
	c["human_away"] = not ch["home"]
	c["competition"] = "story"
	c["kickoff_home"] = true
	c["label"] = Loc.t("story.chapter_n", {"n": ch["id"]}) + " · " + Loc.t("story.title%d" % ch["id"])
	c["return_to"] = return_scene
	Game.pending = {"kind": "story", "chapter": i, "home": c["home"], "away": c["away"], "needs_winner": ch["objective"] == "win_pens"}


## Judge a played chapter. result: the match result (Game.last_result) with score, stats, pens optional.
func judge(i: int, result: Dictionary) -> bool:
	var ch := chapter(i)
	var side: int = 0 if ch["home"] else 1
	var gf: int = result["score"][side]
	var ga: int = result["score"][1 - side]
	var pens: Array = result.get("pens", [])
	var ok := false
	match ch["objective"]:
		"win":
			ok = gf > ga
		"score":
			ok = gf > 0
		"unbeaten":
			ok = gf >= ga
		"win_pens":
			ok = gf > ga or (gf == ga and pens.size() == 2 and pens[side] > pens[1 - side])
		"passes":
			var st: Dictionary = result["stats"][side]
			ok = float(st.get("pass_ok", 0)) >= 0.7 * maxf(1.0, float(st.get("passes", 1)))
	state["results"][str(i)] = {"score": result["score"], "pens": pens, "ok": ok, "side": side}
	if ok and unlocked() == i:
		state["chapter"] = i + 1
	save()
	return ok
