# =====================================================================
# alien.py  |  Patio kid alien mascot  |  Blender 4.x / 5.x
# =====================================================================
# Usage: Scripting tab > Open > Run Script (Alt+P). Every run rebuilds everything from scratch.
# Headless (builds, exports the GLB next to this file and checks it, no window needed):
#   blender -b -P alien.py -- --res 0.5 --export
#
# Hierarchy (every pivot is an Empty; parts are rigid, there are no bones):
#   Alien > Body > Head > Eye_L, Eye_R, Antenna_L, Antenna_R, Mouth (shape keys)
#                > Shoulder_L/R > Wrist_L/R
#                > Hip_L/R
# Animations (one NLA track per clip, the track name is the clip name):
#   Idle, Walk, Jump, Wave, Wink, Smile, CrazyFace
# Sides: _L = +X (character's left), _R = -X (character's right).
# The character faces -Y (in glTF / Three.js it faces +Z).

import bpy
import bmesh
import json
import os
import struct
import sys
import traceback
from math import pi, sin, cos, sqrt, radians, copysign
from mathutils import Vector

# ------------------------------ SETTINGS ------------------------------
# Sphere quality. 1.0 = full detail (authoring). Approx. triangles for the whole character:
#   RES 1.0 ~32k | 0.6 ~12k | 0.5 ~9k | 0.4 ~7k | 0.3 ~5k (the script prints the exact count)
# Suggested: 0.5 for the GLB, 0.4 for low-end Android.
RES = 1.0
PREVIEW = None        # clip name, e.g. "Wave", to play just that clip with Space. None = all tracks active
EXPORT_GLB = False    # True: export alien.glb next to this script (keep PREVIEW = None)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []   # headless: -- --res 0.5 --export
if "--res" in ARGS:
    RES = float(ARGS[ARGS.index("--res") + 1])
if "--export" in ARGS:
    EXPORT_GLB = True
# ----------------------------------------------------------------------

scene = bpy.context.scene
col = scene.collection


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.actions,
                 bpy.data.lights, bpy.data.cameras):
        for d in list(coll):
            if d.users == 0 or d.use_fake_user:
                try:
                    coll.remove(d)
                except Exception:
                    pass


clear_scene()


# ----------------------------- materials -----------------------------
def hex_color(h):
    """'#RRGGBB' (sRGB, as in the reference sheet) to Blender's linear color."""
    h = h.lstrip('#')
    v = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in v)


def material(name, color, rough=0.6, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hex_color(color), 1)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*hex_color(color), 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


SKIN = material("Skin", "#8FD28C", 0.55)
SKIN_DARK = material("SkinDark", "#5BAA68", 0.6)     # head spots
SHIRT = material("Shirt", "#F2EAD8", 0.85)
BLUE = material("Blue", "#4F72B8", 0.8)               # collar, cuffs, shorts
EYE = material("Eye", "#0A1230", 0.3)
SHINE = material("Shine", "#FFFFFF", 0.3, emit=2.0)
CHEEK = material("Cheek", "#F29B8C", 0.7)
MOUTH_IN = material("MouthInside", "#7A1F2B", 0.4)
GRASS = material("Grass", "#8DC04D", 0.95)


# ------------------------------- helpers -------------------------------
def res(n):
    return max(8, round(n * RES))


def link(o, parent=None):
    col.objects.link(o)
    if parent is not None:
        o.parent = parent  # no parent inverse: the location is local to the parent
    return o


def pivot(name, loc, parent=None, rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = 'PLAIN_AXES'
    e.empty_display_size = 0.1
    e.location = loc
    e.rotation_euler = [radians(a) for a in rot]
    return link(e, parent)


def mesh_from(name, verts, faces, materials, recalc=True):
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in verts]
    bm.verts.ensure_lookup_table()
    for f in faces:
        bm.faces.new([vs[i] for i in f])
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    for m in materials:
        me.materials.append(m)
    return me


