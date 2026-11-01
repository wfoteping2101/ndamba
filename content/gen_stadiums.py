"""Generates content/stadiums/*.json: neighbourhood grounds with their props and crowd.

World is 800 x 520 px; the pitch rectangle is (200, 135, 400, 250): 50 m x 31 m at 8 px/m.
Prop positions are the bottom-centre pivot in world pixels. Crowd spots are feet positions.
"""
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "stadiums")

PITCH = {"x": 200, "y": 135, "w": 400, "h": 250}

SURFACES = {
    # roll: constant deceleration (px/s^2); drag: proportional (1/s); bounce: restitution;
    # bounce_drag: horizontal speed kept on each bounce; player_speed: movement multiplier;
    # dust: particle intensity; dribble_error: extra ball-control noise.
    "terre": {"roll": 150, "drag": 0.55, "bounce": 0.52, "bounce_drag": 0.82, "player_speed": 1.0, "dust": 1.0, "dribble_error": 0.10},
    "grass": {"roll": 125, "drag": 0.45, "bounce": 0.58, "bounce_drag": 0.86, "player_speed": 1.02, "dust": 0.0, "dribble_error": 0.04},
    "sand":  {"roll": 260, "drag": 1.10, "bounce": 0.32, "bounce_drag": 0.65, "player_speed": 0.86, "dust": 0.7, "dribble_error": 0.14},
    "mud":   {"roll": 215, "drag": 0.95, "bounce": 0.30, "bounce_drag": 0.60, "player_speed": 0.90, "dust": 0.0, "dribble_error": 0.16, "splash": 1.0},
}


def houses_row(rnd, y, x0, x1, step=92):
    out = []
    x = x0
    i = 0
    while x < x1:
        out.append({"type": f"house_{(i * 3 + rnd.randrange(5)) % 5}", "x": x + rnd.randrange(-6, 6), "y": y + rnd.randrange(-3, 3)})
        x += step + rnd.randrange(-10, 14)
        i += 1
    return out


def crowd_line(rnd, y, x0, x1, n, jitter=5):
    return [{"x": int(x0 + (x1 - x0) * (i + 0.5) / n + rnd.randrange(-jitter, jitter)), "y": y + rnd.randrange(-3, 4)} for i in range(n)]


def bonamoussadi():
    rnd = random.Random(1)
    props = houses_row(rnd, 100, 40, 760)
    props += [
        {"type": "mango_tree", "x": 672, "y": 118},                      # the mango tree in the corner (chapter 1)
        {"type": "pole", "x": 128, "y": 128},
        {"type": "wall_mural", "x": 400, "y": 122},
        {"type": "vendor_stand", "x": 92, "y": 300},                       # Madame Ekotto's beignets
        {"type": "chair_white", "x": 118, "y": 326}, {"type": "chair_blue", "x": 134, "y": 330},
        {"type": "bench", "x": 300, "y": 430}, {"type": "bench", "x": 520, "y": 432},
        {"type": "benskin_blue", "x": 250, "y": 506}, {"type": "benskin_red", "x": 290, "y": 509}, {"type": "benskin_yellow", "x": 560, "y": 507},
        {"type": "chair_white", "x": 690, "y": 300}, {"type": "pole", "x": 716, "y": 420},
    ]
    crowd = crowd_line(rnd, 128, 150, 650, 26) + crowd_line(rnd, 440, 240, 580, 9, 8) + \
            [{"x": 140, "y": 300}, {"x": 156, "y": 306}, {"x": 690, "y": 250}, {"x": 700, "y": 268}, {"x": 712, "y": 290}]
    return {
        "id": "bonamoussadi_terre", "schema": 1,
        "name_fr": "Terrain de Bonamoussadi", "name_en": "Bonamoussadi Ground",
        "city": "Douala", "neighborhood": "Bonamoussadi", "surface": "terre", "goal_style": "bamboo",
        "capacity": 120, "lighting": "golden", "tint": "#FFE2B8",
        "props": props, "crowd": crowd,
        "desc_fr": "Le terrain de terre rouge des Lionceaux : deux buts en bambou, un manguier au coin, les benskins qui klaxonnent et Madame Ekotto qui vend ses beignets-haricots.",
        "desc_en": "The Lionceaux's red-earth ground: two bamboo goals, a mango tree in the corner, honking benskins and Madame Ekotto selling her beignets-haricots.",
    }


