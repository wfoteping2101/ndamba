"""
The neighbourhood crowd for the Unity match game: static figures (crowd.py's bake) in the poses people
take around an earth pitch in Douala or Yaoundé (standing, sitting on the ground or on a bench, cheering,
pointing), exported as FBX with the clothing regions in the vertex colours.

  python3 tools/humans/export_unity_crowd.py <out_dir>
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import crowd as CR  # noqa: E402

KID = ['body', 'calves', 'thighs', 'forearms', 'feet', 'eye_l', 'eye_r', 'hair_crop', 'shirt', 'shorts']
MAN = ['body', 'forearms', 'eye_l', 'eye_r', 'hair_crop', 'shirt', 'trousers', 'shoe_l', 'shoe_r']
WOMAN = ['body', 'forearms', 'feet', 'eye_l', 'eye_r', 'hair_wrap', 'wrap_knot', 'dress_top', 'skirt']
NEAR = {
    'kidStand': ('boy', 'idleRelaxed', 1.0, KID, 1400),
    'kidGround': ('boy', 'sitGround', 2.0, KID, 1400),
    'kidCheer': ('boy', 'jumpJoy', 1.2, KID, 1400),
    'manStand': ('man', 'idleRelaxed', 2.0, MAN, 1400),
    'manCheer': ('man', 'happy', 1.5, MAN, 1400),
    'manPoint': ('man', 'point', 1.5, MAN, 1400),
    'manSit': ('man', 'sitIdle', 1.5, MAN, 1400),
    'womanStand': ('woman', 'idleRelaxed', 0.5, WOMAN, 1400),
    'womanCheer': ('woman', 'happy', 1.2, WOMAN, 1400),
    'womanSit': ('woman', 'sitIdle', 1.5, WOMAN, 1400),
}

if __name__ == '__main__':
    out = sys.argv[1]
    CR.VARIANTS.update(NEAR)
    meta = {n: CR.bake(n, fbx_dir=out) for n in NEAR}
    json.dump(meta, open(os.path.join(out, 'crowd.json'), 'w'), indent=1)
