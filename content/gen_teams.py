"""Generates NDAMBA team files (content/teams/*.json) from curated identities.

Identities (names, colours, neighbourhoods, lore) are curated here by hand. Squads are
built from a pool of culturally plausible Cameroonian given names and family names,
combined into fictional identities with a fixed seed, so re-running never reshuffles a
team by accident. Attributes are 30 to 95. Nothing here is a real club or a real person.

Run: python3 -I gen_teams.py   (writes content/teams/*.json and content/teams/index.json)
"""
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "teams")

GIVEN_M = ["Brice", "Junior", "Rodrigue", "Lionel", "Christian", "Arnaud", "Kevin", "Wilfried", "Marius", "Serge",
           "Ibrahim", "Oumarou", "Moussa", "Hervé", "Cédric", "Patrick", "Yannick", "Franck", "Stéphane", "Joël",
           "Aboubakar", "Hamadou", "Idrissou", "Boris", "Landry", "Thierry", "Paul", "Emmanuel", "Fabrice", "Loïc"]
GIVEN_F = ["Aïcha", "Mireille", "Grâce", "Esther", "Fadimatou", "Amina", "Clarisse", "Nadège", "Sandrine", "Prisca",
           "Larissa", "Ornella", "Carine", "Vanessa", "Gaëlle", "Raïssa", "Michelle", "Ajara", "Hadja", "Doris"]
FAMILY = ["Mvondo", "Eyenga", "Bello", "Fokou", "Atéba", "Nguema", "Tchoupo", "Ndoumbé", "Mbarga", "Onana", "Ngando",
          "Kamga", "Djoumessi", "Fotso", "Essomba", "Abega", "Nlend", "Ekotto", "Moukoko", "Etoundi", "Mbida", "Nkoulou",
          "Ngono", "Bikoko", "Dikongué", "Ebongué", "Kouam", "Tagne", "Wafo", "Nana", "Mefire", "Njoya", "Adamou",
          "Bouba", "Djibril", "Mohamadou", "Ngah", "Owona", "Zoa", "Eboa", "Mbappé", "Tchatchoua", "Ndong", "Abanda"]
# Pairings that would evoke a real, famous footballer are excluded on purpose.
FORBIDDEN = {("Samuel", "Eto'o"), ("Vincent", "Aboubakar"), ("André", "Onana"), ("Rigobert", "Song"), ("Roger", "Milla"),
             ("Kylian", "Mbappé"), ("Patrick", "Mboma"), ("Joël", "Matip")}

SKIN = ["deep", "dark", "dark", "brown", "brown", "tan"]
HAIR_M = ["short", "short", "short", "fade", "afro"]
HAIR_F = ["braids", "braids", "wrap", "afro", "short"]

# 5v5 roles: GK, DEF, MID, MID, FWD. Attributes: spd acc ctl pas sho tak pos sta tmw vis gk
ROLE_PROFILE = {
    "GK":  dict(spd=45, acc=50, ctl=45, pas=50, sho=30, tak=45, pos=70, sta=60, tmw=55, vis=50, gk=78),
    "DEF": dict(spd=62, acc=60, ctl=55, pas=58, sho=42, tak=74, pos=70, sta=70, tmw=62, vis=52, gk=30),
    "MID": dict(spd=66, acc=66, ctl=70, pas=72, sho=58, tak=58, pos=64, sta=74, tmw=70, vis=70, gk=25),
    "FWD": dict(spd=74, acc=74, ctl=70, pas=58, sho=76, tak=42, pos=66, sta=66, tmw=58, vis=60, gk=20),
}