def part(parent, name, radii, loc, mat, rot=(0, 0, 0), seg=48, rings=24, warp=None):
    """Scaled UV sphere: the building block of the whole character.
    warp(p) can reshape the unit sphere before it is scaled by radii (used for the pear-shaped torso)."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=res(seg), v_segments=res(rings), radius=1.0)
    for v in bm.verts:
        p = tuple(v.co)
        if warp:
            p = warp(p)
        v.co = (p[0] * radii[0], p[1] * radii[1], p[2] * radii[2])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.rotation_euler = rot
    return link(o, parent)


def torus(parent, name, major, minor, loc, mat, scale=(1, 1, 1), seg=48, sides=12):
    ns, nt = res(seg), max(6, res(sides))
    verts, faces = [], []
    for i in range(ns):
        u = 2 * pi * i / ns
        for j in range(nt):
            v = 2 * pi * j / nt
            r = major + minor * cos(v)
            verts.append((r * cos(u) * scale[0], r * sin(u) * scale[1], minor * sin(v) * scale[2]))
    for i in range(ns):
        for j in range(nt):
            i2, j2 = (i + 1) % ns, (j + 1) % nt
            faces.append((i * nt + j, i2 * nt + j, i2 * nt + j2, i * nt + j2))
    o = bpy.data.objects.new(name, mesh_from(name, verts, faces, [mat]))
    o.location = loc
    return link(o, parent)


# Head: a smooth ellipsoid. Local coordinates of the Head pivot.
HEAD_C = Vector((0, 0, 0.83))
HEAD_R = (1.02, 0.88, 0.86)


def head_point(az, el, out=0.0):
    """Point and outward normal on the head surface. az: 0 = front, +90 = +X side. el: elevation in degrees."""
    a, e = radians(az), radians(el)
    d = Vector((sin(a) * cos(e), -cos(a) * cos(e), sin(e)))
    p = Vector((HEAD_R[0] * d.x, HEAD_R[1] * d.y, HEAD_R[2] * d.z))
    n = Vector((d.x / HEAD_R[0], d.y / HEAD_R[1], d.z / HEAD_R[2])).normalized()
    return HEAD_C + p + n * out, n


def head_front_y(x, z):
    """Front surface of the head (y) at local (x, z)."""
    t = 1 - (x / HEAD_R[0]) ** 2 - ((z - HEAD_C.z) / HEAD_R[2]) ** 2
    return -HEAD_R[1] * sqrt(max(t, 0.0))


def face_rot(n):
    """Rotation that points a part's local Z axis along the normal n (to stick discs on the head)."""
    return n.to_track_quat('Z', 'X' if abs(n.y) > 0.9 else 'Y').to_euler()


# -------------------------------- model --------------------------------
root = pivot("Alien", (0, 0, 0))
body = pivot("Body", (0, 0, 0), root)

# Chubby one-piece body: a single pear shape, slightly wider at the bottom. The shorts are only a
# different material on its lower part, so there is no seam in the silhouette between torso and hips.
TORSO_Z = 0.88
SHORTS_TOP = 0.62


def pear(p):
    f = 1 - 0.10 * p[2]
    return (p[0] * f, p[1] * f, p[2])


torso = part(body, "Torso", (0.54, 0.46, 0.56), (0, 0, TORSO_Z), SHIRT, warp=pear)
torso.data.materials.append(BLUE)
for poly in torso.data.polygons:
    if poly.center.z + TORSO_Z < SHORTS_TOP:
        poly.material_index = 1
torus(body, "Collar", 1.0, 0.1, (0, 0, 1.15), BLUE, scale=(0.45, 0.385, 0.40))

head = pivot("Head", (0, 0, 1.2), body)
part(head, "Head", HEAD_R, tuple(HEAD_C), SKIN, seg=64, rings=32)

# A few small darker spots on one upper side: (azimuth, elevation, radius)
SPOTS = [(-70, 40, .10), (-95, 22, .13), (-58, 64, .08), (100, 30, .09)]
for i, (az, el, r) in enumerate(SPOTS):
    p, n = head_point(az, el, -0.03)
    part(head, f"Spot{i}", (r, r, 0.045), p, SKIN_DARK, rot=face_rot(n), seg=24, rings=12)