def mokolo():
    rnd = random.Random(2)
    props = houses_row(rnd, 98, 20, 780, 84)
    props += [
        {"type": "vendor_stand", "x": 70, "y": 240}, {"type": "vendor_stand", "x": 110, "y": 262}, {"type": "vendor_stand", "x": 84, "y": 300},
        {"type": "wall_mural", "x": 300, "y": 124}, {"type": "wall_mural", "x": 520, "y": 124},
        {"type": "pole", "x": 702, "y": 128}, {"type": "pole", "x": 150, "y": 126},
        {"type": "mango_tree_2", "x": 730, "y": 420},
        {"type": "benskin_yellow", "x": 320, "y": 506}, {"type": "benskin_yellow", "x": 352, "y": 508}, {"type": "benskin_blue", "x": 384, "y": 505},
        {"type": "bench", "x": 460, "y": 430},
    ]
    crowd = crowd_line(rnd, 130, 160, 640, 30) + crowd_line(rnd, 440, 220, 600, 12, 8) + [{"x": 700, "y": 300}, {"x": 714, "y": 320}, {"x": 150, "y": 330}]
    return {
        "id": "mokolo_marche", "schema": 1, "name_fr": "Terrain du marché Mokolo", "name_en": "Mokolo Market Ground",
        "city": "Yaoundé", "neighborhood": "Mokolo", "surface": "terre", "goal_style": "metal", "capacity": 160, "lighting": "noon", "tint": "#FFFFFF",
        "props": props, "crowd": crowd,
        "desc_fr": "Entre les étals du grand marché : les vendeuses regardent le match depuis leurs parasols et les benskins font des allers-retours.",
        "desc_en": "Between the stalls of the big market: the vendors watch from under their umbrellas and the benskins come and go.",
    }


def bepanda():
    rnd = random.Random(3)
    props = houses_row(rnd, 102, 60, 740, 98)
    props += [
        {"type": "wall_mural", "x": 200, "y": 122}, {"type": "wall_mural", "x": 600, "y": 122},
        {"type": "pole", "x": 120, "y": 150}, {"type": "pole", "x": 690, "y": 440},
        {"type": "mango_tree", "x": 110, "y": 430}, {"type": "bench", "x": 400, "y": 432},
        {"type": "benskin_red", "x": 480, "y": 506}, {"type": "benskin_blue", "x": 520, "y": 508},
    ]
    crowd = crowd_line(rnd, 130, 160, 640, 24) + crowd_line(rnd, 442, 250, 560, 8, 8)
    return {
        "id": "bepanda_terrain", "schema": 1, "name_fr": "Terrain de Bépanda", "name_en": "Bépanda Ground",
        "city": "Douala", "neighborhood": "Bépanda", "surface": "terre", "goal_style": "metal", "capacity": 130, "lighting": "overcast", "tint": "#E8ECF2",
        "props": props, "crowd": crowd,
        "desc_fr": "Le fief des Requins, un terrain dur et bruyant derrière les maisons de Bépanda. Ici on ne fait pas de cadeaux.",
        "desc_en": "The Requins' home, a hard and noisy ground behind the houses of Bépanda. No gifts are given here.",
    }