TEAMS = [
    {
        "id": "mokolo_etoiles", "name": "Mokolo Étoiles", "short": "MOK", "city": "Yaoundé", "neighborhood": "Mokolo",
        "kit_home": {"jersey": "#F2C230", "jersey2": "#1C1C22", "pattern": "stripes", "shorts": "#1C1C22", "socks": "#F2C230"},
        "kit_away": {"jersey": "#F2EEE3", "jersey2": "#F2C230", "pattern": "sash", "shorts": "#F2EEE3", "socks": "#1C1C22"},
        "kit_gk": {"jersey": "#2E63B8", "shorts": "#1C1C22", "socks": "#2E63B8"},
        "colors": ["#F2C230", "#1C1C22"], "crest": "star",
        "style": "direct", "formation": "1-2-1-1", "strength": 62, "rating_bias": 2,
        "stadium": "mokolo_marche", "rivals": ["mvog_ada_lions"], "difficulty": 2,
        "lore_fr": "Nés entre les étals du grand marché de Mokolo, les Étoiles jouent vite et fort. Leurs maillots jaunes rayés de noir se voient de loin dans la poussière.",
        "lore_en": "Born between the stalls of the big Mokolo market, the Étoiles play fast and hard. Their yellow shirts with black stripes can be seen from far away in the dust.",
        "mixed": True, "seed": 11,
    },
    {
        "id": "requins_bepanda", "name": "Requins de Bépanda", "short": "BEP", "city": "Douala", "neighborhood": "Bépanda",
        "kit_home": {"jersey": "#2E63B8", "jersey2": "#F2EEE3", "pattern": "plain", "shorts": "#F2EEE3", "socks": "#2E63B8"},
        "kit_away": {"jersey": "#F2EEE3", "jersey2": "#2E63B8", "pattern": "hoops", "shorts": "#2E63B8", "socks": "#F2EEE3"},
        "kit_gk": {"jersey": "#B8432F", "shorts": "#1C1C22", "socks": "#B8432F"},
        "colors": ["#2E63B8", "#F2EEE3"], "crest": "shark",
        "style": "physical", "formation": "1-2-1-1", "strength": 64, "rating_bias": 3,
        "stadium": "bepanda_terrain", "rivals": ["lionceaux_bonamoussadi"], "difficulty": 3,
        "lore_fr": "L'équipe du quartier voisin dans Lionceaux, menée par Junior « Bulldozer » Mvondo. Maillot bleu, aileron de requin dessiné dans le dos. Ils ne reculent jamais.",
        "lore_en": "The next-door rivals from Lionceaux, led by Junior \"Bulldozer\" Mvondo. Blue shirt with a shark fin drawn on the back. They never back down.",
        "mixed": False, "seed": 12,
        "named": [{"given": "Junior", "family": "Mvondo", "nick": "Bulldozer", "role": "DEF", "number": 4, "skin": "dark", "hair": "fade",
                   "attrs": dict(spd=60, acc=58, ctl=52, pas=50, sho=55, tak=82, pos=68, sta=78, tmw=55, vis=48, gk=30)}],
    },
    {
        "id": "lionceaux_bonamoussadi", "name": "Lionceaux de Bonamoussadi", "short": "BON", "city": "Douala", "neighborhood": "Bonamoussadi",
        "kit_home": {"jersey": "#2E6B45", "jersey2": "#F2EEE3", "pattern": "plain", "shorts": "#1C1C22", "socks": "#F2EEE3"},
        "kit_away": {"jersey": "#F2EEE3", "jersey2": "#2E6B45", "pattern": "stripes", "shorts": "#2E6B45", "socks": "#F2EEE3"},
        "kit_gk": {"jersey": "#E3A92B", "shorts": "#1C1C22", "socks": "#E3A92B"},
        "kit_story": {"pattern": "rags", "shorts": "#1C1C22", "socks": "#F2EEE3"},
        "colors": ["#2E6B45", "#F2EEE3"], "crest": "lion_cub",
        "style": "possession", "formation": "1-1-1-2", "strength": 60, "rating_bias": 0,
        "stadium": "bonamoussadi_terre", "rivals": ["requins_bepanda"], "difficulty": 2,
        "lore_fr": "L'équipe de BriBri et Kaydoudou, entraînée par Tonton Fokou sur le terrain de terre rouge de Bonamoussadi. Une seule règle : le ballon doit voyager.",
        "lore_en": "BriBri and Kaydoudou's team, coached by Tonton Fokou on the red-earth pitch of Bonamoussadi. One rule: the ball must travel.",
        "mixed": True, "seed": 13,
        "named": [
            {"given": "BriBri", "family": "", "nick": "", "role": "MID", "number": 8, "skin": "deep", "hair": "short", "shirt": "#2E6B45", "shirt2": "#F2EEE3", "shirt_pattern": "plain",
             "attrs": dict(spd=66, acc=64, ctl=74, pas=84, sho=58, tak=60, pos=78, sta=74, tmw=86, vis=88, gk=28)},
            {"given": "Kaydoudou", "family": "", "nick": "", "role": "FWD", "number": 7, "skin": "deep", "hair": "afro", "socks_mismatch": True, "shirt": "#F2C230", "shirt2": "#D63C2F", "shirt_pattern": "sash",
             "attrs": dict(spd=84, acc=88, ctl=86, pas=56, sho=70, tak=36, pos=60, sta=70, tmw=58, vis=62, gk=20)},
            {"given": "Mireille", "family": "Eyenga", "nick": "la Gazelle", "role": "FWD", "number": 11, "skin": "brown", "hair": "braids",
             "attrs": dict(spd=90, acc=86, ctl=66, pas=58, sho=66, tak=48, pos=64, sta=76, tmw=66, vis=58, gk=22)},
            {"given": "Ousmane", "family": "Bello", "nick": "Petit Pied", "role": "GK", "number": 1, "skin": "dark", "hair": "short",
             "attrs": dict(spd=50, acc=52, ctl=48, pas=56, sho=30, tak=46, pos=76, sta=62, tmw=60, vis=54, gk=84)},
        ],
    },
    {
        "id": "pantheres_deido", "name": "Panthères de Deïdo", "short": "DEI", "city": "Douala", "neighborhood": "Deïdo",
        "kit_home": {"jersey": "#F2C230", "jersey2": "#1C1C22", "pattern": "spots", "shorts": "#1C1C22", "socks": "#F2C230"},
        "kit_away": {"jersey": "#1C1C22", "jersey2": "#F2C230", "pattern": "spots", "shorts": "#F2C230", "socks": "#1C1C22"},
        "kit_gk": {"jersey": "#2E6B45", "shorts": "#1C1C22", "socks": "#2E6B45"},
        "colors": ["#F2C230", "#1C1C22"], "crest": "panther",
        "style": "counter", "formation": "1-2-1-1", "strength": 61, "rating_bias": 1,
        "stadium": "deido_terrain", "rivals": ["lionceaux_bonamoussadi"], "difficulty": 2,
        "lore_fr": "Jaunes à taches noires, les Panthères de Deïdo attendent, puis bondissent. Quartier de pêcheurs au bord du Wouri, ils jouent avec le vent du fleuve.",
        "lore_en": "Yellow with black spots, the Panthères of Deïdo wait, then pounce. A fishermen's neighbourhood on the Wouri, they play with the river wind.",
        "mixed": False, "seed": 14,
    },
    {
        "id": "aigles_akwa", "name": "Aigles d'Akwa", "short": "AKW", "city": "Douala", "neighborhood": "Akwa",
        "kit_home": {"jersey": "#1F4D3A", "jersey2": "#E3A92B", "pattern": "sash", "shorts": "#E3A92B", "socks": "#1F4D3A"},
        "kit_away": {"jersey": "#E3A92B", "jersey2": "#1F4D3A", "pattern": "plain", "shorts": "#1F4D3A", "socks": "#E3A92B"},
        "kit_gk": {"jersey": "#B8432F", "shorts": "#1C1C22", "socks": "#B8432F"},
        "colors": ["#1F4D3A", "#E3A92B"], "crest": "eagle",
        "style": "possession", "formation": "1-2-1-1", "strength": 66, "rating_bias": 4,
        "stadium": "stade_wouri", "rivals": ["port_bonaberi"], "difficulty": 3,
        "lore_fr": "Le club du centre-ville : des joueurs qui gardent le ballon et le font tourner jusqu'à ce que la faille s'ouvre.",
        "lore_en": "The downtown club: players who keep the ball and move it until the gap opens.",
        "mixed": False, "seed": 15,
    },
    {
        "id": "port_bonaberi", "name": "Port de Bonabéri", "short": "BNB", "city": "Douala", "neighborhood": "Bonabéri",
        "kit_home": {"jersey": "#1C1C22", "jersey2": "#C5762F", "pattern": "stripes", "shorts": "#1C1C22", "socks": "#C5762F"},
        "kit_away": {"jersey": "#F2EEE3", "jersey2": "#C5762F", "pattern": "hoops", "shorts": "#C5762F", "socks": "#F2EEE3"},
        "kit_gk": {"jersey": "#2E63B8", "shorts": "#1C1C22", "socks": "#2E63B8"},
        "colors": ["#1C1C22", "#C5762F"], "crest": "anchor",
        "style": "physical", "formation": "1-2-1-1", "strength": 63, "rating_bias": 3,
        "stadium": "stade_wouri", "rivals": ["aigles_akwa"], "difficulty": 3,
        "lore_fr": "Les dockers de l'autre rive du Wouri. Des épaules larges, des duels gagnés, et des centres qui tombent du ciel.",
        "lore_en": "The dockers from the other bank of the Wouri. Broad shoulders, duels won, and crosses that fall from the sky.",
        "mixed": False, "seed": 16,
    },
    {
        "id": "carrefour_ndokoti", "name": "Carrefour Ndokoti", "short": "NDK", "city": "Douala", "neighborhood": "Ndokoti",
        "kit_home": {"jersey": "#B8432F", "jersey2": "#F2EEE3", "pattern": "halves", "shorts": "#F2EEE3", "socks": "#B8432F"},
        "kit_away": {"jersey": "#F2EEE3", "jersey2": "#B8432F", "pattern": "sash", "shorts": "#B8432F", "socks": "#F2EEE3"},
        "kit_gk": {"jersey": "#2E6B45", "shorts": "#1C1C22", "socks": "#2E6B45"},
        "colors": ["#B8432F", "#F2EEE3"], "crest": "crossroads",
        "style": "counter", "formation": "1-2-1-1", "strength": 62, "rating_bias": 2,
        "stadium": "bepanda_terrain", "rivals": ["requins_bepanda"], "difficulty": 2,
        "lore_fr": "Au grand carrefour, tout va vite : les taxis, les klaxons et les contre-attaques des rouges et blancs.",
        "lore_en": "At the big crossroads everything moves fast: the taxis, the horns and the red-and-whites' counter-attacks.",
        "mixed": True, "seed": 17,
    },
    {
        "id": "rois_new_bell", "name": "Rois de New-Bell", "short": "NWB", "city": "Douala", "neighborhood": "New-Bell",
        "kit_home": {"jersey": "#3B2A6B", "jersey2": "#E3A92B", "pattern": "plain", "shorts": "#E3A92B", "socks": "#3B2A6B"},
        "kit_away": {"jersey": "#E3A92B", "jersey2": "#3B2A6B", "pattern": "stripes", "shorts": "#3B2A6B", "socks": "#E3A92B"},
        "kit_gk": {"jersey": "#F2EEE3", "shorts": "#1C1C22", "socks": "#F2EEE3"},
        "colors": ["#3B2A6B", "#E3A92B"], "crest": "crown",
        "style": "direct", "formation": "1-1-1-2", "strength": 65, "rating_bias": 3,
        "stadium": "stade_colline", "rivals": ["carrefour_ndokoti"], "difficulty": 3,
        "lore_fr": "Le quartier historique du makossa. Les Rois jouent avec le rythme : une touche, une passe, et le public qui chante.",
        "lore_en": "The historic makossa neighbourhood. The Rois play with rhythm: one touch, one pass, and the crowd sings.",
        "mixed": True, "seed": 18,
    },
    # the three Part I opponents of the novel (tournoi des quartiers)
    {
        "id": "gars_pharmacie", "name": "Gars de la Pharmacie", "short": "PHA", "city": "Douala", "neighborhood": "Bonamoussadi",
        "kit_home": {"jersey": "#F2EEE3", "jersey2": "#B8432F", "pattern": "plain", "shorts": "#B8432F", "socks": "#F2EEE3"},
        "kit_away": {"jersey": "#B8432F", "jersey2": "#F2EEE3", "pattern": "plain", "shorts": "#F2EEE3", "socks": "#B8432F"},
        "kit_gk": {"jersey": "#2E63B8", "shorts": "#1C1C22", "socks": "#2E63B8"},
        "colors": ["#F2EEE3", "#B8432F"], "crest": "cross",
        "style": "direct", "formation": "1-2-1-1", "strength": 54, "rating_bias": -3,
        "stadium": "bonamoussadi_terre", "rivals": ["lionceaux_bonamoussadi"], "difficulty": 1,
        "lore_fr": "Les gars du carrefour de la pharmacie, premiers adversaires des Lionceaux. Ils courent beaucoup et tirent de loin.",
        "lore_en": "The boys from the pharmacy crossroads, the Lionceaux's first opponents. They run a lot and shoot from far.",
        "mixed": True, "seed": 19,
    },
    {
        "id": "aigles_makepe", "name": "Aigles de Makepe", "short": "MAK", "city": "Douala", "neighborhood": "Makepe",
        "kit_home": {"jersey": "#8C4A1C", "jersey2": "#F2C230", "pattern": "stripes", "shorts": "#1C1C22", "socks": "#8C4A1C"},
        "kit_away": {"jersey": "#F2C230", "jersey2": "#8C4A1C", "pattern": "plain", "shorts": "#8C4A1C", "socks": "#F2C230"},
        "kit_gk": {"jersey": "#1F4D3A", "shorts": "#1C1C22", "socks": "#1F4D3A"},
        "colors": ["#8C4A1C", "#F2C230"], "crest": "eagle",
        "style": "physical", "formation": "1-2-1-1", "strength": 58, "rating_bias": 0,
        "stadium": "bonamoussadi_terre", "rivals": [], "difficulty": 2,
        "lore_fr": "Grands et lourds, les Aigles de Makepe aiment la boue : quand le terrain devient un lac, ils jouent long et haut.",
        "lore_en": "Tall and heavy, the Aigles of Makepe love the mud: when the pitch turns into a lake they go long and high.",
        "mixed": False, "seed": 20,
    },
    {
        "id": "cobras_bonaberi", "name": "Cobras de Bonabéri", "short": "COB", "city": "Douala", "neighborhood": "Bonabéri",
        "kit_home": {"jersey": "#5C6B2E", "jersey2": "#1C1C22", "pattern": "sash", "shorts": "#1C1C22", "socks": "#5C6B2E"},
        "kit_away": {"jersey": "#F2EEE3", "jersey2": "#5C6B2E", "pattern": "hoops", "shorts": "#5C6B2E", "socks": "#F2EEE3"},
        "kit_gk": {"jersey": "#E3A92B", "shorts": "#1C1C22", "socks": "#E3A92B"},
        "colors": ["#5C6B2E", "#1C1C22"], "crest": "snake",
        "style": "counter", "formation": "1-2-1-1", "strength": 59, "rating_bias": 1,
        "stadium": "bepanda_terrain", "rivals": [], "difficulty": 2,
        "lore_fr": "De l'autre côté du pont, les Cobras attendent dans l'herbe et mordent en contre. Un seul but suffit souvent.",
        "lore_en": "From across the bridge, the Cobras wait in the grass and bite on the counter. One goal is often enough.",
        "mixed": True, "seed": 21,
    },
]