# Cheeks only: no nose or brows, to keep it less human
for sx, side in ((1, "L"), (-1, "R")):
    p, n = head_point(sx * 52, -40, -0.03)
    part(head, f"Cheek_{side}", (0.12, 0.09, 0.045), p, CHEEK, rot=face_rot(n), seg=24, rings=12)

# Simple video-game eyes: big glossy dark ovals with two highlights, slightly slanted.
# Each eye is a pivot: flatten Z to wink or blink.
EYE_X, EYE_Z = 0.38, 0.84
EYE_RADII = (0.24, 0.13, 0.34)
EYE_TILT = 0.15       # slant of the oval (radians)
EYE_TURN = 20         # degrees: turns each eye outward so it follows the head's curve (less of it hides inside)
for sx, side in ((1, "L"), (-1, "R")):
    eye = pivot(f"Eye_{side}", (sx * EYE_X, head_front_y(EYE_X, EYE_Z) + EYE_RADII[1] - 0.01, EYE_Z), head, rot=(0, 0, sx * EYE_TURN))
    ball = part(eye, f"EyeBall_{side}", EYE_RADII, (0, 0, 0), EYE, rot=(0, sx * EYE_TILT, 0))
    # Highlights: a bigger dot on top and a smaller one below, stacked on the eye's own axis (so they
    # follow its tilt) and identical on both eyes. Flat discs hugging the eye surface, not floating beads.
    for name, z, r in (("Shine1", 0.155, 0.06), ("Shine2", -0.17, 0.031)):
        y = -EYE_RADII[1] * sqrt(1 - (z / EYE_RADII[2]) ** 2)
        n = Vector((0.0, y / EYE_RADII[1] ** 2, z / EYE_RADII[2] ** 2)).normalized()
        part(ball, f"{name}_{side}", (r, r, 0.025), Vector((0.0, y, z)) - n * 0.012, SHINE, rot=face_rot(n), seg=24, rings=12)

# Antennas: pivot at the base, stalk and a round tip
for sx, side, tilt in ((1, "L", 16), (-1, "R", -24)):
    ant = pivot(f"Antenna_{side}", (sx * 0.30, 0, 1.56), head, rot=(0, tilt, 0))
    part(ant, f"Stalk_{side}", (0.04, 0.04, 0.42), (0, 0, 0.42), SKIN, seg=16, rings=12)
    part(ant, f"Tip_{side}", (0.115, 0.115, 0.115), (0, 0, 0.88), SKIN, seg=32, rings=16)

# Mouth: a single mesh with shape keys.
# Basis = closed friendly smile (the resting face), Smile = open smile, Surprise = round "o".
MOUTH_COLS, MOUTH_ROWS = 16, 6
MOUTH_Z = 0.38        # mouth height on the head


def shape_closed(u):
    w = 0.22
    lift = 0.06 * u * u
    return w, MOUTH_Z + lift + 0.016 * (1 - u * u), MOUTH_Z + lift - 0.016 * (1 - u * u)


def shape_smile(u):
    w = 0.30
    return w, MOUTH_Z + 0.04 - 0.01 * (1 - u * u), MOUTH_Z + 0.04 - 0.08 * (1 - u * u)


def shape_surprise(u):
    w = 0.075
    h = 0.06 * sqrt(max(0.0, 1 - u * u))
    return w, MOUTH_Z + 0.02 + h, MOUTH_Z + 0.02 - h


def mouth_coords(shape):
    pts = []
    for j in range(MOUTH_ROWS + 1):
        v = j / MOUTH_ROWS
        for i in range(MOUTH_COLS + 1):
            u = -1 + 2 * i / MOUTH_COLS
            w, top, bottom = shape(u)
            x, z = w * u, top * (1 - v) + bottom * v
            pts.append((x, head_front_y(x, z) - 0.012, z))
    return pts


C1 = MOUTH_COLS + 1
mouth_faces = [(j * C1 + i, (j + 1) * C1 + i, (j + 1) * C1 + i + 1, j * C1 + i + 1)
               for j in range(MOUTH_ROWS) for i in range(MOUTH_COLS)]