def deido():
    rnd = random.Random(4)
    props = houses_row(rnd, 100, 80, 700, 110)
    props += [
        {"type": "palm", "x": 60, "y": 150}, {"type": "palm", "x": 740, "y": 160}, {"type": "palm", "x": 720, "y": 440}, {"type": "palm", "x": 90, "y": 450},
        {"type": "vendor_stand", "x": 400, "y": 440}, {"type": "bench", "x": 300, "y": 428}, {"type": "bench", "x": 500, "y": 430},
        {"type": "benskin_blue", "x": 200, "y": 506},
    ]
    crowd = crowd_line(rnd, 130, 180, 620, 22) + crowd_line(rnd, 442, 230, 570, 10, 8)
    return {
        "id": "deido_terrain", "schema": 1, "name_fr": "Terrain de Deïdo", "name_en": "Deïdo Ground",
        "city": "Douala", "neighborhood": "Deïdo", "surface": "sand", "goal_style": "bamboo", "capacity": 110, "lighting": "golden", "tint": "#FFE8C8",
        "props": props, "crowd": crowd,
        "desc_fr": "Près du fleuve Wouri, un terrain de sable sous les palmiers. Le ballon roule moins, les jambes brûlent plus.",
        "desc_en": "Near the Wouri river, a sand pitch under the palms. The ball rolls less, the legs burn more.",
    }


FULL_PITCH = {"x": 150, "y": 108, "w": 840, "h": 544}   # 105 m x 68 m at 8 px/m, world 1140 x 760