ROLES_5 = ["GK", "DEF", "DEF", "MID", "FWD"]
BENCH_5 = ["MID", "FWD", "DEF"]
# an 18-player squad: 11 starters (1-4-3-3) + 7 on the bench
ROLES_11 = ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"]
BENCH_11 = ["GK", "DEF", "DEF", "MID", "MID", "FWD", "FWD"]
FORMATION_7 = {"1-2-1-1": "1-3-2-1", "1-1-1-2": "1-2-2-2"}
FORMATION_11 = {"1-2-1-1": "1-4-3-3", "1-1-1-2": "1-4-4-2"}
NUMBERS = {"GK": [1, 12, 16], "DEF": [2, 3, 4, 5, 13, 15], "MID": [6, 8, 10, 14, 18, 20], "FWD": [7, 9, 11, 17, 19, 21]}


def make_player(rnd, role, team, used_names, used_numbers, female=False):
    while True:
        given = rnd.choice(GIVEN_F if female else GIVEN_M)
        fam = rnd.choice(FAMILY)
        if (given, fam) in FORBIDDEN or (given, fam) in used_names:
            continue
        used_names.add((given, fam))
        break
    prof = ROLE_PROFILE[role]
    attrs = {}
    for k, v in prof.items():
        attrs[k] = max(25, min(95, int(v + team["rating_bias"] + rnd.gauss(0, 7))))
    num = next((n for n in NUMBERS[role] if n not in used_numbers), None) or rnd.randrange(13, 30)
    used_numbers.add(num)
    return {
        "id": f"{team['id']}_{given.lower()}_{fam.lower()}".replace("'", "").replace(" ", "_"),
        "given": given, "family": fam, "nick": "", "female": female,
        "role": role, "number": num, "skin": rnd.choice(SKIN), "hair": rnd.choice(HAIR_F if female else HAIR_M),
        "attrs": attrs,
    }