mouth_mesh = bpy.data.meshes.new("Mouth")
mouth_mesh.from_pydata(mouth_coords(shape_closed), [], mouth_faces)
mouth_mesh.update()
mouth_mesh.materials.append(MOUTH_IN)
mouth = link(bpy.data.objects.new("Mouth", mouth_mesh), head)
mouth.shape_key_add(name="Basis")
for key_name, shape in (("Smile", shape_smile), ("Surprise", shape_surprise)):
    sk = mouth.shape_key_add(name=key_name, from_mix=False)
    for v, co in zip(sk.data, mouth_coords(shape)):
        v.co = co

# Arms: shoulder pivot, round sleeve with blue cuff, arm, and a simple mitten hand with a thumb (wrist pivot)
for sx, side in ((1, "L"), (-1, "R")):
    shoulder = pivot(f"Shoulder_{side}", (sx * 0.49, 0, 1.08), body, rot=(0, -sx * 12, 0))
    part(shoulder, f"Sleeve_{side}", (0.15, 0.15, 0.20), (0, 0, -0.08), SHIRT, seg=32, rings=16)
    torus(shoulder, f"Cuff_{side}", 0.12, 0.03, (0, 0, -0.19), BLUE, seg=32, sides=10)
    part(shoulder, f"Arm_{side}", (0.10, 0.10, 0.30), (0, 0, -0.27), SKIN, seg=32, rings=16)
    wrist = pivot(f"Wrist_{side}", (0, 0, -0.55), shoulder)
    part(wrist, f"Hand_{side}", (0.115, 0.07, 0.15), (0, 0, -0.11), SKIN, seg=32, rings=16)
    inward = -sx
    part(wrist, f"Thumb_{side}", (0.045, 0.04, 0.08), (inward * 0.10, -0.01, -0.07), SKIN,
         rot=(0, -inward * 0.5, 0), seg=16, rings=8)

# Legs: hip pivot, leg and a simple foot
for sx, side in ((1, "L"), (-1, "R")):
    hip = pivot(f"Hip_{side}", (sx * 0.21, 0, 0.62), body)
    part(hip, f"Leg_{side}", (0.15, 0.15, 0.33), (0, 0, -0.27), SKIN, seg=32, rings=16)
    part(hip, f"Foot_{side}", (0.19, 0.28, 0.10), (0, -0.09, -0.52), SKIN, seg=32, rings=16)

# Minimal self-check: everything hangs from Alien (otherwise it would not move together)
assert all(o.parent is not None for o in root.children_recursive)

# ----------------------------- animations -----------------------------
# Each clip: (length in frames, [(target, property, [(frame, value), ...]), ...])
#   "rot":   degrees ADDED to the pivot's rest rotation
#   "scale": absolute scale
#   "val":   shape key value, 0 to 1 (targets "Mouth.Smile" and "Mouth.Surprise")
# Every clip starts and ends at the rest pose (frame 1 = rest).
ONE = (1, 1, 1)
ZERO = (0, 0, 0)

