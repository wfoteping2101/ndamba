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


def main():
    os.makedirs(OUT, exist_ok=True)
    index = []
    for s in (bonamoussadi(), mokolo(), bepanda(), deido()):
        with open(os.path.join(OUT, s["id"] + ".json"), "w", encoding="utf-8") as f:
            json.dump(s, f, ensure_ascii=False, indent=1)
        index.append({k: s[k] for k in ("id", "name_fr", "name_en", "city", "neighborhood", "surface")})
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, "surfaces.json"), "w", encoding="utf-8") as f:
        json.dump(SURFACES, f, indent=1)
    with open(os.path.join(OUT, "pitch.json"), "w", encoding="utf-8") as f:
        json.dump({"world": [800, 520], "pitch": PITCH, "ppm": 8.0, "goal_width_m": 3.75, "goal_height_m": 2.1, "format": "5v5"}, f, indent=1)
    print("stadiums:", [i["id"] for i in index])


if __name__ == "__main__":
    main()
