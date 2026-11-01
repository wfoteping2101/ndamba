"""Generates the manager-campaign content (content/manager/*.json).

Clubs are fictional: named after neighbourhoods, hills, rivers and markets of Cameroon's
cities, never after a real club. Continental opponents are named after districts of other
African cities, with no federation branding. Squads are generated inside the game from the
name pools below (fixed seeds per club), so this file only carries identities.

Run: python3 -I gen_manager.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "manager")
os.makedirs(OUT, exist_ok=True)

# (id, name, short, city, colours, baseline strength 0..100)
LIGUE_1 = [
    ("tonnerre_mvog_ada", "Tonnerre de Mvog-Ada", "TMA", "Yaoundé", ["#B8432F", "#F6F1E4"], 74),
    ("aigles_akwa", "Aigles d'Akwa", "AKW", "Douala", ["#1F4D3A", "#E3A92B"], 72),
    ("buffles_bafoussam", "Buffles de Bafoussam", "BUF", "Bafoussam", ["#2B3F7A", "#F6F1E4"], 70),
    ("marins_kribi", "Marins de Kribi", "KRI", "Kribi", ["#1C6E8C", "#F2EEE3"], 68),
    ("volcans_buea", "Volcans de Buéa", "BUE", "Buéa", ["#6B2D2D", "#E3A92B"], 69),
    ("eclairs_garoua", "Éclairs de Garoua", "GAR", "Garoua", ["#E3A92B", "#101814"], 67),
    ("cavaliers_maroua", "Cavaliers de Maroua", "MAR", "Maroua", ["#8C4A1C", "#F6F1E4"], 66),
    ("sanaga_edea", "Sanaga d'Édéa", "EDE", "Édéa", ["#2E6B45", "#F6F1E4"], 65),
    ("foudre_bamenda", "Foudre de Bamenda", "BAM", "Bamenda", ["#3B2A6B", "#E3A92B"], 66),
    ("port_bonaberi", "Port de Bonabéri", "BON", "Douala", ["#101814", "#C5762F"], 64),
    ("elephants_ebolowa", "Éléphants d'Ébolowa", "EBO", "Ébolowa", ["#5C6B2E", "#F6F1E4"], 63),
    ("falaises_ngaoundere", "Falaises de Ngaoundéré", "NGA", "Ngaoundéré", ["#A63A2A", "#F2EEE3"], 62),
    ("pecheurs_limbe", "Pêcheurs de Limbé", "LIM", "Limbé", ["#1C6E8C", "#E3A92B"], 61),
    ("lions_mokolo", "Lions de Mokolo", "MOK", "Yaoundé", ["#C5762F", "#101814"], 60),
    ("tsinga_tigres", "Tigres de Tsinga", "TSI", "Yaoundé", ["#E3A92B", "#101814"], 65),
    ("mfandena_olympique", "Mfandena Olympique", "MFA", "Yaoundé", ["#B8432F", "#F6F1E4"], 64),
]
LIGUE_2 = [
    ("colline_nkolbisson", "Colline de Nkolbisson", "NKB", "Yaoundé", ["#2B3F7A", "#E3A92B"], 56),
    ("carrefour_ndokoti", "Carrefour Ndokoti", "NDK", "Douala", ["#B8432F", "#101814"], 55),
    ("gazelles_bertoua", "Gazelles de Bertoua", "BER", "Bertoua", ["#5C6B2E", "#E3A92B"], 54),
    ("cacao_mbalmayo", "Cacao de Mbalmayo", "MBA", "Mbalmayo", ["#6B2D2D", "#F6F1E4"], 53),
    ("brumes_dschang", "Brumes de Dschang", "DSC", "Dschang", ["#1F4D3A", "#F2EEE3"], 54),
    ("marche_mboppi", "Marché Mboppi", "MBO", "Douala", ["#E3A92B", "#2B3F7A"], 52),
    ("etoiles_kumba", "Étoiles de Kumba", "KUM", "Kumba", ["#101814", "#E3A92B"], 52),
    ("savane_bafia", "Savane de Bafia", "BAF", "Bafia", ["#8C4A1C", "#F2EEE3"], 50),
    ("fleuve_sangmelima", "Fleuve de Sangmélima", "SAN", "Sangmélima", ["#1C6E8C", "#F6F1E4"], 50),
    ("pierres_foumban", "Pierres de Foumban", "FOU", "Foumban", ["#3B2A6B", "#F6F1E4"], 51),
    ("gare_nkongsamba", "Gare de Nkongsamba", "NKS", "Nkongsamba", ["#C5762F", "#F6F1E4"], 49),
    ("plateau_bafang", "Plateau de Bafang", "BFG", "Bafang", ["#2E6B45", "#E3A92B"], 48),
    ("melen_academiciens", "Académiciens de Melen", "MEL", "Yaoundé", ["#3B2A6B", "#F2C230"], 55),
    ("biyem_assi_dynamo", "Dynamo Biyem-Assi", "BYA", "Yaoundé", ["#2B3F7A", "#E3A92B"], 53),
    ("nlongkak_rond_point", "Rond-Point Nlongkak", "NLK", "Yaoundé", ["#C5762F", "#F2EEE3"], 52),
    ("cite_verte_sporting", "Sporting Cité Verte", "CVT", "Yaoundé", ["#2E6B45", "#F6F1E4"], 50),
]
LIGUE_3 = [
    ("lionceaux_bonamoussadi", "Lionceaux de Bonamoussadi", "LIO", "Douala", ["#2E6B45", "#F2EEE3"], 40),
    ("requins_bepanda", "Requins de Bépanda", "BEP", "Douala", ["#1C6E8C", "#F6F1E4"], 42),
    ("pantheres_deido", "Panthères de Deïdo", "DEI", "Douala", ["#101814", "#E3A92B"], 43),
    ("mokolo_etoiles", "Mokolo Étoiles", "MKE", "Yaoundé", ["#C5762F", "#101814"], 41),
    ("ravin_mvog_mbi", "Ravin de Mvog-Mbi", "MVM", "Yaoundé", ["#B8432F", "#F6F1E4"], 40),
    ("etoudi_fc", "Étoudi FC", "ETO", "Yaoundé", ["#2B3F7A", "#F6F1E4"], 41),
    ("pont_japoma", "Pont de Japoma", "JAP", "Douala", ["#5C6B2E", "#F2EEE3"], 38),
    ("tamtam_bonapriso", "Tam-Tam de Bonapriso", "BPR", "Douala", ["#6B2D2D", "#F6F1E4"], 41),
    ("carriere_bastos", "Carrière de Bastos", "BAS", "Yaoundé", ["#3B2A6B", "#F6F1E4"], 37),
    ("bananiers_penja", "Bananiers de Penja", "PEN", "Penja", ["#E3A92B", "#1F4D3A"], 36),
    ("avions_odza", "Avions d'Odza", "ODZ", "Yaoundé", ["#1C6E8C", "#F6F1E4"], 42),
    ("messa_si_colline", "Colline de Messa-Si", "MSS", "Yaoundé", ["#8C4A1C", "#F2EEE3"], 38),
    ("etoile_olembe", "Étoile d'Olembé", "OLB", "Yaoundé", ["#F2EEE3", "#B8432F"], 40),
    ("ngousso_fc", "Ngousso FC", "NGO", "Yaoundé", ["#1F4D3A", "#F6F1E4"], 39),
    ("guerriers_tongolo", "Guerriers de Tongolo", "TON", "Yaoundé", ["#101814", "#E3A92B"], 41),
    ("coqs_emana", "Coqs d'Emana", "EMA", "Yaoundé", ["#B8432F", "#E3A92B"], 38),
]
# Fictional continental sides (district names, no real club or federation)
CONTINENTAL = [
    ("medina_dakar", "Médina Dakar FC", "MED", "Dakar", ["#2E6B45", "#E3A92B"], 78),
    ("treichville_abidjan", "Treichville Union", "TRE", "Abidjan", ["#C5762F", "#F6F1E4"], 79),
    ("surulere_lagos", "Surulere Stars", "SUR", "Lagos", ["#1F4D3A", "#F2EEE3"], 80),
    ("bab_el_oued", "Bab El Oued SC", "BEO", "Alger", ["#F6F1E4", "#B8432F"], 82),
    ("derb_sultan", "Derb Sultan Athletic", "DSA", "Casablanca", ["#B8432F", "#F6F1E4"], 83),
    ("shubra_cairo", "Shubra Giants", "SHU", "Le Caire", ["#101814", "#E3A92B"], 84),
    ("soweto_lions", "Soweto Lions", "SOW", "Johannesburg", ["#E3A92B", "#101814"], 81),
    ("kariakoo_dar", "Kariakoo United", "KAR", "Dar es Salaam", ["#2B3F7A", "#F6F1E4"], 74),
    ("kisenso_kinshasa", "Kisenso Élan", "KIS", "Kinshasa", ["#5C6B2E", "#E3A92B"], 76),
    ("nima_accra", "Nima Royals", "NIM", "Accra", ["#8C4A1C", "#F2EEE3"], 77),
    ("ouagadougou_gounghin", "Gounghin FC", "GOU", "Ouagadougou", ["#1C6E8C", "#F6F1E4"], 72),
    ("libreville_nzeng", "Nzeng-Ayong SC", "NZE", "Libreville", ["#3B2A6B", "#E3A92B"], 70),
    ("kasarani_nairobi", "Kasarani Rovers", "KAS", "Nairobi", ["#6B2D2D", "#F6F1E4"], 73),
    ("bamako_badalabougou", "Badalabougou AC", "BAD", "Bamako", ["#2E6B45", "#F6F1E4"], 71),
    ("lusaka_matero", "Matero Hornets", "MAT", "Lusaka", ["#E3A92B", "#2B3F7A"], 70),
]

GIVEN_M = ["Brice", "Junior", "Rodrigue", "Lionel", "Christian", "Arnaud", "Kevin", "Wilfried", "Marius", "Serge",
           "Ibrahim", "Oumarou", "Moussa", "Hervé", "Cédric", "Patrick", "Yannick", "Franck", "Stéphane", "Joël",
           "Aboubakar", "Hamadou", "Idrissou", "Boris", "Landry", "Thierry", "Paul", "Emmanuel", "Fabrice", "Loïc",
           "Alain", "Bertrand", "Clovis", "Dieudonné", "Éric", "Gaston", "Hugues", "Jean-Marc", "Léandre", "Narcisse",
           "Olivier", "Parfait", "Raoul", "Sylvain", "Ulrich", "Valère", "Willy", "Yves", "Zacharie", "Mamadou"]
GIVEN_F = ["Aïcha", "Mireille", "Grâce", "Esther", "Fadimatou", "Amina", "Clarisse", "Nadège", "Sandrine", "Prisca",
           "Larissa", "Ornella", "Carine", "Vanessa", "Gaëlle", "Raïssa", "Michelle", "Ajara", "Hadja", "Doris"]
FAMILY = ["Mvondo", "Eyenga", "Bello", "Fokou", "Atéba", "Nguema", "Tchoupo", "Ndoumbé", "Mbarga", "Ngando",
          "Kamga", "Djoumessi", "Fotso", "Essomba", "Abega", "Nlend", "Ekotto", "Moukoko", "Etoundi", "Mbida",
          "Ngono", "Bikoko", "Dikongué", "Ebongué", "Kouam", "Tagne", "Mengue", "Owona", "Zambo", "Ndzana",
          "Toko", "Epée", "Bassong", "Njoya", "Ahanda", "Mboma Essono", "Biloa", "Ngo Nyobé", "Tsala", "Kemajou",
          "Wandji", "Nana", "Sadi", "Alioum", "Djibril", "Mahamat", "Oyono", "Abanda", "Mballa", "Ngoumou"]
# never combined (real players)
FORBIDDEN = [["Samuel", "Eto'o"], ["Vincent", "Aboubakar"], ["André", "Onana"], ["Rigobert", "Song"],
             ["Roger", "Milla"], ["Kylian", "Mbappé"], ["Patrick", "Mboma"], ["Joël", "Matip"]]


def club(c, division):
    cid, name, short, city, colours, strength = c
    return {"id": cid, "name": name, "short": short, "city": city, "colors": colours,
            "strength": strength, "division": division}


clubs = [club(c, 1) for c in LIGUE_1] + [club(c, 2) for c in LIGUE_2] + [club(c, 3) for c in LIGUE_3] \
    + [club(c, 0) for c in CONTINENTAL]
ids = [c["id"] for c in clubs]
assert len(ids) == len(set(ids)), "duplicate club id"
with open(os.path.join(OUT, "clubs.json"), "w", encoding="utf-8") as f:
    json.dump(clubs, f, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, "names.json"), "w", encoding="utf-8") as f:
    json.dump({"given_m": GIVEN_M, "given_f": GIVEN_F, "family": FAMILY, "forbidden": FORBIDDEN}, f,
              ensure_ascii=False, indent=1)
print("wrote", len(clubs), "clubs to", OUT)