CLIPS = {
    "Idle": (60, [
        ("Body", "scale", [(1, ONE), (30, (1.012, 1.012, 0.985)), (60, ONE)]),
        ("Head", "rot", [(1, ZERO), (20, (2, -2, 1.5)), (40, (-2, 2, -1.5)), (60, ZERO)]),
        ("Antenna_L", "rot", [(1, ZERO), (25, (5, 6, 0)), (50, (-4, -4, 0)), (60, ZERO)]),
        ("Antenna_R", "rot", [(1, ZERO), (25, (-5, 6, 0)), (50, (4, -4, 0)), (60, ZERO)]),
        ("Eye_L", "scale", [(1, ONE), (38, ONE), (41, (1, 1, 0.1)), (44, ONE), (60, ONE)]),
        ("Eye_R", "scale", [(1, ONE), (38, ONE), (41, (1, 1, 0.1)), (44, ONE), (60, ONE)]),
    ]),
    "Jump": (40, [
        ("Body", "scale", [(1, ONE), (8, (1.08, 1.08, 0.86)), (14, (0.93, 0.93, 1.14)), (22, ONE),
                           (30, ONE), (34, (1.1, 1.1, 0.88)), (40, ONE)]),
        ("Shoulder_R", "rot", [(1, ZERO), (8, (0, 25, 0)), (14, (0, 115, 0)), (24, (0, 125, 0)), (34, (0, 30, 0)), (40, ZERO)]),
        ("Shoulder_L", "rot", [(1, ZERO), (8, (0, -25, 0)), (14, (0, -115, 0)), (24, (0, -125, 0)), (34, (0, -30, 0)), (40, ZERO)]),
        ("Hip_R", "rot", [(1, ZERO), (14, (8, 0, 0)), (22, (-42, 0, 0)), (30, (-15, 0, 0)), (34, ZERO), (40, ZERO)]),
        ("Hip_L", "rot", [(1, ZERO), (14, (8, 0, 0)), (22, (-42, 0, 0)), (30, (-15, 0, 0)), (34, ZERO), (40, ZERO)]),
        ("Antenna_L", "rot", [(1, ZERO), (14, (-14, 0, 0)), (22, (10, 0, 0)), (34, (-12, 0, 0)), (40, ZERO)]),
        ("Antenna_R", "rot", [(1, ZERO), (14, (-14, 0, 0)), (22, (10, 0, 0)), (34, (-12, 0, 0)), (40, ZERO)]),
        ("Mouth.Smile", "val", [(1, 0), (8, 1), (36, 1), (40, 0)]),
    ]),
    "Walk": (29, [   # in-place loop (first pose == last pose); legs and arms swing in opposition
        ("Hip_L", "rot", [(1, (-30, 0, 0)), (8, ZERO), (15, (30, 0, 0)), (22, ZERO), (29, (-30, 0, 0))]),
        ("Hip_R", "rot", [(1, (30, 0, 0)), (8, ZERO), (15, (-30, 0, 0)), (22, ZERO), (29, (30, 0, 0))]),
        ("Shoulder_L", "rot", [(1, (22, 0, 0)), (8, ZERO), (15, (-22, 0, 0)), (22, ZERO), (29, (22, 0, 0))]),
        ("Shoulder_R", "rot", [(1, (-22, 0, 0)), (8, ZERO), (15, (22, 0, 0)), (22, ZERO), (29, (-22, 0, 0))]),
        ("Body", "rot", [(1, (4, -3, 3)), (8, (4, 0, 0)), (15, (4, 3, -3)), (22, (4, 0, 0)), (29, (4, -3, 3))]),
        ("Body", "scale", [(1, (1, 1, 0.975)), (8, (1, 1, 1.015)), (15, (1, 1, 0.975)), (22, (1, 1, 1.015)), (29, (1, 1, 0.975))]),
        ("Head", "rot", [(1, (2, 0, 0)), (8, (-1, 0, 0)), (15, (2, 0, 0)), (22, (-1, 0, 0)), (29, (2, 0, 0))]),
        ("Antenna_L", "rot", [(1, (5, 0, 0)), (8, (-5, 0, 0)), (15, (5, 0, 0)), (22, (-5, 0, 0)), (29, (5, 0, 0))]),
        ("Antenna_R", "rot", [(1, (5, 0, 0)), (8, (-5, 0, 0)), (15, (5, 0, 0)), (22, (-5, 0, 0)), (29, (5, 0, 0))]),
    ]),
    "Wave": (72, [
        ("Shoulder_R", "rot", [(1, ZERO), (14, (0, 123, 0)), (56, (0, 123, 0)), (72, ZERO)]),
        ("Wrist_R", "rot", [(1, ZERO), (14, ZERO), (20, (0, 24, 0)), (26, (0, -24, 0)), (32, (0, 24, 0)),
                            (38, (0, -24, 0)), (44, (0, 24, 0)), (50, (0, -24, 0)), (56, ZERO), (72, ZERO)]),
        ("Head", "rot", [(1, ZERO), (14, (0, -6, 0)), (56, (0, -6, 0)), (72, ZERO)]),
        ("Antenna_L", "rot", [(1, ZERO), (20, (0, 8, 0)), (44, (0, -6, 0)), (72, ZERO)]),
        ("Mouth.Smile", "val", [(1, 0), (10, 1), (60, 1), (72, 0)]),
    ]),
    "Wink": (30, [
        ("Eye_L", "scale", [(1, ONE), (7, (1, 1, 0.1)), (19, (1, 1, 0.1)), (25, ONE), (30, ONE)]),
        ("Head", "rot", [(1, ZERO), (7, (0, 5, 0)), (22, (0, 5, 0)), (30, ZERO)]),
        ("Mouth.Smile", "val", [(1, 0), (7, 0.8), (22, 0.8), (30, 0)]),
    ]),
    "Smile": (40, [
        ("Mouth.Smile", "val", [(1, 0), (10, 1), (30, 1), (40, 0)]),
        ("Eye_L", "scale", [(1, ONE), (10, (1, 1, 0.85)), (30, (1, 1, 0.85)), (40, ONE)]),
        ("Eye_R", "scale", [(1, ONE), (10, (1, 1, 0.85)), (30, (1, 1, 0.85)), (40, ONE)]),
        ("Head", "rot", [(1, ZERO), (10, (-4, 0, 0)), (30, (-4, 0, 0)), (40, ZERO)]),
    ]),
    "CrazyFace": (40, [
        ("Eye_L", "scale", [(1, ONE), (8, (1.25, 1.25, 1.25)), (32, (1.25, 1.25, 1.25)), (40, ONE)]),
        ("Eye_R", "scale", [(1, ONE), (8, (0.75, 0.75, 0.75)), (32, (0.75, 0.75, 0.75)), (40, ONE)]),
        ("Mouth.Surprise", "val", [(1, 0), (8, 1), (32, 1), (40, 0)]),
        ("Head", "rot", [(1, ZERO), (8, (0, 10, 4)), (20, (0, -10, -4)), (32, (0, 10, 4)), (40, ZERO)]),
        ("Antenna_L", "rot", [(1, ZERO), (8, (0, 25, 0)), (20, (0, -20, 0)), (32, (0, 25, 0)), (40, ZERO)]),
        ("Antenna_R", "rot", [(1, ZERO), (8, (0, -25, 0)), (20, (0, 20, 0)), (32, (0, -25, 0)), (40, ZERO)]),
    ]),
}