def terrace_row(rnd, y, x0, x1, seg=120, rows=3, step=9, density=1.0, variant_seed=0):
    """Terrace segments along [x0, x1] with their bottom at y, and the crowd sitting on the steps.
    Crowd spots carry a `lift` so the sprite is drawn on the step while y-sorting in front of the stand."""
    props, crowd = [], []
    x = x0
    i = 0
    while x + seg <= x1 + 1:
        props.append({"type": "terrace" if (i + variant_seed) % 2 == 0 else "terrace_2", "x": x + seg // 2, "y": y})
        for r in range(rows):
            n = int(seg / 22 * density)
            for k in range(n):
                if rnd.random() < 0.82:
                    crowd.append({"x": int(x + 12 + (seg - 24) * (k + 0.5) / n + rnd.randrange(-4, 5)), "y": y + 1, "lift": 4 + r * step})
        x += seg
        i += 1
    return props, crowd


def full_stadium(id_, name_fr, name_en, city, neighborhood, surface, lighting, tint, seed, desc_fr, desc_en, capacity):
    rnd = random.Random(seed)
    px, py, pw, ph = FULL_PITCH["x"], FULL_PITCH["y"], FULL_PITCH["w"], FULL_PITCH["h"]
    props, crowd = [], []
    # north stand: a continuous terrace just behind the far touchline
    tp, tc = terrace_row(rnd, py - 16, px, px + pw, seg=120, rows=3, density=1.0, variant_seed=seed)
    props += tp
    crowd += tc
    # south stand: two blocks either side of the dugouts
    for (x0, x1) in ((px, px + 240), (px + pw - 240, px + pw)):
        tp, tc = terrace_row(rnd, py + ph + 74, x0, x1, seg=120, rows=2, density=0.9, variant_seed=seed + 1)
        props += tp
        crowd += tc
    # perimeter advertising boards (original brands), alternating, behind both touchlines
    k = 0
    x = px + 8
    while x + 96 <= px + pw - 8:
        props.append({"type": "ad_%d" % (k % 8), "x": x + 48, "y": py - 4})
        props.append({"type": "ad_%d" % ((k + 3) % 8), "x": x + 48, "y": py + ph + 8})
        x += 100
        k += 1
    props += [{"type": "dugout", "x": px + pw // 2 - 60, "y": py + ph + 40}, {"type": "dugout", "x": px + pw // 2 + 60, "y": py + ph + 40},
              {"type": "floodlight", "x": px - 40, "y": py - 30}, {"type": "floodlight", "x": px + pw + 40, "y": py - 30},
              {"type": "floodlight", "x": px - 44, "y": py + ph + 60}, {"type": "floodlight", "x": px + pw + 44, "y": py + ph + 60},
              {"type": "vendor_stand", "x": px + pw // 2 - 170, "y": py + ph + 60}, {"type": "vendor_stand", "x": px + pw // 2 + 176, "y": py + ph + 64},
              {"type": "benskin_yellow", "x": 60, "y": 740}, {"type": "benskin_blue", "x": 96, "y": 744}, {"type": "benskin_red", "x": 1060, "y": 742}]
    # standing fans along the ends
    crowd += crowd_line(rnd, py + ph // 2 - 60, px - 60, px - 50, 4, 3) + crowd_line(rnd, py + ph // 2 + 60, px + pw + 50, px + pw + 60, 4, 3)
    return {
        "id": id_, "schema": 1, "layout": "full", "name_fr": name_fr, "name_en": name_en, "city": city, "neighborhood": neighborhood,
        "surface": surface, "goal_style": "metal", "capacity": capacity, "lighting": lighting, "tint": tint,
        "props": props, "crowd": crowd, "desc_fr": desc_fr, "desc_en": desc_en,
    }


def full_stadiums():
    return [
        full_stadium("stade_wouri", "Stade du Wouri", "Wouri Stadium", "Douala", "Bonabéri", "grass", "noon", "#FFFFFF", 31,
                     "Le grand stade de Douala : pelouse, tribunes en béton peintes aux couleurs du pays, et un bruit de tonnerre quand le ballon entre.",
                     "Douala's big stadium: grass, concrete stands painted in the country's colours, and a roar like thunder when the ball goes in.", 3200),
        full_stadium("stade_colline", "Stade de la Colline", "Hill Stadium", "Yaoundé", "Nkolbisson", "grass", "overcast", "#E8ECF2", 32,
                     "Sur une colline de Yaoundé, souvent sous les nuages. La pelouse est lourde, les tribunes sont pleines de drapeaux.",
                     "On a Yaoundé hill, often under the clouds. The grass is heavy and the stands are full of flags.", 2800),
        full_stadium("stade_hauts_plateaux", "Stade des Hauts-Plateaux", "Highlands Stadium", "Bafoussam", "Tamdja", "terre", "golden", "#FFE2B8", 33,
                     "Un grand terrain de terre rouge dans l'Ouest, avec des tribunes de fortune et le soleil qui se couche derrière les montagnes.",
                     "A big red-earth pitch in the West, with makeshift stands and the sun setting behind the mountains.", 1800),
    ]


def main():
    os.makedirs(OUT, exist_ok=True)
    index = []
    for s in (bonamoussadi(), mokolo(), bepanda(), deido(), *full_stadiums()):
        s.setdefault("layout", "street")
        with open(os.path.join(OUT, s["id"] + ".json"), "w", encoding="utf-8") as f:
            json.dump(s, f, ensure_ascii=False, indent=1)
        index.append({k: s[k] for k in ("id", "name_fr", "name_en", "city", "neighborhood", "surface", "layout")})
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, "surfaces.json"), "w", encoding="utf-8") as f:
        json.dump(SURFACES, f, indent=1)
    with open(os.path.join(OUT, "pitch.json"), "w", encoding="utf-8") as f:
        json.dump({"ppm": 8.0, "layouts": {
            "street": {"world": [800, 520], "pitch": PITCH, "goal_width_m": 3.75, "goal_height_m": 2.1, "rules": "street", "formats": ["5v5", "7v7"]},
            "full": {"world": [1140, 760], "pitch": FULL_PITCH, "goal_width_m": 7.32, "goal_height_m": 2.44, "rules": "full", "formats": ["11v11", "7v7"]}}}, f, indent=1)
    print("stadiums:", [i["id"] for i in index])


if __name__ == "__main__":
    main()