def build_team(t):
    rnd = random.Random(t["seed"])
    used_names, used_numbers = set(), set()
    players = []
    named = t.get("named", [])
    for n in named:
        used_numbers.add(n["number"])
        p = {"id": f"{t['id']}_{n['given'].lower()}".replace(" ", "_"), "given": n["given"], "family": n["family"], "nick": n.get("nick", ""),
             "female": n["given"] in GIVEN_F, "role": n["role"], "number": n["number"], "skin": n["skin"], "hair": n["hair"], "attrs": n["attrs"],
             "from_book": True}
        if n.get("socks_mismatch"):
            p["socks_mismatch"] = True
        for k in ("shirt", "shirt2", "shirt_pattern"):
            if k in n:
                p[k] = n[k]
        players.append(p)
    counts = [int(c) for c in t["formation"].split("-")]   # GK, DEF, MID, FWD
    roles5 = ["GK"] * counts[0] + ["DEF"] * counts[1] + ["MID"] * counts[2] + ["FWD"] * counts[3]
    roles_needed = ROLES_11 + BENCH_11
    for p in players:
        if p["role"] in roles_needed:
            roles_needed.remove(p["role"])
    TEES = ["#C9362B", "#F2C230", "#2E63B8", "#F2EEE3", "#E67E22", "#1ABC9C", "#8E44AD", "#5D6D7E", "#D35400", "#F7DC6F"]
    for i, role in enumerate(roles_needed):
        female = t["mixed"] and rnd.random() < 0.3
        p = make_player(rnd, role, t, used_names, used_numbers, female)
        if "kit_story" in t:
            p["shirt"] = rnd.choice(TEES)
            p["shirt2"] = rnd.choice(TEES)
            p["shirt_pattern"] = rnd.choice(["plain", "plain", "hoops", "halves"])
        players.append(p)
    # starters per format, book characters first, then the best attributes
    pool = sorted(players, key=lambda p: (not p.get("from_book", False), -sum(p["attrs"].values())))

    def pick(roles):
        chosen = []
        for role in roles:
            for p in pool:
                if p["role"] == role and p["id"] not in chosen:
                    chosen.append(p["id"])
                    break
        return chosen

    f7 = FORMATION_7[t["formation"]]
    f11 = FORMATION_11[t["formation"]]
    roles7 = sum(([r] * int(c) for r, c in zip(("GK", "DEF", "MID", "FWD"), f7.split("-"))), [])
    roles11 = sum(([r] * int(c) for r, c in zip(("GK", "DEF", "MID", "FWD"), f11.split("-"))), [])
    out = {k: v for k, v in t.items() if k not in ("named", "seed", "rating_bias", "mixed")}
    out["players"] = players
    out["lineup"] = pick(roles5)
    out["formation7"] = f7
    out["lineup7"] = pick(roles7)
    out["formation11"] = f11
    out["lineup11"] = pick(roles11)
    out["schema"] = 1
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    index = []
    for t in TEAMS:
        team = build_team(t)
        with open(os.path.join(OUT, team["id"] + ".json"), "w", encoding="utf-8") as f:
            json.dump(team, f, ensure_ascii=False, indent=1)
        index.append({"id": team["id"], "name": team["name"], "short": team["short"], "city": team["city"], "neighborhood": team["neighborhood"],
                      "colors": team["colors"], "strength": team["strength"], "stadium": team["stadium"]})
        print(team["id"], len(team["players"]), "players; lineup", team["lineup"])
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