OBJ = {o.name: o for o in root.children_recursive}
OBJ["Alien"] = root
REST = {n: tuple(o.rotation_euler) for n, o in OBJ.items()}
PATH = {"rot": "rotation_euler", "scale": "scale", "val": "value"}
REST_VALUE = {"rot": ZERO, "scale": ONE, "val": 0.0}


def target_of(name):
    """Returns (the thing to animate, the datablock that owns its animation)."""
    if name.startswith("Mouth."):
        keys = mouth.data.shape_keys
        return keys.key_blocks[name[len("Mouth."):]], keys
    return OBJ[name], OBJ[name]


def set_value(t, name, prop, v):
    if prop == "rot":
        t.rotation_euler = [r + radians(a) for r, a in zip(REST[name], v)]
    elif prop == "scale":
        t.scale = v
    else:
        t.value = v


def create_animations():
    pending = []
    for clip, (length, tracks) in CLIPS.items():
        actions = {}
        for name, prop, keys in tracks:
            t, owner = target_of(name)
            if owner.as_pointer() not in actions:
                ad = owner.animation_data_create()
                act = bpy.data.actions.new(f"{clip}__{owner.name}")
                act.use_fake_user = True
                ad.action = act
                actions[owner.as_pointer()] = (owner, act)
            for frame, value in keys:
                set_value(t, name, prop, value)
                t.keyframe_insert(PATH[prop], frame=frame)
            set_value(t, name, prop, REST_VALUE[prop])
        for owner, act in actions.values():
            owner.animation_data.action = None
            pending.append((clip, owner, act))
    # One NLA track per clip: the glTF exporter uses the track name as the animation name
    for clip, owner, act in pending:
        track = owner.animation_data.nla_tracks.new()
        track.name = clip
        strip = track.strips.new(clip, 1, act)
        slots = getattr(act, "slots", None)
        if slots and len(slots) and hasattr(strip, "action_slot"):
            strip.action_slot = slots[0]
        track.mute = PREVIEW is not None and clip != PREVIEW
    scene.render.fps = 30
    scene.frame_start = 1
    scene.frame_end = CLIPS[PREVIEW][0] if PREVIEW in CLIPS else 60
    scene.frame_set(1)


try:
    create_animations()
except Exception:
    print("=== The model was created, but the animations failed: ===")
    traceback.print_exc()

# ------------------- preview scene (not exported) -------------------
floor = bpy.data.objects.new("Floor", mesh_from("Floor", [(-9, -9, 0), (9, -9, 0), (9, 9, 0), (-9, 9, 0)],
                                                [(0, 1, 2, 3)], [GRASS], recalc=False))
link(floor)

focus = bpy.data.objects.new("Focus", None)
focus.location = (0, 0, 1.9)
link(focus)


def aim(o):
    c = o.constraints.new('TRACK_TO')
    c.target = focus
    c.track_axis = 'TRACK_NEGATIVE_Z'
    c.up_axis = 'UP_Y'


cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
cam.location = (0, -11.5, 2.4)
cam.data.lens = 50
link(cam)
aim(cam)
scene.camera = cam

for name, kind, pos, energy in (("Sun", 'SUN', (0, -6, 8), 3.0),
                                ("Fill", 'AREA', (-5, -5, 4), 200),
                                ("Rim", 'POINT', (0, 4, 5), 150)):
    light = bpy.data.lights.new(name, kind)
    light.energy = energy
    o = bpy.data.objects.new(name, light)
    o.location = pos
    link(o)
    aim(o)

try:
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*hex_color("#CFE2F4"), 1)
    bg.inputs[1].default_value = 0.9
except Exception:
    pass

# Material preview with scene lights, seen from the camera (only works when run from Blender's editor)
try:
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            view = area.spaces[0]
            view.shading.type = 'MATERIAL'
            view.shading.use_scene_lights = True
            view.shading.use_scene_world = True
            view.region_3d.view_perspective = 'CAMERA'
except Exception:
    pass

# Character triangle count (also visible in Overlays > Statistics)
tris = 0
for o in root.children_recursive:
    if o.type == 'MESH':
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
root["triangles"] = tris
print(f"Alien ready: {tris} triangles with RES = {RES}")


# ------------------------------ export GLB ------------------------------
def check_glb(path):
    """Reads the exported GLB and prints its animations, so a missing clip or mouth track is obvious."""
    with open(path, "rb") as f:
        f.read(12)
        size, _ = struct.unpack("<II", f.read(8))
        gltf = json.loads(f.read(size))
    nodes = gltf.get("nodes", [])
    print("GLB check: %d bytes, %d meshes, %d nodes" % (os.path.getsize(path), len(gltf.get("meshes", [])), len(nodes)))
    names = {a.get("name") for a in gltf.get("animations", [])}
    for clip in CLIPS:
        if clip not in names:
            print("  MISSING animation:", clip)
    for a in gltf.get("animations", []):
        paths = sorted({c["target"]["path"] for c in a["channels"]})
        print("  clip %-10s channels %3d  paths %s" % (a.get("name"), len(a["channels"]), paths))
    if not any("weights" in {c["target"]["path"] for c in a["channels"]} for a in gltf.get("animations", [])):
        print("  WARNING: no morph target (weights) animation exported: the mouth will not animate in Three.js")


def export_glb():
    text = bpy.data.texts.get("alien.py")  # GUI run: __file__ is not the real path there
    if text and text.filepath:
        base = os.path.dirname(bpy.path.abspath(text.filepath))
    else:  # headless: blender -b -P alien.py
        base = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base, "alien.glb" if RES == 1.0 else "alien_res%s.glb" % RES)
    for o in bpy.data.objects:
        o.select_set(False)
    for o in [root] + list(root.children_recursive):
        o.select_set(True)
    bpy.context.view_layer.objects.active = root
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_animations=True)
    try:
        bpy.ops.export_scene.gltf(export_animation_mode='NLA_TRACKS', **kw)
    except TypeError:  # older Blender
        bpy.ops.export_scene.gltf(export_nla_strips=True, **kw)
    print("GLB exported to:", path)
    check_glb(path)


if EXPORT_GLB:
    export_glb()
