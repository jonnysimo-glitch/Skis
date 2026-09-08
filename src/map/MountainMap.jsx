/**
 * The map. All of it.
 *
 * Terrain, satellite drape, the piste network, the route, five tiers of label
 * and every gesture, drawn to one canvas on the GPU. There is no other map:
 * MapLibre and its basemap were the original plan and are not a dependency any
 * more, which is why this file is called what it is called. It was
 * `FallbackTerrain.jsx` — the no-key fallback — and its header described a
 * schematic built from the altitudes on the resort graph's own nodes. Neither
 * has been true since the terrain started coming from a real elevation grid.
 *
 * What is here now:
 *
 *   the ground     a mesh built in field.js from the resort's DEM, drawn as a
 *                  block with a rim so it reads as an object on a table
 *   the picture    MapTiler satellite composited once and draped over that
 *                  mesh. Without a key the ground is shaded from its own
 *                  height instead, which is a complete map and says so
 *   the lines      the whole piste network, washed out, with the route over
 *                  it in the brand casing, both depth tested against the mesh
 *   the writing    valley bases, mountain places, huts, hut names and run
 *                  names, each ranked and faded, never popped
 *   the camera     two of them. `fit` frames a subject — the resort, or the
 *                  route — and `navWindow` places you on the glass at a fixed
 *                  ground scale while navigating. See NAV_ACROSS
 *
 * It is offline by construction once the drape is cached: there is nothing
 * else to fetch.
 *
 * It is also five thousand lines, which is too many. The seams are already
 * there — field.js owns the mesh, gl.js owns the GPU path, glmatrix.js the
 * projection — and the labelling and the gesture handling are the two blocks
 * that would come out next. Not today: every one of those moves is a chance
 * to break something the checks would not catch.
 */
import { useEffect, useRef } from "react";
import { NODES as ACTIVE_NODES, PLACES as ACTIVE_PLACES, TERRAIN as ACTIVE_TERRAIN, activeProjector } from "../active-resort.js";
import { shortName } from "../lib/places.js";
import {
  buildField, slabFor, toUnit, GRID, VERT_EXAGGERATION,
  SKIRT_LIT, SKIRT_SHADE, BASE_COLOUR, STRATA,
  SKY_TOP, SKY_MID, SKY_HORIZON,
} from "./field.js";
import { glMatrix } from "./glmatrix.js";
import { createTerrainGL } from "./gl.js";
import { PISTE_COLOUR, PISTE_TINT, LIFT_TINT, LINK_COLOUR, LINK_TINT } from "../lib/geo.js";
import { ACCENT, ACCENT_LINE, INK } from "../lib/brand.js";

/** The casing, faded, for legs already skied. */
const DIM_ACCENT = "rgba(42, 196, 238, 0.3)";


/**
 * Pitch limits.
 *
 * Past roughly 80 degrees the camera is level with the slope and then below
 * it, and you end up looking at the underside of the terrain — which is not a
 * view of anything. MapLibre caps its own pitch for the same reason; this is
 * the equivalent for the schematic view.
 */
/**
 * How fast a flick bleeds off, as a time constant in milliseconds.
 *
 * This was 0.92 per frame, which is half a second at 60Hz and a quarter of one
 * on a 120Hz phone — the same flick, a different map, decided by hardware
 * nobody chose for its scrolling. Same curve as before at 60Hz, measured
 * against the clock so it is that curve everywhere.
 */
const GLIDE_MS = 130;

/**
 * The fastest a released flick may throw the map, in pixels per millisecond.
 *
 * There was no cap, because there did not need to be one: velocity used to be
 * measured per pointermove event, which on a device firing two moves a frame
 * came out at half the real speed. Measuring it against the clock fixed that
 * and made every flick roughly twice the throw it had been — correct, and
 * reported as "it moves too fast", which it was.
 *
 * So the ceiling is what a flick is allowed to be worth rather than what a
 * thumb can physically do, and the decay above is shorter than the 190ms that
 * matched the old per-frame constant. Two and a bit pixels a millisecond is
 * about a third of a screen of travel after release, which is a map that
 * carries on rather than one that is thrown.
 */
const GLIDE_MAX = 2.2;

/**
 * The two speeds that bound a fling, both in pixels per millisecond.
 *
 * Written as what they used to be at 60Hz, so the feel is unchanged and the
 * arithmetic is checkable: 0.4 and 0.15 pixels in a 16.7ms frame.
 */
const FLING_MIN = 0.4 / 16.7;   // slower than this on release is not a flick
const GLIDE_STOP = 0.15 / 16.7; // slower than this is a stop

/**
 * Depth-buffer resolution, as a fraction of the canvas in CSS pixels.
 *
 * Was a third, which put the point where a line disappears over a ridge on a
 * three pixel grid — and a quantised cut is not a still image, it is a line
 * whose end jumps three pixels at a time while you turn the mountain. Against
 * a moving silhouette that reads as the line chattering rather than as terrain
 * passing in front of it, which is a worse artefact than the one the depth
 * test removed.
 *
 * A half rather than the whole because the silhouette it is representing is
 * itself soft to about two pixels: the terrain is composited through a blur.
 * A depth buffer sharper than the edge it describes is precision with nothing
 * to be precise about, and it is four times the readback for it. Measured
 * anyway — a full-resolution buffer came out the same, so this is chosen on
 * what it is worth rather than on what it costs.
 */
const DEPTH_SCALE = 1 / 2;
/**
 * And a coarser one for the GPU, because the cost there is the read-back.
 *
 * Rasterising the depth pass is free on a GPU; getting it back into JavaScript
 * is not — `readPixels` blocks until the driver has finished, and at half
 * scale that is 585KB a frame and eleven to nineteen milliseconds measured.
 * A third is a quarter of the pixels. The test it feeds is a coarse "is this
 * point behind the mountain", already softened by several frames of hysteresis
 * before anything disappears, so the resolution was never doing much work.
 */
const GL_DEPTH_SCALE = 1 / 3;

/**
 * How many terrain quads across one depth polygon covers.
 *
 * One, after trying two. Coarsening is *safe* — every approximation it makes
 * errs toward hiding less, never more — but it is not free in the way it
 * looked. A block two quads across is 334 metres of ground written at a single
 * depth, so every ridge under-occludes by up to that, and the same view went
 * from hiding 30 runs of 134 to hiding 19. Ten milliseconds a frame for a
 * third of the thing the pass exists to do is the wrong way round.
 *
 * Kept as a constant rather than folded away because the machinery for it is
 * the same machinery the slab's faces use, and because the next person to look
 * at this for speed should be able to see the knob and the number it costs.
 */
const DEPTH_STEP = 1;

/**
 * How big a photographed quad has to be before it is painted from the imagery
 * at more than one colour.
 *
 * One number, and it took two goes to get there. A quad at the opening framing
 * is about five pixels of screen standing for 167 metres of ground, so one
 * flat colour throws away most of what the photograph knows — but painting
 * every one of them at three pixels a cell is 26,000 cells and doubles the
 * frame. So the first version used a coarse pass while the camera moved and a
 * fine one when it stopped.
 *
 * That is worse, and it is worse in a way measuring does not show: the switch
 * is visible. The ground goes soft the instant you touch it and sharpens when
 * you let go, which reads as the map failing to load rather than as a
 * considered trade. A map that is always the same is better than one that is
 * sometimes sharper.
 *
 * Four is the level that can be afforded all the time. Measured against a
 * frame with no subdivision at all in the same run: 6,600 cells costs 10ms,
 * 16,000 costs 18ms, and 26,000 costs 39. Four puts 89% of the visible mesh on
 * the photograph for the middle of those.
 *
 * The ceiling stops a quad that fills the screen at maximum zoom asking for a
 * thousand cells on its own.
 *
 * It was four, on the reasoning that four by four turns a block into a picture
 * and past that the imagery is the limit. That is true at the framing the app
 * opens on and false everywhere else, because a quad is a fixed piece of
 * ground: at zoom eight a cell is sixty screen pixels, four by four leaves
 * fifteen-pixel squares of one colour, and the photograph is back to being
 * blocks exactly where someone is looking hardest at the ground.
 *
 * Twenty-four now, and the total work is bounded by the viewport rather than
 * by the ceiling: cells cost the visible area over SUBDIVIDE_PX squared,
 * which on a phone is about twenty thousand however far in you are. That was
 * always the intent and it only became true once quads off the sides of the
 * screen stopped being drawn at all.
 */
/**
 * Progressive refinement.
 *
 * The mesh is as fine as the measured ground under it. What that costs is a
 * frame time while the camera is turning, and that is the only thing it costs:
 * a still mountain can be drawn once, properly, at whatever the terrain data
 * actually holds. So a moving one takes every MESH_STRIDE'th vertex and the
 * full mesh goes down a beat after the finger comes off.
 *
 * The same field either way, so `sample`, `hi` and `lo` — and therefore the
 * framing — are identical between the two passes and refining cannot move the
 * camera under the user.
 */
const MESH_STRIDE = 2;
/** How still the camera has to be before the fine pass is worth starting. */
const MESH_SETTLE_MS = 140;

/**
 * The zoom at which the mountain starts naming things rather than marking
 * them: the runs along their own line, and the huts under their markers.
 *
 * One number for both because they are the same decision. Far out, a name is
 * a word floating over ground too small to place it on; close enough to read
 * the ground, a marker with no word under it is a question rather than an
 * answer.
 */
const NAME_ZOOM = 1.5;
/**
 * And when the places on the mountain are drawn at all.
 *
 * A tier per zoom, stated rather than emerging from a budget curve, because
 * "when does this appear" is the question that decides whether a map reads as
 * deliberate or as busy.
 *
 *   below NAME_ZOOM   the bases, the peaks, the passes. Where you are, where
 *                     the mountain's corners are, and nothing else. At this
 *                     height a restaurant is a dot over ground too small to
 *                     place it on, and reading its name tells you it is
 *                     somewhere in this valley, which you knew.
 *   HUT_ZOOM          the runs get their names and the places to eat get
 *                     their markers, together. Reported exactly this way: the
 *                     restaurants should come in at the same level as the
 *                     slopes themselves. Before this they had no gate at all
 *                     and five of them were on screen at the whole-resort
 *                     view, competing with the four village names.
 *   HUT_NAME_ZOOM     and then the names under those markers, a step later.
 *                     A marker says there is lunch here; the word costs three
 *                     times the room and is only worth it once you are close
 *                     enough to be choosing between two of them.
 */
/**
 * How much of a label survives being behind the mountain.
 *
 * Only bases get to be drawn there at all — everything else fades out — and
 * this is what they are drawn at. Low enough to read as "through the
 * mountain" rather than "on it", high enough to still be legible over snow.
 */
const BEHIND_DIM = 0.45;
const HUT_ZOOM = NAME_ZOOM;
const HUT_NAME_ZOOM = 2.1;

const SUBDIVIDE_PX = 4;
const SUBDIVIDE_MAX = 24;

/** How far a texture cell reaches past its own edge, as a fraction of a cell. */
const OVERLAP = 0.06;


/**
 * How long a mountain place takes to appear or disappear, in milliseconds.
 *
 * Long enough that the eye reads it as something arriving rather than as a
 * glitch, short enough that it is never in the way of an answer. A marker that
 * flickers across a silhouette for two frames now changes by a tenth and comes
 * straight back, which is invisible.
 *
 * Every number in this block was raised together, and the reason is one
 * sentence of feedback after a lot of individually correct tuning: there is
 * still too much moving around. Each of these had been set to the smallest
 * value that fixed the fault in front of it, and the sum of six such values is
 * a map that is technically never popping and never quite still either.
 *
 * So: fades slower in and slower out, incumbency held for two and a half
 * seconds rather than one and a half, the budget's dead band widened, patience
 * about being behind a ridge nearly doubled, and two fewer labels in each of
 * the busiest tiers. Nothing here is a new mechanism. It is the same machinery
 * asked to be less eager, which is what "be more conservative" means when the
 * thing being conserved is the reader's attention.
 */
const PLACE_FADE_MS = 420;
/**
 * Longer on the way out than on the way in.
 *
 * Not symmetry for its own sake. Arriving is information, so it should be
 * quick; leaving is usually the map changing its mind, and a slow exit means a
 * place that goes and comes straight back never visibly went. Together with
 * the hold below, a small nudge of the camera cannot take anything off the
 * mountain.
 */
const PLACE_FADE_OUT_MS = 900;
/**
 * How long a place keeps its place after it stops qualifying.
 *
 * "There should be a range that holds them", which is exactly right: what was
 * on the mountain a moment ago should still be there after a small move. The
 * old memory was one frame — `heldPlaces` was rebuilt from what got drawn — so
 * a marker that grazed a silhouette for a single frame lost its incumbency,
 * a newcomer took the slot, and the two then swapped back and forth.
 */
const PLACE_HOLD_MS = 2600;
/**
 * How far the budget may stretch to keep incumbents, before it starts evicting.
 *
 * The budget is a continuous function of zoom rounded to a whole number, so a
 * hair of zoom either side of a boundary adds and removes a place. The slack
 * lets what is already showing stay showing while the budget passes under it,
 * and only trims once the gap is real.
 */
const PLACE_BUDGET_SLACK = 1.6;

/**
 * How long a place must be behind the mountain before it goes.
 *
 * In milliseconds, which is what the eye is judging. This was four frames:
 * 66ms on a phone drawing smoothly and half a second on one that is not, so
 * the same code was patient on a slow device and twitchy on a fast one. Half a
 * second either way now. What it absorbs is a marker grazing a silhouette as
 * the camera turns, which is a fact about the ridge rather than about the
 * restaurant.
 */
const OCCLUSION_HOLD_MS = 520;
/*
 * A piste name waits longer than a place marker before it accepts being hidden.
 *
 * A marker is a point: behind the ridge or not. A run name sits on a line
 * hundreds of metres long, and the one vertex the visibility test samples
 * crosses a silhouette far more often than the piste actually disappears. The
 * same 520 ms took names off the mountain while most of the run they belong to
 * was still in plain sight.
 */
const RUN_NAME_OCCLUSION_MS = 1800;
/**
 * How many pixels of overlap a label already on the mountain will tolerate
 * before it gives up its spot, where a newcomer would tolerate none.
 */
const INCUMBENT_SLACK = 7;
/**
 * How finely a piste is walked looking for somewhere to write its name, in
 * pixels. Fine enough to find a gap between two other labels, coarse enough
 * that a piste crossing the whole screen costs a few dozen tries.
 */
const LABEL_STEP_PX = 24;
/**
 * How far outside the frame a label is still worth keeping, in pixels.
 *
 * Wide enough that a label has room to fade out completely after it has left
 * the screen, so nothing is ever removed at full strength and nothing arrives
 * at it. Everything drawn in this band is off canvas and costs a measure and a
 * discarded fill.
 */
const EDGE_BAND = 220;

/**
 * How far the map may slide before the terrain has to be drawn again rather
 * than moved, in CSS pixels.
 *
 * The cached picture is the size of the canvas, so sliding it exposes an
 * unpainted strip at the trailing edge — ground that was off screen when it
 * was drawn. In practice the mountain is centred and the pan is bounded, so
 * that strip is nearly always sky; this is the wall for when it is not.
 *
 * A redraw every eighty pixels of drag, instead of one every frame, is the
 * whole saving — and eighty rather than a hundred and forty because the margin
 * below has to match it, and the margin is rasterised area on every redraw.
 * Measured: at 140 a turn costs 113ms and a drag 34; at 80, 100 and 35; at 50
 * the drag's worst frame jumps to 111 because redraws start landing inside the
 * gesture. Eighty is where both are cheap.
 */
const PAN_REUSE_MAX = 80;

/**
 * How far past the canvas the terrain is drawn, in CSS pixels.
 *
 * The reason the cached picture can be slid at all without lying. Sliding an
 * image the size of the canvas leaves an unpainted strip at the trailing edge
 * — ground that was off screen when it was drawn — and "the mountain is
 * usually nowhere near the edge" is not a property, it is a hope. Fling the
 * map into a corner and the sliver still on screen is exactly what that strip
 * eats.
 *
 * It showed as a check that passed at a reuse limit of 140, failed at 60 and
 * passed again at 32: not a magnitude at all, but where in the slide the
 * screenshot happened to land. A tolerance that is really a coin toss is worse
 * than no tolerance.
 *
 * Drawing a margin of exactly the reuse limit removes it by construction —
 * anything a slide can expose was already painted — and costs one extra band
 * of rasterising on the redraws, not on the frames in between.
 */
const TERRAIN_MARGIN = 80;
/**
 * How far past the drawn area a quad may reach and still be worth drawing.
 *
 * The margin, plus slack for a quad that straddles the boundary: only quads
 * with all four corners outside are dropped, and a big one seen edge-on can
 * have all four corners past the line while its middle is still in shot.
 */
const CULL_PAD = TERRAIN_MARGIN + 240;

/**
 * How many mountain places to show, as `count = base * zoom ** power`.
 *
 * Five at the framing the app opens on, ten by the time a valley fills the
 * screen, and all of them once you are looking at one bowl.
 *
 * The power used to be 1.7, on the argument that twice as close is four times
 * the room. That argument is wrong, and it is worth writing down why: what
 * grows with zoom is the room per METRE of mountain, not the room on the
 * screen. The screen is the same phone either way. What actually changes is
 * that fewer places are in frame at all, so a budget that barely moves still
 * ends up showing every one of them close in — while at the whole-resort view
 * it holds the number down to what a person can read.
 *
 * At 1.7 it did the opposite. Kronplatz put eighteen restaurants and ten of
 * their names on one phone screen showing the entire massif, twenty-eight of
 * the thirty-seven things written on the mountain, and the stated intent two
 * paragraphs up said ten.
 */
const HUT_BASE_COUNT = 4;
const HUT_ZOOM_POWER = 1.0;

/**
 * The same, for the names of the places on the mountain.
 *
 * This tier had no budget at all until it was measured: every named node
 * competed at every zoom and the collision race decided the rest, which is
 * both why the mountain was buried in names and why they moved about as you
 * zoomed. Eight at the framing the app opens on, about fifteen once you are
 * looking at one bowl.
 */
const PLACE_BASE_COUNT = 6;
const PLACE_ZOOM_POWER = 0.35;

/**
 * And for the names written along the pistes.
 *
 * Nothing at all until you are close enough for the word to sit on the run it
 * belongs to — see NAME_ZOOM — then a handful, then most of them. Ranked by
 * how long the piste is, so the runs that define the mountain get their names
 * first and a fifty metre link never takes the place of one.
 */
const RUN_NAME_BASE_COUNT = 4;
const RUN_NAME_ZOOM_POWER = 0.7;

/**
 * How far the ground-holding correction is allowed to move the map in one
 * frame, in pixels.
 *
 * A drag holds the point it grabbed under the thumb, which needs that point to
 * still be somewhere sensible on screen. Pushed to the edge of the overscroll,
 * or swung round behind the camera by a rotate that started mid-drag, its
 * projection runs off to a large number and the correction would throw the
 * whole map across the screen between two frames. Past this it is not a
 * correction any more and the plain screen-space delta is the safer answer.
 */
const GRAB_MAX_JUMP = 120;

/**
 * How far in front of the ground a line has to be to count as visible, as a
 * fraction of the resort's own extent.
 *
 * Small, because the buffer does the real work: each quad stores the depth of
 * its FURTHEST corner rather than its average, so a line sampled anywhere on
 * that quad is in front of what the quad wrote and cannot hide itself. Getting
 * that wrong is the whole difficulty of a depth test against a coarse mesh —
 * a quad here is 167 metres of ground drawn flat, so on a steep face the
 * surface a line is sampled from sits up to a hundred metres off the plane
 * that represents it, times the 2.4 vertical exaggeration on top. A bias big
 * enough to absorb that is big enough to show runs through a ridge, which is
 * the bug this is fixing. Storing the far corner removes the problem instead
 * of paying for it: the cost is that a ridge under-occludes by at most its own
 * last quad, which nobody can see.
 *
 * What is left for this to cover is the buffer's resolution — a line reads the
 * depth pixel its three-CSS-pixel block centres on, which on a surface
 * receding at a grazing angle is not quite the depth under the line — and it
 * is a fraction rather than a number of metres so a small resort is not
 * measured with a big resort's ruler.
 *
 * Worth keeping small, and measured rather than guessed. Every metre of it is
 * a metre of mountain that stops hiding things: at 0.005 the same view
 * occluded 23 runs of 134 where 0.002 occludes 34, for no gain — the outward
 * rounding was already covering what the extra slack was there for.
 */
const DEPTH_BIAS_FRAC = 0.002;
/**
 * And more of it on the GPU, because the GPU's depth is honest.
 *
 * The 2D depth pass rounds every quad's depth outward and stores its furthest
 * corner, so a marker standing on the ground is in front of what its own quad
 * wrote by a whole quad's depth. That conservatism is doing most of the work
 * above; the bias only had to cover the buffer's resolution.
 *
 * A z-buffer has none of it. Depth is interpolated per pixel and a marker
 * placed on the surface sits exactly on the boundary, so which side of it the
 * comparison lands on is arithmetic noise — and the noise flickers frame to
 * frame as the camera moves. Measured on a slow turn: eighteen appearances and
 * disappearances over forty frames against four, and a marker on the ground in
 * front of you counted as behind the mountain.
 *
 * Eight thousandths is a couple of the depth texture's own 1/255 steps plus
 * room for the interpolation, and it costs what the comment above says it
 * costs: a ridge under-occludes by a sliver of its own far side.
 */
const GL_DEPTH_BIAS_FRAC = 0.008;

/**
 * The 256 greys the depth buffer is written in, built once.
 *
 * Eight bits, and a lookup rather than a template string, both for the same
 * reason: the depth pass is three and a half thousand fills a frame, and at
 * that count what it costs is not the pixels, it is the per-quad work. A
 * quarter-resolution buffer measured the same as a third-resolution one, which
 * is what said so. Building `rgb(...)` per quad allocates a string and makes
 * the canvas parse a colour, both of which the array removes.
 *
 * Eight bits is enough only because the value is rounded AWAY from the camera:
 * see `far` below. Rounding to nearest would put the stored surface up to half
 * a step in front of where it is, and a line on that surface behind it.
 */
const DEPTH_GREYS = Array.from({ length: 256 }, (_, i) => `rgb(${i},0,0)`);

/**
 * How much of that blur survives once the camera is close.
 *
 * The blur is in screen pixels, so at the framing the map opens on it dissolves
 * the quads and reads as smooth terrain. Pushed right in — which the zoom
 * ceiling now allows — the same 2.6 pixels are smearing a facet that fills half
 * the screen, and the mountain looks like frosted glass rather than snow. It
 * eases off with the zoom instead, so far is smooth and near is crisp.
 */
/*
 * A finger twist turns the map one to one, at every zoom.
 *
 * There was a `rotateRate(zoom)` here that damped the turn to half by zoom
 * seven, and its own comment said what it was for: absorbing the swing left
 * over when the camera re-fits the subject mid-turn. That swing is gone —
 * `rotateAbout` now solves the camera from the view as it stands rather than
 * from the last drawn frame, and the ground under the fingers holds to within
 * a pixel at zoom 16 — so the damping was correcting for nothing and cost
 * something real: a forty degree twist came out as twelve, and turning right
 * round took four separate gestures.
 *
 * Diagnosis worth keeping: damping a gesture is what you reach for when the
 * map moves more than the hand asked for, and it never fixes that, because
 * the extra movement is not proportional to the gesture. It only makes the
 * part that was working worse.
 */

/**
 * And how much of a two finger drag becomes pitch, by zoom.
 *
 * The same argument as the bearing above, for the same reason: the refit
 * multiplies a change of camera attitude, so the pitch that feels right with
 * the whole mountain in frame throws the subject around when you are close.
 *
 * The base rate is lower than the 0.5 degrees per pixel this was using, which
 * came from MapLibre. That number is right for MapLibre's 0 to 60 range; here
 * the range runs to 84 and the terrain is vertically exaggerated on top of it,
 * so the same pixel bought half as much again of a bigger travel. A hundred
 * and fifty pixels — a comfortable two finger drag on a phone — went almost
 * the whole way from flat to nearly ground level, which is the "it overdoes
 * it" everyone means when they say the tilt is twitchy. At 0.35 that drag is
 * half the range, so getting somewhere specific takes a movement rather than a
 * flinch.
 */
const PITCH_RATE = 0.35;
const pitchRate = (zoom) => PITCH_RATE * Math.max(0.45, Math.min(1, 1 / (1 + 0.09 * (zoom - 1))));

/**
 * How fast the zoom eases toward what a scroll or a button asked for, as a
 * time constant in milliseconds rather than a fraction per frame.
 *
 * A fraction per frame is a different speed on every device. `zoom += gap *
 * 0.14` is a 110ms ease at 60Hz and a 55ms one on a 120Hz iPhone, which is
 * most of them now — so the animation this was tuned for is not the animation
 * anyone with a recent phone was getting. Same curve, measured against the
 * clock, so it is the same everywhere.
 */
const ZOOM_EASE_MS = 110;

/*
 * More blur the bigger a facet is on screen, which is not the same as zoom.
 *
 * The first version of this scaled with zoom, on the right reasoning: a quad
 * is a fixed piece of ground, so getting closer makes it bigger and the
 * softening has to grow with it or the mountain breaks into visible tiles
 * exactly when a skier is looking at it hardest.
 *
 * Zoom is only one of the things that decides how big a facet is, though, and
 * it turned out to be the smaller one. Focal length is solved per frame from
 * the framing, and reframing the camera on the resort rather than on the
 * padded mesh around it made every cell half again as wide at zoom 1 with the
 * zoom untouched — so the blur stayed where it was and the facets came back.
 * Latemar is a third of the scale of Kronplatz at the same zoom, for the same
 * reason. Measure the facet instead of guessing at it from one of its inputs.
 *
 * And blur the flat patch, not the cell. Under the satellite drape a cell is
 * subdivided into as many as SUBDIVIDE_MAX squares of real photograph, so the
 * biggest area of one flat colour is a fraction of the cell and blurring the
 * whole cell would be throwing the imagery away to fix a seam that is not
 * there. Bare terrain has no subdivision and the flat patch is the whole cell.
 */
/** One mesh cell, in CSS pixels, at the middle of the scene. */
const cellPx = (f) => f / (GRID * 1.45);
/**
 * The largest area of one flat colour on the surface, in CSS pixels.
 *
 * `step` is the mesh stride: while the camera is moving the surface is drawn
 * on every second vertex, so a patch is twice as wide and needs twice the
 * softening. Getting this wrong is visible as the mountain sharpening and
 * un-sharpening as you turn it.
 */
const patchPx = (f, skinned, step = 1) => {
  const cell = cellPx(f) * step;
  if (!skinned) return cell;
  const n = Math.max(1, Math.min(SUBDIVIDE_MAX, Math.round(cell / SUBDIVIDE_PX)));
  return cell / n;
};
/**
 * Half a patch of blur dissolves the step between two patches without
 * softening anything larger. The floor is what the old constant was worth at
 * rest, so nothing got sharper; the ceiling keeps a mountain that has been
 * zoomed into to its own contour lines from going out of focus.
 */
const BLUR_PER_PATCH = 0.32;
const BLUR_MIN = 1.4;
const BLUR_MAX = 4;
const blurFor = (f, skinned, step = 1) =>
  Math.max(BLUR_MIN, Math.min(BLUR_MAX, patchPx(f, skinned, step) * BLUR_PER_PATCH));

/**
 * Pitch limits. 0 is straight down, which is as far as the camera goes: there
 * is no under the map. The ceiling matches MapLibre's `maxPitch` so tilting
 * feels the same whichever layer is currently drawing, since they swap
 * underneath the user without warning.
 */
const MIN_PITCH = 0;
// Measured from straight down, so a bigger number is a lower camera. 75 stopped
// well short of standing on the slope looking along it, which is the view that
// tells you what a run actually pitches like.
const MAX_PITCH = 84;

/**
 * The view you start on and the view the reset button returns to.
 *
 * One constant for both, because they were different: the map opened at bearing
 * -28 and reset went to bearing 0, so the button took you somewhere worse than
 * where you began and there was no way back to it.
 *
 * Pitch is measured from straight down, so a lower number is more overhead. 46
 * looks down over the mountains rather than across them, which is what makes
 * the cut-out read as an object on a table.
 */
const HOME = { bearing: 152, pitch: 46, zoom: 1 };

/**
 * The bearing that puts north at the top of the screen.
 *
 * 180 rather than 0, because resort.js maps north to -z and the projection
 * looks along +z: at bearing 0 north is behind the camera and sits at the
 * bottom of the frame. Verified rather than reasoned about, in field.test.js.
 *
 * Deliberately not HOME. The opening view is a composition, chosen because
 * Monterosa runs east to west and looks like a model of a mountain from 152;
 * from due north it is edge-on and flat. The compass is a compass, though, and
 * pressing one has exactly one meaning.
 */
const NORTH_UP = 180;

/**
 * Everything the app floats over this canvas. Place names are placed around
 * them rather than under them; see drawPlaces.
 */
const CHROME = [".maptools", ".resortbar", ".planbtn", ".mapnote", ".nav__status", ".nav__foot", ".sheet", ".topbar .iconbtn"];

/**
 * Camera slack.
 *
 * Loose on purpose. A camera that stops the moment you push it feels broken
 * even when it is behaving; these leave room to move and still put a wall
 * somewhere. ZOOM_MIN below 1 is what lets the whole cut-out sit in frame with
 * air around it.
 */
const ZOOM_MIN = 0.34;
/*
 * Room to get right in over a single summit.
 *
 * Set from what it buys rather than as a round number. Kronplatz, ground
 * across a 430 pixel screen, one figure per zoom-in press:
 *
 *   zoom  1    11,119 m      the whole massif, which is the opening view
 *   zoom 16     1,011 m      the old ceiling: a kilometre still in shot
 *   zoom 32       650 m      one bowl, one lift line, still a photograph
 *   zoom 48       410 m      magnified past the drape: a wash
 *
 * A kilometre across the screen is not close, and it was the closest the map
 * would go: pressing zoom-in a fourth time past the tenth did nothing.
 *
 * Where it stops is set by the imagery rather than by taste, and 48 was too
 * far. The check in features 30 measures how much of the drape's own pattern
 * survives to the screen — how many neighbouring pixels differ — and it reads
 * 47% at zoom 8, 14% at 33 and 2% at 48. Two per cent is not soft, it is one
 * tone: the composited drape is between 1.6 and 3.3 metres a pixel depending
 * on the resort, and by 48 every screen pixel is sampling inside one of them.
 * The terrain under it runs out at about the same place — the elevation grid
 * is 160 samples across the field, so there is no shape finer than about
 * 200 m. So this stops where there is still a picture.
 *
 * The pan limit grows with the excess zoom, so this also buys the reach to
 * bring that bowl to the middle of the screen once you are in on it.
 */
const ZOOM_MAX = 32;
/*
 * Navigating: you, put on the screen, at a fixed scale, facing your way.
 *
 * The Google Maps model rather than a map of your day. What this replaces
 * framed the whole leg from its midpoint, a box `field.span * 0.13` on a
 * side — 7.8 KILOMETRES at Kronplatz — so a six kilometre lift arrived as a
 * thread across a view of the massif and the one thing the screen exists to
 * say, go that way, was the thing you could not read off it.
 *
 * Placed rather than fitted, and that part matters. Fitting a small box of
 * ground looks like the same thing and is not: `toUnit` multiplies altitude
 * by VERT_EXAGGERATION and, at this pitch, sin(72) of it lands in the
 * vertical span, so the framing of a five hundred metre box is decided by how
 * steep it is rather than by how long. Measured over three consecutive legs
 * at Kronplatz, the position came out at 77%, 52% and MINUS 27% down the
 * screen — off the top — because one leg was a lift up, one a traverse and
 * one a descent. A navigation camera cannot have that: you are always in the
 * same place on the glass.
 *
 * So: NAV_ACROSS metres of ground across the width of the frame, you at
 * NAV_ANCHOR down the part of it that is not covered by the instruction or
 * the button, and the way you are about to go running straight up.
 */
const NAV_ACROSS = 480;
const NAV_ANCHOR = 0.74;
/**
 * And how far back you may pull, which is much further than the default.
 *
 * The window above is NAV_ACROSS divided by the zoom, and while the zoom sat
 * on the same floor the rest of the app uses — 0.34, chosen so the whole
 * cut-out fits with air around it — the widest a navigating skier could get
 * was about 1.4 km. That is not enough to answer "where does the rest of the
 * day go", which is the question a person asks when they back off, and being
 * unable to answer it reads as being pinned.
 *
 * 0.03 puts sixteen kilometres across the frame, which is wider than any of
 * these resorts. There is no reason for navigation to have a tighter ceiling
 * on backing off than the map it is drawn on; it only ever needed a different
 * default, and that is what NAV_ACROSS is.
 */
const NAV_ZOOM_MIN = 0.03;
/**
 * How much of the day ahead is drawn as the route while navigating.
 *
 * The leg you are on and the one after it. The rest of the day is still
 * drawn, in the treatment already-skied legs get, because at NAV_ACROSS the
 * day comes back through the same junctions several times and four hundred
 * metres of screen was carrying eight legs at full weight — a tangle in which
 * the one you are actually on is not findable. Which is the opposite of what
 * this screen is for: the immediate next step, and enough of what follows to
 * know which way you leave the junction ahead.
 */
const NAV_LOOKAHEAD = 1;

/**
 * Is this the navigate screen?
 *
 * A point camera with an aim and a route on the map is only ever navigation:
 * every other screen is a bounds camera, or a point camera with no aim. Asked
 * by the camera, by the route drawing and by the recentre button, and hoisted
 * here so those three cannot drift apart — the recentre button going somewhere
 * the camera would not is exactly the bug it used to have.
 */
const isFollowing = (props) =>
  Boolean(
    props?.camera?.kind === "point" &&
    props.camera.center &&
    props.camera.aim &&
    props.route?.features?.length
  );

/**
 * What zoom the label tiers are told they are at while navigating.
 *
 * The navigation camera puts its magnification in the focal length rather than
 * in `v.zoom` — that is what lets it place you at a fixed ground scale — so
 * `v.zoom` there is 1 while about four hundred metres of mountain is on
 * screen. Every label budget reads `v.zoom`, so they all thought they were
 * looking at the whole massif: below NAME_ZOOM, which means the runs went
 * unnamed on the one screen whose job is to tell you which run you are on.
 *
 * A number rather than a conversion, because navigating wants its own answer
 * anyway. The tiers were tuned against how much of the mountain is in frame,
 * and here the frame runs from your ski tips to the horizon: generous budgets
 * would name everything in the compressed strip at the top. Just over
 * NAME_ZOOM turns the run names on and keeps the rest to the few things
 * actually near you.
 */
const NAV_LABEL_ZOOM = 2.2;

/**
 * And how far you may push it before the recentre button has work to do.
 *
 * A screen and a half each way, which is enough to look up the mountain at
 * where the day goes next and not so far that you cannot find yourself again.
 *
 * It was half a frame, and half a frame is the mistake PAN_REACH's own note
 * describes: the wall lands 321 pixels from the anchor on a 900 pixel screen,
 * which is shorter than an ordinary thumb drag, so every normal pan ran into
 * the resistance and sprang back. That does not feel like an edge, it feels
 * like the map skipping — you push, it stops giving, you let go, it moves on
 * its own. Measured before the change: a single 560 pixel drag ended 254
 * pixels behind the thumb. The recentre button is what makes a loose wall
 * safe here, and it is one tap away.
 */
const NAV_PAN = 1.5;
/**
 * How far over the camera leans while navigating.
 *
 * Pitch is measured from straight down, so this is well over towards the
 * ground: the opening composition's 46 looks down ON the mountain, which is
 * right for choosing a day and wrong for skiing one. 72 puts the piste
 * running away up the screen the way it does out of your own goggles.
 */
const NAV_PITCH = 72;

/** How far past the frame the subject may be pushed, as a share of the frame. */
/**
 * How far past the wall a push is allowed, as a share of the frame.
 *
 * Small, because the real reach comes from the rule below rather than from
 * this: you can bring any part of the mountain to the middle of the screen,
 * which is what "let me look at Champoluc" means, and no further, which is
 * what stops the mountain being thrown away. This is only the little bit of
 * give past that.
 */
const OVERSCROLL = 0.06;
/**
 * How much of a frame you may pan beyond the subject's own overflow.
 *
 * Most of one, not half. At 0.45 the wall sat 193 pixels from centre on a
 * 430 pixel canvas — shorter than an ordinary thumb drag, so a normal pan ran
 * into the resistance and sprang back every single time. What that feels like
 * is not an edge, it is the map skipping: you push, it stops giving, you let
 * go, it moves on its own. The wall is meant to be reachable at the end of a
 * deliberate throw and invisible the rest of the time.
 *
 * Still self-limiting. The other half of `reach` bounds it at half the
 * subject, so at the extreme the mountain's own edge is at the middle of the
 * screen and there is always a quarter of a frame of it left.
 */
const PAN_REACH = 0.8;
/** And how far past half the subject, as a fraction of a frame. */
const PAN_BEYOND = 0.22;
/**
 * The block.
 *
 * The mountain is given thickness: a rim under the edge of the terrain, and a
 * flat plane closing the bottom, so it reads as an object rather than a cut-out
 * floating in nothing.
 *
 * The rim is a constant thickness following the ground, and that is the whole
 * trick. The obvious construction is a proper box: drop each edge straight down
 * to the floor. It cannot be made to work here. The bounding box cuts through
 * mountainside on every side, so whichever wall faces the camera has its top at
 * around 3,200 m and hangs 2,000 m down the screen in front of the resort. That
 * is not a framing or a bearing problem: it was measured at four bearings and
 * the near edge is high ground at all of them, because the valleys run through
 * the middle of this bbox rather than along its sides.
 *
 * Nor is it a colour problem, which is the trap. In rock brown the wall is
 * obviously a wall. In a blue-white a shade off the snow the same wall is
 * invisible, so it looks fixed while still hiding half the mountain, with the
 * piste lines drawn over the top of it. If a change here makes the model look
 * better, check what it is covering before believing it.
 */
// How far the slab may run past the side edges, and how much of the free
// height it fills. Bleeding the corners is deliberate: a diorama that stops
// short of the frame reads as a small object, not as terrain.
const BLOCK_BLEED = 1.00;
const BLOCK_FILL = 0.55;
/**
 * How much ground beyond the outermost lift the camera keeps in shot, as a
 * fraction of the resort's own width. The mesh is padded much further than
 * this (FIELD_PAD); this is only how much of it the framing pays for.
 */
const FRAME_PAD = 0.18;



/**
 * The block's face, painted in layers rather than in one tone.
 *
 * Nearly free: one gradient per rim strip, of which there are a few hundred.
 * The multipliers are STRATA, in field.js, next to the colours they scale.
 */
const strata = (g, rgb, band) => {
  const paint = g.createLinearGradient(band[0], band[1], band[2], band[3]);
  for (const [t, k] of STRATA) {
    paint.addColorStop(t, `rgb(${Math.min(255, Math.round(rgb[0] * k))},` +
      `${Math.min(255, Math.round(rgb[1] * k))},${Math.min(255, Math.round(rgb[2] * k))})`);
  }
  return paint;
};

const clampZoom = (z, floor = ZOOM_MIN) => Math.max(floor, Math.min(ZOOM_MAX, z));
/**
 * How far out this screen may go.
 *
 * Navigating gets its own floor because its window is NAV_ACROSS/zoom rather
 * than the whole resort, so the same number means a completely different
 * amount of ground. Read through propsRef so it answers for the screen as it
 * is now, not as it was when a handler was bound.
 */
const zoomFloorFor = (props) => (isFollowing(props) ? NAV_ZOOM_MIN : ZOOM_MIN);

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * Snow above, rock and forest below, shaded by slope and hazed by distance.
 *
 * A continuous ramp rather than five altitude bands. The bands drew a hard
 * edge wherever the terrain crossed one, and because the surface is filled as
 * flat quads that edge landed on cell boundaries and read as blockiness. The
 * mountain has no such lines on it.
 */
/**
 * Snow. That is all the ground is made of.
 *
 * There was a height ramp here — snowy forest in the valley, thinning trees,
 * treeline, scree, firn, snowfield — with a steepness override that turned the
 * walls to rock. It was a lot of machinery for a decision that turns out to be
 * simpler: a skier looking at the drawn terrain wants to read the shape of the
 * mountain, and a photograph of what the ground is made of is what the
 * satellite skin is for. Two ways of saying the same thing competed, and the
 * ramp lost — it put a green-grey wash over the valleys and a grey scar down
 * every wall, and the relief had to compete with both.
 *
 * So the surface is one snow white, and every bit of shape in it comes from
 * the hillshade, the cast shadow and the wind grain. That is also the honest
 * rendering: this is a winter map, and in winter it is all under snow.
 */
const SNOW = [246, 249, 252];

/**
 * Low sun on snow is warm where it lands and blue where it does not.
 *
 * The shading used to be a flat grey multiply, which is what a clay model
 * looks like: a snowfield in shadow is not a darker white, it is blue. These
 * are multipliers per channel at full light and in full shade.
 */
const SUNLIT = [1.05, 1.02, 0.96];
const SHADOW = [0.78, 0.87, 1.06];

/**
 * Ground the sun cannot reach.
 *
 * Darker, and bluer as well as darker, which is the part that matters. Snow in
 * shadow is lit by the sky and nothing else, so it goes blue — and it is the
 * blue, not the darkness, that tells a skier at a distance that a slope is out
 * of the sun. Multiplying by a grey would render it as a slope that is merely
 * facing away, which the hillshade already says.
 */
function inShadow(c, shadow) {
  if (!(shadow > 0)) return c;
  return mix(c, [c[0] * 0.60, c[1] * 0.69, c[2] * 0.87], shadow);
}

function surfaceColour(shade, haze, grain = 0, shadow = 0) {
  let c = SNOW;

  // Warm in the light, blue in the shade, rather than one grey multiplier.
  const k = 0.52 + 0.80 * shade;
  const tint = mix(SHADOW, SUNLIT, Math.max(0, Math.min(1, shade * 1.15)));
  c = [c[0] * k * tint[0], c[1] * k * tint[1], c[2] * k * tint[2]];

  // And a little brightness grain on top: wind on the snowfields, mottle on
  // the rock. Small enough to be texture rather than noise.
  const lift = 1 + grain * 0.09;
  c = [c[0] * lift, c[1] * lift, c[2] * lift];

  c = inShadow(c, shadow);

  // A touch of aerial perspective so far ridges sit back, but only a touch.
  // Washing the surface into the sky is what makes a solid model look like a
  // transparency laid over it, and this one is meant to read as an object.
  c = mix(c, SKY_HORIZON, haze * 0.16);
  return `rgb(${Math.max(0, Math.min(255, c[0])) | 0},` +
    `${Math.max(0, Math.min(255, c[1])) | 0},` +
    `${Math.max(0, Math.min(255, c[2])) | 0})`;
}

/**
 * A photographed colour, lit and hazed the same way a drawn one is.
 *
 * The relief has to survive the drape. A satellite tile is already lit — by
 * the sun that was up when the satellite passed, from a direction that has
 * nothing to do with this camera — and dropping it on flat-shaded quads with
 * no hillshade gives a picture with no shape in it at all: a mountain that
 * reads as a paper map of itself. So the same lighting the drawn terrain uses
 * goes on top, weaker, because the photograph is carrying the detail now and
 * the shading only has to say which way each face is turned.
 */
/*
 * Fill strings, kept rather than rebuilt.
 *
 * A subdivided frame asks for twenty-five thousand colours, and every one was
 * a template string built and then parsed by the canvas — the same cost the
 * depth buffer's palette removed, in a hotter loop. The terrain does not have
 * twenty-five thousand distinct colours in it: quantised to five bits a
 * channel it has a few hundred, and five bits is finer than the eye resolves
 * on a gradient, which is all this is drawing.
 */
const FILLS = new Map();
function fillFor(r, g, b) {
  const q = ((r & 0xf8) << 7) | ((g & 0xf8) << 2) | (b >> 3);
  let hit = FILLS.get(q);
  if (hit === undefined) {
    hit = `rgb(${r & 0xf8},${g & 0xf8},${b & 0xf8})`;
    // Bounded: a resort has a few hundred, and an unbounded map on a hot path
    // is a leak waiting for a long session.
    if (FILLS.size > 4096) FILLS.clear();
    FILLS.set(q, hit);
  }
  return hit;
}

function photoColour(rgb, shade, haze, shadow = 0) {
  const k = 0.72 + 0.46 * shade;
  const tint = mix(SHADOW, SUNLIT, Math.max(0, Math.min(1, shade * 1.15)));
  let c = [rgb[0] * k * tint[0], rgb[1] * k * tint[1], rgb[2] * k * tint[2]];
  c = inShadow(c, shadow);
  c = mix(c, SKY_HORIZON, haze * 0.16);
  return fillFor(
    Math.max(0, Math.min(255, c[0])) | 0,
    Math.max(0, Math.min(255, c[1])) | 0,
    Math.max(0, Math.min(255, c[2])) | 0
  );
}

export default function MountainMap({
  route,
  graph,
  pins,
  camera,
  controlRef,
  viewportBottom = 0,
  viewportTop = 0,
  block = false,
  // Defaults follow whichever resort is active, so a caller that does not care
  // which mountain it is drawing still draws the right one.
  nodes = ACTIVE_NODES,
  places = ACTIVE_PLACES,
  // The baked elevation grid for this resort, if it has one.
  terrain = ACTIVE_TERRAIN,
  makeProjector = activeProjector,
  /** Called with the place under a tap, so the app can open it. */
  onPlace,
  // A satellite drape, or null for the drawn surface. See src/map/imagery.js.
  imagery = null,
  onScale,
}) {
  const canvasRef = useRef(null);
  const fieldRef = useRef(null);
  // panX/panY are a screen-space offset applied after the camera has framed
  // its target, so dragging moves the mountain rather than re-aiming at it.
  const view = useRef({
    ...HOME, targetZoom: HOME.zoom, panX: 0, panY: 0,
  });
  const dirty = useRef(true);
  const lastCam = useRef(null);
  /** The place markers the last frame drew, so a tap can hit-test them. */
  const tappable = useRef([]);
  const projectRef = useRef(null);
  const propsRef = useRef({ route, graph, pins, camera, viewportBottom, viewportTop, block, nodes, places, imagery, onScale, onPlace });
  const mapTest =
    typeof window !== "undefined" && window.location.search.includes("maptest=1");

  // Rebuilt when the mountain changes, or a new resort would be drawn with the
  // previous one's terrain and slab.
  const builtFor = useRef(null);
  const nodesFor = useRef(null);
  if (!fieldRef.current || builtFor.current !== terrain || nodesFor.current !== nodes) {
    builtFor.current = terrain;
    nodesFor.current = nodes;
    fieldRef.current = buildField(nodes, makeProjector, terrain);
  }

  // A screen change re-frames the camera on something new, so any pan the user
  // had applied to the previous view is meaningless — keep it and the new
  // subject arrives off screen.
  const framedOn = useRef(null);
  const frameKey = `${camera?.kind}:${camera?.center?.join(",") ?? camera?.bbox?.join(",") ?? ""}`;
  if (framedOn.current !== frameKey) {
    framedOn.current = frameKey;
    view.current.panX = 0;
    view.current.panY = 0;
  }

  propsRef.current = { route, graph, pins, camera, viewportBottom, viewportTop, block, nodes, places, imagery, onScale, onPlace };
  dirty.current = true;

  // Test hook. Camera state lives in a ref and never reaches the DOM, so a
  // gesture test has no other way to tell panning from rotating. Opt-in via
  // ?maptest=1 so it is never exposed to an ordinary visitor.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!window.location.search.includes("maptest=1")) return undefined;
    const tick = setInterval(() => {
      window.__skisView = { ...view.current };
    }, 60);
    window.__skisSetPitch = (deg) => {
      view.current.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, deg));
      dirty.current = true;
    };
    // Orbiting is a two finger gesture, so a test driving one mouse cannot
    // reach it. Setting bearing directly is the only way to check what the
    // renderer does from the far side.
    window.__skisSetBearing = (deg) => {
      view.current.bearing = deg;
      dirty.current = true;
    };
    // Where a lat/lon lands on the canvas right now. The heading arrow is
    // painted on a canvas in the same colour as the dot it sits under, so the
    // only way to check it points where it should is to work out where that
    // is and compare.
    window.__skisProject = (lon, lat) => {
      const f = fieldRef.current;
      if (!f || !lastCam.current) return null;
      const { x, z } = f.proj.project(lat, lon);
      const s2 = projectRef.current(x, f.sample(x, z), z, view.current, lastCam.current);
      return { x: s2.x, y: s2.y };
    };
    // Every point the route passes through, so a check can ask whether the
    // camera framed all of it or only most of it. The route is a prop, read at
    // call time rather than captured.
    window.__skisRoutePts = () =>
      (propsRef.current.route?.features ?? []).flatMap((f) => f.geometry.coordinates);
    // The mountain's own nodes, so a test can pick whatever is under a finger
    // and follow it through a gesture.
    window.__skisNodes = propsRef.current.nodes ?? nodes;
    return () => clearInterval(tick);
  }, []);

  /*
   * The framing the screen you are on actually means.
   *
   * Two answers, because the screens want different things. Exploring, it is
   * the opening composition: the whole cut-out, looked down on from 46
   * degrees. Navigating, it is you, low in the frame, looking along the way
   * you are about to go — and going back to the mountain-top view there would
   * undo the whole point of the follow camera, which is what the recentre
   * button used to do.
   *
   * Assigned during render rather than held in a `useCallback`, so the two
   * effects below both see the current props without either of them having to
   * list them. Same idiom as `propsRef` above, for the same reason.
   */
  /**
   * The bearing that puts the way you are going straight up the screen, or
   * null when that is not a question this screen asks.
   *
   * toUnit rotates the ground by the bearing and reads `rx` as screen right
   * and `rz` as into the distance, so a direction runs up the screen when
   * rx = 0, which is bearing = atan2(dx, dz). Sanity check: north is -z here,
   * so travelling north gives atan2(0, -1) = 180, which is NORTH_UP.
   */
  const courseUp = () => {
    const f = fieldRef.current;
    const cam = propsRef.current.camera;
    if (!f || !isFollowing(propsRef.current)) return null;
    const here = f.proj.project(cam.center[1], cam.center[0]);
    const there = f.proj.project(cam.aim[1], cam.aim[0]);
    const fx = there.x - here.x;
    const fz = there.z - here.z;
    if (!fx && !fz) return null;
    return (Math.atan2(fx, fz) * 180) / Math.PI;
  };

  /**
   * The recentre button: back to the framing this screen means, bearing and
   * all. Navigating, that is course-up at the default zoom with no pan.
   */
  const homeView = useRef(null);
  homeView.current = () => {
    const bearing = courseUp();
    if (bearing !== null) {
      Object.assign(view.current, {
        bearing,
        pitch: NAV_PITCH,
        zoom: 1,
        targetZoom: 1,
        panX: 0,
        panY: 0,
      });
      dirty.current = true;
      return;
    }
    Object.assign(view.current, HOME, { targetZoom: HOME.zoom, panX: 0, panY: 0 });
    dirty.current = true;
  };

  /**
   * A new leg turns the map. It does not undo what you did to it.
   *
   * This used to call the recentre above, which sets zoom to 1 and pan to
   * zero along with the bearing — so backing the camera off to see where the
   * day was going lasted until the next junction and was then thrown away,
   * every time, with no way to keep it. Reported as being locked in position,
   * and it was: not by a limit, by a reset.
   *
   * Course-up is still the point of the screen, so the bearing follows. Zoom,
   * pitch and pan are the user's, and stay theirs until they press recentre.
   */
  const reaim = useRef(null);
  reaim.current = () => {
    const bearing = courseUp();
    if (bearing === null) return;
    view.current.bearing = bearing;
    dirty.current = true;
  };

  const navLeg = isFollowing({ camera, route }) ? camera.doneThrough : null;
  /*
   * Arriving sets the view up. Advancing only turns it.
   *
   * Both used to be the same call, and taking the reset off the advance took
   * it off the arrival too: navigation opened at whatever pitch the last
   * screen had, 46 rather than 72, so the first thing it did was fail to lean
   * over. Which of the two this is comes from whether there was a leg before:
   * null to a number is walking on to the screen, number to number is a
   * junction.
   */
  const wasFollowing = useRef(false);
  useEffect(() => {
    const following = navLeg !== null;
    const arriving = following && !wasFollowing.current;
    wasFollowing.current = following;
    if (!following) return;
    if (arriving) homeView.current?.();
    else reaim.current?.();
  }, [navLeg]);

  useEffect(() => {
    if (!controlRef) return;
    const zoomFloor = () => zoomFloorFor(propsRef.current);
    controlRef.current = {
      orbit: (deg) => { view.current.bearing += deg; dirty.current = true; },
      // Two controls, two meanings, the way a map app has them. The compass
      // faces north and does nothing else to the framing you have chosen; the
      // recentre goes back to the framing the screen means, bearing and all.
      resetNorth: () => {
        view.current.bearing = NORTH_UP;
        dirty.current = true;
      },
      resetView: () => homeView.current?.(),
      zoom: (delta) => {
        const v = view.current;
        v.targetZoom = clampZoom(v.targetZoom * (delta > 0 ? 1.32 : 0.76), zoomFloor());
        dirty.current = true;
      },
    };
  }, [controlRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const field = fieldRef.current;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;

    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d");
    const blur = document.createElement("canvas");
    const blurCtx = blur.getContext("2d");
    /*
     * A depth buffer, so the mountain is solid.
     *
     * The pistes used to be painted over the finished terrain with no depth
     * test at all, which drew every run on the far side of the ridge straight
     * through it. On a resort the size of Kronplatz that is most of the
     * network: an x-ray of the mountain rather than a view of it, and no way
     * to tell which of two crossing lines is the one under your skis.
     *
     * The terrain is already sorted back to front for the painter's algorithm,
     * so the same pass fills each quad into this canvas with its depth as the
     * colour. Nearer quads are drawn later and overwrite, which leaves the
     * depth of the closest surface at every pixel — exactly what a line has to
     * beat to be visible.
     *
     * Eight bits in the red channel. That is forty metres a step over a scene
     * ten kilometres deep, which would be far too coarse if a line were being
     * compared against the surface it lies on — but each quad stores its
     * furthest corner, rounded outward, so a line on that quad is in front of
     * what the quad wrote by a whole quad's depth. The quantisation lands in
     * the slack rather than on the comparison.
     */
    const depth = document.createElement("canvas");
    const depthCtx = depth.getContext("2d", { willReadFrequently: true });
    let depthData = null;
    let depthNear = 0;
    let depthSpan = 1;
    /** Whichever scale drew the buffer currently in `depthData`. */
    let depthScale = DEPTH_SCALE;
    /*
     * The camera the terrain in `blur` was drawn with, and how far the current
     * one has slid from it.
     *
     * Panning is a pure translation of this projection. `fit` derives the
     * focal length and the centring from the projected bounding box, which
     * depends on bearing, pitch and zoom and on nothing else — the pan is
     * added at the very end, in screen space. So a frame that differs only in
     * pan is the previous frame, shifted, and can be blitted rather than
     * rasterised. On a measured drag that is 33ms a frame against 63.
     *
     * Declared up here, with the canvases, because it belongs to them: it is
     * only valid while the pixels it describes are still there, and `resize`
     * throws those away. That is not a hypothetical — setting canvas.width
     * clears the canvas, a ResizeObserver fires once on observe and again on
     * any layout change, and the size it reports is often the same one. Same
     * size means the same shape key, which means the slide is zero, which
     * means reuse: the map blitted a canvas that had just been wiped and drew
     * a mountain made entirely of sky.
     */
    let cachedAt = null;
    let depthShiftX = 0;
    let depthShiftY = 0;
    let depthBias = (fieldRef.current?.span ?? 0) * DEPTH_BIAS_FRAC;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width || 430;
      height = rect.height || 900;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // The margin is on every side, so the offscreen is bigger than the
      // canvas by twice it.
      off.width = Math.round((width + TERRAIN_MARGIN * 2) * dpr);
      off.height = Math.round((height + TERRAIN_MARGIN * 2) * dpr);
      blur.width = off.width;
      blur.height = off.height;
      // Deliberately coarse, and never scaled by the device pixel ratio.
      // Rasterising the terrain a second time is the cost of the depth test,
      // and area is what that costs: at a third of the linear size it is a
      // ninth of the fill. An occlusion test does not need better — a ridge
      // that hides a run is tens of pixels across, not one — and the readback
      // afterwards is a ninth of the bytes too, which is the part that would
      // otherwise stutter a drag.
      depth.width = Math.max(1, Math.round((width + TERRAIN_MARGIN * 2) * DEPTH_SCALE));
      depth.height = Math.max(1, Math.round((height + TERRAIN_MARGIN * 2) * DEPTH_SCALE));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Shifted by the margin, so canvas (0,0) lands inside the offscreen
      // rather than on its corner.
      offCtx.setTransform(dpr, 0, 0, dpr, TERRAIN_MARGIN * dpr, TERRAIN_MARGIN * dpr);
      depthCtx.setTransform(DEPTH_SCALE, 0, 0, DEPTH_SCALE,
        TERRAIN_MARGIN * DEPTH_SCALE, TERRAIN_MARGIN * DEPTH_SCALE);
      depthData = null;
      // The pixels the cache describes have just been thrown away with the
      // canvases. See the note where it is declared.
      cachedAt = null;
      dirty.current = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Place names are laid out around the chrome that floats over this canvas,
    // and the chrome slides into position on a CSS transition. React has the
    // final value before the element has moved, so a redraw triggered by the
    // prop change measures the control stack four hundred pixels from where it
    // ends up — and "Colle Bettaforca" was laid out into a gap that the zoom
    // buttons then slid over. Nothing redraws after a transition on its own,
    // so this does: the chrome has stopped moving, look again.
    const onSettled = (e) => {
      if (e.target instanceof Element && e.target.closest(CHROME.join(","))) {
        dirty.current = true;
      }
    };
    window.addEventListener("transitionend", onSettled, true);

    // ---- camera ----------------------------------------------------------
    // Screen position is linear in the focal length once the perspective
    // divide is done, so the framing can be solved in one pass: project the
    // points we want in shot into "unit" space, then pick the focal length and
    // offsets that fit their bbox into the part of the canvas the sheet is not
    // covering.
    const unit = (x, y, z, v) => toUnit(field, x, y, z, v);

    /**
     * The whole mountain, corner to corner.
     *
     * The resort's own corners, not the field's. The field is padded by
     * FIELD_PAD on every side so the mountain rises out of ground rather than
     * ending at the last lift station, which makes the mesh 2.1x the resort
     * across. Framing that box put the resort in the middle third of the
     * screen with sky above and below it, and pushed the base villages —
     * Champoluc is the outermost node there is — right to the edge.
     *
     * So the camera frames the resort plus a slice of the pad. The rest of the
     * pad is still drawn and still fills the corners of the frame; it is just
     * no longer competing with the resort for room.
     */
    const whole = () => {
      const r = field.resort;
      const cx = (r.minX + r.maxX) / 2;
      const cz = (r.minZ + r.maxZ) / 2;
      /*
       * The lift stations, pushed out from the middle, not the corners of
       * their bounding box.
       *
       * Monterosa runs diagonally across its box, so the box's corners sit
       * kilometres past anything skiable and its projected width is half again
       * the resort's. That is what BLOCK_BLEED was tuned against: bleeding the
       * corners off the sides was free, because there was nothing in them. It
       * is not free on a resort that fills its box — Latemar lost Obereggen
       * off the right edge — and the difference between the two is a fact
       * about the shape of the resort, which is exactly what the point cloud
       * carries and the bounding box throws away.
       */
      const out = field.pts.map((p) => {
        const x = cx + (p.x - cx) * (1 + FRAME_PAD);
        const z = cz + (p.z - cz) * (1 + FRAME_PAD);
        return [x, field.sample(x, z), z];
      });
      out.push([cx, field.resortHi, cz]);
      return out;
    };

    /** Every point the route passes through. */
    const routeTargets = (r) => {
      const out = [];
      for (const f of r.features) {
        for (const [lon, lat] of f.geometry.coordinates) {
          const { x, z } = field.proj.project(lat, lon);
          out.push([x, field.sample(x, z), z]);
        }
      }
      return out;
    };

    /** World points the camera should keep in shot. */
    const targets = () => {
      const { route: r } = propsRef.current;
      // What the camera is pointed at, which is a separate question from
      // whether the slab is drawn.
      //
      // A route is the subject wherever there is one. Letting the slab force
      // the whole mountain into shot made choose a postage stamp, since the
      // sheet takes most of the height. Explore has no route and gets the
      // whole mountain: framing the resort tightly there would put the
      // cut-out's own sides off screen, where they project across the view
      // instead of bounding it.
      //
      // Navigating does not come through here at all — `fit` hands off to
      // navWindow before asking for a subject. If that ever bails, on a
      // position that projects to a non-finite point, the route is the right
      // thing to fall back to and it is what happens.
      if (r?.features?.length) return routeTargets(r);
      return whole();
    };

    /**
     * The zoom the label tiers work from, which is not always the view's.
     *
     * See NAV_LABEL_ZOOM. Every tier asks through here so that they cannot
     * disagree about which screen they are on: a run name tier that thinks it
     * is zoomed in and a hut tier that thinks it is zoomed out would fight
     * over the same pixels.
     */
    const labelZoom = (v) =>
      isFollowing(propsRef.current) ? NAV_LABEL_ZOOM : v.zoom;

    /**
     * Bring a pan back inside its wall, but only from rest.
     *
     * Anything already past the wall belongs to the spring in the frame loop:
     * clamping it here instead snapped it back in one frame, which is the dead
     * stop under your thumb that reads as the app having stopped listening.
     */
    const settle = (x, lim) =>
      Math.abs(x) > lim + 0.5 ? x : Math.max(-lim, Math.min(lim, x));

    /** The insets the chrome leaves, which both cameras below frame inside. */
    const band = () => {
      const padX = 26;
      const padTop = 74;
      const padBottom = 24;
      const top = propsRef.current.viewportTop;
      const visibleH = Math.max(180, height - propsRef.current.viewportBottom - top);
      return {
        padX,
        top,
        padTop,
        availW: width - padX * 2,
        availH: visibleH - padTop - padBottom,
      };
    };

    /**
     * The navigation camera: you, on the glass, at a fixed ground scale.
     *
     * Not a fit. `fit` below solves a focal length that makes some subject
     * fill the frame, which is the right question on every other screen and
     * the wrong one here — see NAV_ACROSS for what fitting a small box of
     * ground actually does on a slope. This solves the two things a follow
     * camera is actually specified by:
     *
     *   f   so that NAV_ACROSS metres of ground across your own position
     *       covers the width of the frame
     *   ox  so that your position lands on the anchor
     *
     * A lateral metre at depth d covers f/(span*1.45 + d) pixels, straight out
     * of toUnit's perspective divide, so the first is one line. The second is
     * the projection read backwards.
     *
     * Returns null when this is not the navigation screen, and the caller
     * falls through to the framing camera.
     */
    const navWindow = (v) => {
      if (!isFollowing(propsRef.current)) return null;
      const cam = propsRef.current.camera;

      const here = field.proj.project(cam.center[1], cam.center[0]);
      const p = unit(here.x, field.sample(here.x, here.z), here.z, v);
      if (!Number.isFinite(p.u) || !Number.isFinite(p.v)) return null;

      const { padX, top, padTop, availW, availH } = band();
      const metresPerUnit = field.span * 1.45 + p.depth;
      const f = (availW * metresPerUnit * v.zoom) / NAV_ACROSS;

      // Centred across, low down: the ground you are about to cross gets the
      // rest of the screen.
      const ax = padX + availW / 2;
      const ay = top + padTop + availH * NAV_ANCHOR;

      const limitX = availW * NAV_PAN;
      const limitY = availH * NAV_PAN;
      if (!v.dragging) {
        v.panX = settle(v.panX, limitX);
        v.panY = settle(v.panY, limitY);
      }
      v.panLimit = { x: limitX, y: limitY };
      // The anchor is what zoomAbout has to hold a screen point against here,
      // the way the frame centre is on the other camera.
      v.frame = { ax, ay };

      return {
        f,
        ox: ax - p.u * f + v.panX,
        oy: ay - p.v * f + v.panY,
        panX: v.panX,
        panY: v.panY,
      };
    };

    /** Solve focal length and offset so the targets fill the visible area. */
    const fit = (v) => {
      const nav = navWindow(v);
      if (nav) return nav;
      const pts = targets().map(([x, y, z]) => unit(x, y, z, v));
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const p of pts) {
        u0 = Math.min(u0, p.u); u1 = Math.max(u1, p.u);
        v0 = Math.min(v0, p.v); v1 = Math.max(v1, p.v);
      }
      // Chrome covers the bottom of every screen that has any. Frame the
      // subject in what is left, but keep the terrain drawing full-bleed
      // behind it: a letterboxed mountain looks broken.
      const { padX, top, padTop, availW, availH } = band();

      const spanU = Math.max(u1 - u0, 1e-6);
      const spanV = Math.max(v1 - v0, 1e-6);
      // A pitched slab projects wide and shallow, so fitting both axes is
      // always width-bound and leaves a small model adrift in sky. Let the
      // corners bleed off the sides and fill the height instead, which is what
      // makes it read as a diorama you are looking into.
      const wholeCutout =
        propsRef.current.block && !propsRef.current.route?.features?.length;
      const f = (wholeCutout
        ? Math.min((availW / spanU) * BLOCK_BLEED, (availH * BLOCK_FILL) / spanV)
        : Math.min(availW / spanU, availH / spanV)) * v.zoom;

      // Half the subject, plus a little.
      //
      // Pan is a screen-space nudge applied after the camera has framed the
      // subject, so nothing bounds it by nature and you could flick the
      // mountain away and be left with sky. But the bound was the wrong shape:
      // it allowed half the OVERFLOW, which only brings the far edge of the
      // mountain to the edge of the screen. At rest there is no overflow at
      // all, so all you had was the small overscroll and the far end of the
      // resort could not be brought anywhere near the middle.
      //
      // Half the subject is the honest rule. It lets you put any point of the
      // mountain in the centre of the screen, which is the whole ask, and it
      // is self-limiting: at that extreme the mountain's edge is at the centre
      // and half of it is still on screen. It also grows with the zoom for
      // free, because f does.
      // Whichever is smaller: half the subject, or enough to scroll through
      // the overflow plus most of a frame.
      //
      // Half the subject alone is the right idea at rest, where it lets you
      // put the far end of the resort near the middle of the screen. Zoomed
      // in it is far too much: the subject is several frames wide, so half of
      // it pans past everything and leaves sky. The second term is the
      // traversal rule, which already handled zoom correctly, opened up from
      // the tenth of a frame it used to allow to nearly half of one.
      const reach = (span, avail) =>
        Math.min(
          // Half the subject, plus a slice of frame. Half alone is the rule
          // "you can bring any point of the resort to the middle of the
          // screen", which is principled and, at rest, 189 pixels on a phone:
          // shorter than a thumb drag, so every ordinary pan ended in the
          // rubber band. The slice lets the resort's edge travel past the
          // middle instead, and at that extreme there is still a third of a
          // frame of mountain in shot.
          (f * span) / 2 + avail * PAN_BEYOND,
          Math.max(0, f * span - avail) / 2 + avail * PAN_REACH
        ) + avail * OVERSCROLL;
      const limitX = reach(spanU, availW);
      const limitY = reach(spanV, availH);
      // Only hard clamped when the finger is off the glass. While dragging the
      // pan is allowed past the limit under resistance and springs back on
      // release, because a dead stop under your thumb is what reads as broken.
      // Google Earth has no wall at all; this is the smallest wall that still
      // stops you throwing the mountain away.
      if (!v.dragging) {
        v.panX = settle(v.panX, limitX);
        v.panY = settle(v.panY, limitY);
      }
      v.panLimit = { x: limitX, y: limitY };

      // Where the frame's centre sits before pan. zoomAbout needs it to work
      // out how far to shift the pan so the point under your fingers stays
      // under your fingers.
      v.frame = { ax: padX + availW / 2, ay: top + padTop + availH / 2 };

      return {
        f,
        ox: padX + availW / 2 - (f * (u0 + u1)) / 2 + v.panX,
        oy: top + padTop + availH / 2 - (f * (v0 + v1)) / 2 + v.panY,
        // The pan this camera was solved with. A drag needs it: pointer moves
        // arrive faster than frames, so between renders the pan has moved on
        // and anything projected with this camera is that far out of date.
        panX: v.panX,
        panY: v.panY,
      };
    };

    const project = (x, y, z, v, cam) => {
      const p = unit(x, y, z, v);
      return { x: cam.ox + p.u * cam.f, y: cam.oy + p.v * cam.f, depth: p.depth };
    };
    projectRef.current = project;

    /**
     * How far a bar on screen is on the ground.
     *
     * Measured rather than derived from the zoom: the camera is a perspective
     * one over an exaggerated height field, so there is no single scale for
     * the whole frame. Two points a kilometre apart at the middle of the
     * resort, at ground level, is the same thing a map app means by its scale
     * bar — the distance at the centre of what you are looking at.
     *
     * The bar then takes a round number whose length lands between 56 and 150
     * pixels, which is why 250 m and 2 km are in the list: without them a
     * mountain sits at a zoom where 100 m is 20 pixels and 500 m is off the
     * side.
     */
    const ROUND_METRES = [50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000];
    let lastScale = null;
    const publishScale = (v, cam) => {
      const fn = propsRef.current.onScale;
      if (!fn) return;
      const y = field.sample(field.cx, field.cz);
      const a = project(field.cx - 500, y, field.cz, v, cam);
      const b = project(field.cx + 500, y, field.cz, v, cam);
      const perKm = Math.hypot(b.x - a.x, b.y - a.y);
      if (!Number.isFinite(perKm) || perKm <= 0) return;
      const perMetre = perKm / 1000;
      let best = ROUND_METRES[0];
      for (const m of ROUND_METRES) {
        best = m;
        if (m * perMetre >= 56) break;
      }
      const px = Math.round(best * perMetre);
      if (lastScale && lastScale.metres === best && Math.abs(lastScale.px - px) < 2) return;
      lastScale = { metres: best, px };
      fn(lastScale);
    };

    // ---- terrain ---------------------------------------------------------
    /*
     * The photographed colour of every quad, worked out once.
     *
     * Which part of the world a quad covers does not change when the camera
     * moves, so neither does its colour. Sampling in the draw loop would be
     * five thousand texture lookups a frame for an answer that is the same
     * every frame; this is five thousand once, and thrown away when the drape
     * or the mountain changes.
     */
    let photo = null;
    let photoFor = null;
    const photoGrid = () => {
      const drape = propsRef.current.imagery;
      if (!drape) return null;
      if (photoFor === drape) return photo;
      const { minX, maxX, minZ, maxZ } = field;
      const dx = (maxX - minX) / GRID;
      const dz = (maxZ - minZ) / GRID;
      const out = new Array(GRID * GRID);
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          // The middle of the quad, which is the ground the flat fill stands
          // for — a corner would bias every square toward its neighbour.
          const { lat, lon } = field.proj.unproject(minX + dx * (i + 0.5), minZ + dz * (j + 0.5));
          out[i * GRID + j] = drape.at(lat, lon);
        }
      }
      photoFor = drape;
      photo = out;
      return photo;
    };

    /**
     * One quad, painted from the photograph at n by n instead of flat.
     *
     * The cell corners come from bilinear interpolation of the quad's four
     * projected corners rather than from projecting each one, which is both
     * far cheaper and exactly what tiles the quad without seams. It is not
     * perspective-correct — the true mapping is a homography and this is its
     * affine approximation — but the error over one quad at the zoom where
     * subdivision starts is a fraction of a pixel, and the alternative is
     * projecting hundreds more points per quad to remove something nobody can
     * see.
     *
     * The hillshade is the quad's, not the cell's. Slope is a property of the
     * mesh and the mesh has no more detail to give here; using one value keeps
     * the lighting continuous across the cell boundaries, where varying it
     * would draw a grid on the mountain.
     */
    const drawTextured = (g, q, nu, nw, haze, dx, dz, minX, minZ) => {
      const drape = propsRef.current.imagery;
      const [a, b, c, d] = q.pts;
      // p(s,t): s runs a→b along the mesh's i, t runs a→d along its j.
      const px = (s, t) =>
        a.x * (1 - s) * (1 - t) + b.x * s * (1 - t) + d.x * (1 - s) * t + c.x * s * t;
      const py = (s, t) =>
        a.y * (1 - s) * (1 - t) + b.y * s * (1 - t) + d.y * (1 - s) * t + c.y * s * t;

      /*
       * Cells overlap rather than being stroked.
       *
       * Adjacent fills leave a hairline of canvas between them, which reads as
       * a grid drawn on the mountain. Stroking each cell in its own colour
       * closes it and doubles the work — twenty-five thousand strokes a frame
       * on top of twenty-five thousand fills. Reaching a fraction past the far
       * edges closes it for nothing: the neighbour paints over the excess, and
       * the last row and column spill by a fraction of a pixel onto ground the
       * quad's own edge stroke already covers.
       */
      const bleedU = OVERLAP / nu;
      const bleedW = OVERLAP / nw;
      for (let u = 0; u < nu; u++) {
        const s0 = u / nu;
        const s1 = Math.min(1 + bleedU, (u + 1) / nu + bleedU);
        for (let w = 0; w < nw; w++) {
          const t0 = w / nw;
          const t1 = Math.min(1 + bleedW, (w + 1) / nw + bleedW);
          const { lat, lon } = field.proj.unproject(
            minX + dx * (q.gi + (s0 + s1) / 2),
            minZ + dz * (q.gj + (t0 + t1) / 2)
          );
          const rgb = drape.at(lat, lon) ?? q.photo;
          const fill = photoColour(rgb, q.shade, haze, q.shadow);
          g.beginPath();
          g.moveTo(px(s0, t0), py(s0, t0));
          g.lineTo(px(s1, t0), py(s1, t0));
          g.lineTo(px(s1, t1), py(s1, t1));
          g.lineTo(px(s0, t1), py(s0, t1));
          g.closePath();
          g.fillStyle = fill;
          g.fill();
        }
      }
    };

    /**
     * Draw the mountain, optionally every `step`th vertex.
     *
     * Progressive refinement, and the reason the mesh can be fine at all. The
     * grid is sampled from a measured DEM and there is no point holding it
     * coarser than the screen — at the framing the app opens on, a cell at
     * GRID 72 is eleven pixels, so the surface is half the resolution of the
     * display it is being drawn to and the softening exists to hide that.
     *
     * What stops it being fine is the frame time while the camera is turning,
     * and that is a different question from what the still picture looks like.
     * A moving mountain is drawn on the stride and the still one at full
     * resolution, a beat after the finger comes off. One field either way, so
     * `sample`, `hi`, `lo` and therefore the framing are identical between the
     * two and refining cannot move the camera.
     */
    /**
     * The same mountain, drawn by the GPU. Returns false if it could not.
     *
     * Everything on top of the ground is still Canvas 2D — this only replaces
     * the surface and the block, composited into the same offscreen the 2D
     * path fills, so the blur, the pan cache, the margin and every overlay
     * carry on unchanged.
     *
     * Why: Canvas 2D can fill a shape with one colour, so a photograph draped
     * on a height field comes out as the photograph downsampled to the mesh.
     * See src/map/gl.js for the numbers.
     */
    const drawTerrainGL = (v, cam) => {
      if (!glr) return false;
      const slab = propsRef.current.block ? slabFor(field) : null;
      const drape = propsRef.current.imagery;

      // Rebuilt when the mountain changes, which is per resort, not per frame.
      if (glField !== field || glDrape !== drape) {
        const uvFor = drape?.uv
          ? (x, z) => {
            const { lat, lon } = field.proj.unproject(x, z);
            return drape.uv(lat, lon);
          }
          : null;
        try {
          glr.setField(field, { uvFor, slab });
          glr.setTexture(drape?.image ?? null);
        } catch {
          glr = null;
          return false;
        }
        glField = field;
        glDrape = drape;
      }

      /*
       * How near and how far, without looking at every vertex.
       *
       * `toUnit`'s depth is affine in x, y and z, so over a box its extremes
       * are at the corners — all eight of them, exactly, rather than the
       * running min and max the 2D path accumulates while rasterising. The
       * slab's underside is part of the model, so it is one of the heights.
       */
      const lowest = slab ? slab.base : field.lo;
      let dMin = Infinity;
      let dMax = -Infinity;
      for (const x of [field.minX, field.maxX]) {
        for (const y of [lowest, field.hi]) {
          for (const z of [field.minZ, field.maxZ]) {
            const d = toUnit(field, x, y, z, v).depth;
            if (d < dMin) dMin = d;
            if (d > dMax) dMax = d;
          }
        }
      }
      const span = Math.max(1, dMax - dMin);
      // In w, which is what the shader interpolates; the decode below undoes
      // the constant so `visible` still reads depth in toUnit's own units.
      const K = field.span * 1.45;
      const range = [K + dMin, span];

      // The offscreen reaches TERRAIN_MARGIN past the canvas on every side,
      // so the GPU is drawing into a slightly bigger frame with the camera
      // shifted by the same amount.
      const w = width + TERRAIN_MARGIN * 2;
      const h = height + TERRAIN_MARGIN * 2;
      const shifted = { f: cam.f, ox: cam.ox + TERRAIN_MARGIN, oy: cam.oy + TERRAIN_MARGIN };
      const matrix = glMatrix(field, v, shifted, w, h);

      glr.resize(Math.round(w * dpr), Math.round(h * dpr));
      glr.draw({
        matrix,
        depth: range,
        snow: SNOW,
        sky: SKY_HORIZON,
        // A uniform, not a rebuild: the shading is baked into the vertex
        // buffer and turning the sun off must not cost a mesh upload.
        shadows: shadowsOn,
      });

      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.clearRect(0, 0, off.width, off.height);
      offCtx.drawImage(glr.canvas, 0, 0, off.width, off.height);

      depthNear = dMin;
      depthSpan = span;
      depthScale = GL_DEPTH_SCALE;
      depthBias = field.span * GL_DEPTH_BIAS_FRAC;
      depthData = glr.depthImage(
        Math.max(1, Math.round(w * GL_DEPTH_SCALE)),
        Math.max(1, Math.round(h * GL_DEPTH_SCALE)),
        { matrix, depth: range }
      );

      if (mapTest) {
        window.__skisSurface = { flat: 0, textured: glr.textured ? 1 : 0, cells: 0, patch: 0, gpu: true };
        window.__skisMesh = { step: 1, grid: GRID, quads: GRID * GRID, gpu: true };
      }
      return true;
    };

    /** Time a GPU redraw, and hand the map back to Canvas 2D if it is losing. */
    const judgeGpu = (ms) => {
      if (!glr || forced === "1" || glTrial === null) return;
      glTrial.push(ms);
      if (glTrial.length < GL_TRIAL_SKIP + GL_TRIAL_FRAMES) return;
      const runs = glTrial.slice(GL_TRIAL_SKIP).sort((a, b) => a - b);
      const median = runs[Math.floor(runs.length / 2)];
      glTrial = null;
      if (median <= GL_BUDGET_MS) return;
      glr = null;
      glField = null;
      glDrape = null;
      // Nothing on the offscreen came from a renderer that still exists.
      cachedAt = null;
      dirty.current = true;
    };

    const drawTerrain = (v, cam, g, dep, step = 1) => {
      const { heights, at, shades, shadows, grains, qAt, minX, maxX, minZ, maxZ, lo, hi } = field;
      const dx = (maxX - minX) / GRID;
      const dz = (maxZ - minZ) / GRID;
      const skin = photoGrid();
      // The offscreen reaches TERRAIN_MARGIN past the canvas on every side, in
      // the canvas's own coordinates, so anything beyond that is not drawn.
      const cullR = width + CULL_PAD;
      const cullB = height + CULL_PAD;
      const quads = [];
      let dMin = Infinity;
      let dMax = -Infinity;

      /*
       * Every grid vertex, projected once.
       *
       * A vertex is a corner of up to four quads, and this loop used to
       * project each quad's four corners independently: twenty thousand
       * projections a frame where five thousand describe the same mountain.
       * The waste was invisible while the terrain was the only thing being
       * drawn and became the thing to fix the moment a depth pass wanted the
       * same corners again.
       */
      // Only the lattice the stride actually visits. The array is full size so
      // `at` still addresses it, and the slab below reads the same corners.
      const verts = new Array((GRID + 1) * (GRID + 1));
      for (let i = 0; i <= GRID; i += step) {
        const x = minX + dx * i;
        for (let j = 0; j <= GRID; j += step) {
          const k = at(i, j);
          verts[k] = project(x, heights[k], minZ + dz * j, v, cam);
        }
      }
      // The last row and column, whatever the stride leaves over, so a mesh
      // whose size is not a multiple of the stride still reaches its own edge
      // instead of stopping short of it and showing the slab through the gap.
      if (GRID % step) {
        for (let i = 0; i <= GRID; i += step) {
          verts[at(i, GRID)] = project(minX + dx * i, heights[at(i, GRID)], maxZ, v, cam);
        }
        for (let j = 0; j <= GRID; j += step) {
          verts[at(GRID, j)] = project(maxX, heights[at(GRID, j)], minZ + dz * j, v, cam);
        }
        verts[at(GRID, GRID)] = project(maxX, heights[at(GRID, GRID)], maxZ, v, cam);
      }
      const next = (i) => (i + step >= GRID ? GRID : i + step);

      for (let i = 0; i < GRID; i += step) {
        const i2 = next(i);
        for (let j = 0; j < GRID; j += step) {
          const j2 = next(j);
          const h00 = heights[at(i, j)];
          const h10 = heights[at(i2, j)];
          const h01 = heights[at(i, j2)];
          const h11 = heights[at(i2, j2)];

          const a = verts[at(i, j)];
          const b = verts[at(i2, j)];
          const c = verts[at(i2, j2)];
          const d = verts[at(i, j2)];

          const depth = (a.depth + c.depth) / 2;
          dMin = Math.min(dMin, depth);
          dMax = Math.max(dMax, depth);

          /*
           * Ground nobody can see costs nothing.
           *
           * Zoomed in, most of the mesh is off the sides — at zoom four,
           * fifteen quads in sixteen are outside the frame, and every one of
           * them was being projected, sorted, filled and written to the depth
           * buffer. The margin is the same one the terrain is drawn past so a
           * pan can slide it without exposing bare canvas, plus a quad's worth
           * of slack so nothing on the boundary is dropped while part of it is
           * still showing.
           *
           * The bounds are the offscreen's, in its own coordinates, which is
           * why the margin is added on both sides rather than subtracted on
           * one. Cheap enough to be worth doing per quad: four comparisons
           * against a fill that costs microseconds.
           */
          if ((a.x < -CULL_PAD && b.x < -CULL_PAD && c.x < -CULL_PAD && d.x < -CULL_PAD) ||
              (a.x > cullR && b.x > cullR && c.x > cullR && d.x > cullR) ||
              (a.y < -CULL_PAD && b.y < -CULL_PAD && c.y < -CULL_PAD && d.y < -CULL_PAD) ||
              (a.y > cullB && b.y > cullB && c.y > cullB && d.y > cullB)) {
            continue;
          }

          /*
           * The depth mesh is coarser than the picture, and safe to be.
           *
           * Both passes fill the same five thousand quads, and it is the fills
           * that cost — projecting every vertex once instead of four times
           * barely moved the number. So one depth polygon covers a block of
           * DEPTH_STEP by DEPTH_STEP quads.
           *
           * It stays correct because of which way each approximation errs. The
           * depth written is the maximum over every vertex in the block, and
           * that is exact rather than approximate: each quad is planar, so the
           * furthest point of the surface inside a block is one of its
           * vertices. The polygon is the block's four corners, which a bulge
           * in the middle can poke outside of — and a pixel the polygon misses
           * reads as sky, which hides nothing. Both directions are
           * under-occlusion, never over.
           */
          let block = null;
          const dstep = DEPTH_STEP * step;
          if (dep && i % dstep === 0 && j % dstep === 0) {
            const bi = Math.min(i + dstep, GRID);
            const bj = Math.min(j + dstep, GRID);
            let far = -Infinity;
            for (let u = i; u <= bi; u += step) {
              const uu = Math.min(u, GRID);
              for (let w = j; w <= bj; w += step) {
                const q = verts[at(uu, Math.min(w, GRID))]?.depth;
                if (q > far) far = q;
              }
            }
            block = {
              far,
              pts: [verts[at(i, j)], verts[at(bi, j)], verts[at(bi, bj)], verts[at(i, bj)]],
            };
          }

          quads.push({
            depth,
            block,
            pts: [a, b, c, d],
            // All four corners, not two: the diagonal average jumped between
            // neighbours that share three of them.
            alt: (h00 + h10 + h01 + h11) / 4,
            gi: i,
            gj: j,
            photo: skin ? skin[i * GRID + j] : null,
            shade: shades[qAt(i, j)],
            shadow: shadows && shadowsOn ? shadows[qAt(i, j)] : 0,
            grain: grains[qAt(i, j)],
          });
        }
      }

      // ---- the block -------------------------------------------------------
      // Pushed onto the same list so the painter's sort puts near faces in
      // front of the terrain and far ones behind, with no second pass.
      if (propsRef.current.block) {
        const { thickness, base } = slabFor(field);

        /**
         * One strip of the rim.
         *
         * `out` is the direction the face looks, which decides whether it is
         * drawn at all. Without that test both sides of every face are painted,
         * the inner face of the far side shows over the terrain, and the model
         * reads as an open tray.
         */
        const side = (xa, za, ha, xb, zb, hb, out) => {
          const step = Math.max(dx, dz);
          const mx = (xa + xb) / 2;
          const mz = (za + zb) / 2;
          if (project(mx + out[0] * step, base, mz + out[1] * step, v, cam).depth >=
              project(mx, base, mz, v, cam).depth) return; // facing away

          const p1 = project(xa, ha, za, v, cam);
          const p2 = project(xb, hb, zb, v, cam);
          const pts = [
            p1,
            p2,
            project(xb, base, zb, v, cam),
            project(xa, base, za, v, cam),
          ];
          quads.push({
            // Depth from the top corners only. Averaging a top and a bottom
            // describes a point halfway down and sorts a near face behind
            // terrain it stands in front of.
            depth: (p1.depth + p2.depth) / 2,
            // A rim face is one polygon already, so it goes in at full size.
            // It has to go in at all: the near rim stands in front of the
            // valley floor behind it.
            block: dep ? { far: Math.max(...pts.map((q) => q.depth)), pts } : null,
            pts,
            flat: out[0] !== 0 ? SKIRT_SHADE : SKIRT_LIT,
            // Down the face, for the strata. The rim is a constant thickness
            // following the ground, so a band across it runs parallel to the
            // ground above — which is what strata in a cut block look like.
            band: [
              (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2,
              (pts[2].x + pts[3].x) / 2, (pts[2].y + pts[3].y) / 2,
            ],
          });
        };

        const edge = (i, j, di, dj, out) =>
          side(
            minX + dx * i, minZ + dz * j, heights[at(i, j)],
            minX + dx * (i + di), minZ + dz * (j + dj), heights[at(i + di, j + dj)],
            out
          );

        // Along the same lattice the surface uses, so the rim meets the ground
        // it is holding up rather than cutting across it.
        for (let i = 0; i < GRID; i += step) {
          const d = next(i) - i;
          edge(i, 0, d, 0, [0, -1]);
          edge(i, GRID, d, 0, [0, 1]);
        }
        for (let j = 0; j < GRID; j += step) {
          const d = next(j) - j;
          edge(0, j, 0, d, [-1, 0]);
          edge(GRID, j, 0, d, [1, 0]);
        }

        // The underside, one flat tone, so it is a box and not a shell.
        const floor = [
          project(minX, base, minZ, v, cam),
          project(maxX, base, minZ, v, cam),
          project(maxX, base, maxZ, v, cam),
          project(minX, base, maxZ, v, cam),
        ];
        quads.push({
          depth: Infinity, // behind everything; only seen from below
          block: dep ? { far: Math.max(...floor.map((q) => q.depth)), pts: floor } : null,
          pts: floor,
          flat: BASE_COLOUR,
        });
      }

      quads.sort((p, q) => q.depth - p.depth); // painter's algorithm
      const dSpan = dMax - dMin || 1;
      /*
       * The far corner of every quad, and the range they span.
       *
       * A second pass rather than a field on each quad: it is a max over four
       * numbers and the slab's faces get it for free, where storing it at
       * construction would mean computing it in three places. The underside is
       * pushed with a depth of Infinity to force it to the back of the sort,
       * and its corners are real, so taking it from the corners also keeps the
       * range finite.
       */
      let dFar = dMin;
      for (const q of quads) if (q.block && q.block.far > dFar) dFar = q.block.far;
      // What the visibility test decodes back with. Published before the loop
      // so a frame that draws nothing still leaves a usable scale.
      depthNear = dMin;
      depthSpan = dFar - dMin || 1;
      // How the ground actually got painted this frame. A check can ask whether
      // the drape is being resolved rather than inferring it from pixels,
      // which a hillshade and a bit of aliasing make a poor way to ask.
      let flat = 0;
      let textured = 0;
      let cells = 0;
      let patch = 0;
      for (const q of quads) {
        const haze = Math.max(0, Math.min(1, (q.depth - dMin) / dSpan));
        // Flat means exactly that: one tone, no relief shading and no haze.
        // The block is an object the mountain sits in, not more mountain.
        const [a, b, c, d] = q.pts;

        /*
         * Off the screen entirely, so there is nothing to paint.
         *
         * The canvas would clip these anyway, which is why the mesh got away
         * without a test for years: at the framing the app opens on, the whole
         * mountain is in frame and nothing is rejected. Zoomed in it is the
         * other way round — ninety-nine per cent of five thousand quads are
         * outside the viewport, and each one still cost a path built and
         * handed to the rasteriser to be thrown away.
         *
         * It became worth doing when the drape arrived, because subdivision is
         * decided on how big a quad is on screen and says nothing about
         * whether it is ON the screen: at maximum zoom two thousand off-screen
         * quads each qualified for sixteen cells, and a redraw went from 51ms
         * to 196ms painting them.
         */
        if (Math.max(a.x, b.x, c.x, d.x) < -TERRAIN_MARGIN ||
            Math.min(a.x, b.x, c.x, d.x) > width + TERRAIN_MARGIN ||
            Math.max(a.y, b.y, c.y, d.y) < -TERRAIN_MARGIN ||
            Math.min(a.y, b.y, c.y, d.y) > height + TERRAIN_MARGIN) {
          continue;
        }

        /*
         * A quad that is big on screen gets more than one colour.
         *
         * One flat colour per quad is 167 metres of ground, and at the framing
         * the app opens on that is about five pixels — finer than the blur the
         * terrain is composited through, so nothing is lost. Zoom in and the
         * same quad is eighty pixels across, and a photograph rendered as
         * eighty-pixel blocks is not a photograph. It is the one place the
         * drape visibly stops being one.
         *
         * Subdividing costs nothing at the framing where the mesh is all on
         * screen, because at that framing no quad is big enough to qualify —
         * and where quads ARE big, most of the mountain is off screen. The
         * work is bounded by the viewport rather than by the mesh: the number
         * of subdivided cells is roughly the visible area over the cell size,
         * whatever the zoom.
         *
         * Only for photography. The drawn surface's detail is a function of
         * altitude and slope, both of which this already has per quad, so
         * subdividing it would interpolate between two numbers it made up.
         */
        if (skin && q.photo) {
          /*
           * Each axis gets its own count, and that is the difference between
           * work that scales with the screen and work that does not.
           *
           * One n for both was the first version, taken from the longer side.
           * A quad seen obliquely projects long and thin — two hundred pixels
           * down the slope and six across — and squaring the long side asked
           * for two and a half thousand cells to cover twelve hundred pixels.
           * At zoom ten that was a hundred and thirty-seven thousand cells a
           * frame and 444ms, for a picture that is 236,000 pixels. Per axis it
           * is the area over SUBDIVIDE_PX squared, which is what it should
           * always have been.
           *
           * Edge lengths, not extents along x and y: the old measure took the
           * x span of one edge and the y span of the other, which is neither
           * edge and goes to zero for a quad lying along a diagonal.
           */
          const lenU = Math.max(Math.hypot(b.x - a.x, b.y - a.y),
            Math.hypot(c.x - d.x, c.y - d.y));
          const lenW = Math.max(Math.hypot(d.x - a.x, d.y - a.y),
            Math.hypot(c.x - b.x, c.y - b.y));
          const nu = Math.max(1, Math.min(SUBDIVIDE_MAX, Math.round(lenU / SUBDIVIDE_PX)));
          const nw = Math.max(1, Math.min(SUBDIVIDE_MAX, Math.round(lenW / SUBDIVIDE_PX)));
          // The biggest area of the photograph painted as one colour, which is
          // what "does the drape reach the screen" actually asks. Whether the
          // resolution comes from the mesh or from subdividing it is an
          // implementation detail; how coarse the result is, is not.
          if (mapTest) patch = Math.max(patch, Math.max(lenU / nu, lenW / nw));
          if (nu > 1 || nw > 1) {
            drawTextured(g, q, nu, nw, haze, dx, dz, minX, minZ);
            if (mapTest) { textured++; cells += nu * nw; }
            continue;
          }
        }

        const fill = q.flat
          ? q.band ? strata(g, q.flat, q.band) : `rgb(${q.flat[0]},${q.flat[1]},${q.flat[2]})`
          // A quad the drape could not reach — outside the tiles that were
          // fetched — falls back to the drawn surface rather than to a hole,
          // so the edge of the imagery is a change of texture and not a cliff.
          : q.photo
            ? photoColour(q.photo, q.shade, haze, q.shadow)
            : surfaceColour(q.shade, haze, q.grain, q.shadow);
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.lineTo(c.x, c.y);
        g.lineTo(d.x, d.y);
        g.closePath();
        g.fillStyle = fill;
        g.fill();
        g.strokeStyle = fill; // hides seams between adjacent quads
        g.lineWidth = 0.6;
        g.stroke();
        if (mapTest && !q.flat) flat++;

        if (dep && q.block) {
          // In the same order, coloured by how far away it is. Alpha stays at
          // full wherever anything was drawn, so "is this sky" is a test on
          // alpha and open sky never occludes anything.
          const t = Math.max(0, Math.min(1, (q.block.far - dMin) / depthSpan));
          // Ceil, not round. The stored depth has to be at or beyond the
          // quad's furthest corner for a line drawn on that quad to survive
          // the test; a value half a step nearer would cut the line into its
          // own ground. Erring outward costs a quantum of under-occlusion,
          // which is a fifth of a per cent of the scene.
          const n = Math.ceil(t * 255);
          const [ba, bb, bc, bd] = q.block.pts;
          dep.beginPath();
          dep.moveTo(ba.x, ba.y);
          dep.lineTo(bb.x, bb.y);
          dep.lineTo(bc.x, bc.y);
          dep.lineTo(bd.x, bd.y);
          dep.fillStyle = DEPTH_GREYS[n];
          dep.fill();
        }
      }
      if (mapTest) {
        window.__skisSurface = { flat, textured, cells, patch: Math.round(patch * 10) / 10 };
        // Which pass drew what is on screen: the stride, and the mesh it is a
        // stride of. Canvas leaves nothing to assert against, and inferring
        // "is this the fine one" from pixels is exactly the sort of guess that
        // passes when the refinement has quietly stopped happening.
        window.__skisMesh = { step, grid: GRID, quads: quads.length };
      }
    };

    /**
     * Is a projected point in front of the ground, or behind it?
     *
     * The whole test is one lookup: the buffer holds the depth of the nearest
     * surface at every pixel, so anything further away than that is inside the
     * mountain. Pixels no terrain reached are sky, and sky hides nothing.
     */
    const visible = (p) => {
      if (!depthData) return true;
      const px = Math.round((p.x - depthShiftX + TERRAIN_MARGIN) * depthScale);
      const py = Math.round((p.y - depthShiftY + TERRAIN_MARGIN) * depthScale);
      if (px < 0 || py < 0 || px >= depthData.width || py >= depthData.height) return true;
      const i = (py * depthData.width + px) * 4;
      if (depthData.data[i + 3] === 0) return true; // sky
      const ground = depthNear + (depthData.data[i] / 255) * depthSpan;
      return p.depth - depthBias <= ground;
    };

    /**
     * Split a projected line at the points where it goes behind the mountain.
     *
     * Returned as runs of consecutive visible points rather than as a mask,
     * because a stroke is drawn per run: joining across a hidden stretch would
     * put a straight line over the ridge that hid it, which is the artefact
     * this whole thing exists to remove.
     *
     * The endpoints of each run are nudged onto the midpoint of the link that
     * crosses the silhouette. Without it a line stops at whichever sample
     * happened to be last, which at OSM's spacing is up to thirty pixels short
     * of the ridge and reads as a gap rather than as terrain in the way.
     */
    const visibleRuns = (pts) => {
      const runs = [];
      let run = null;
      const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
      for (let i = 0; i < pts.length; i++) {
        if (visible(pts[i])) {
          if (!run) {
            run = [];
            if (i > 0) run.push(mid(pts[i - 1], pts[i]));
            runs.push(run);
          }
          run.push(pts[i]);
        } else if (run) {
          run.push(mid(pts[i - 1], pts[i]));
          run = null;
        }
      }
      return runs.filter((r) => r.length > 1);
    };

    // ---- lines on the surface -------------------------------------------
    const toScreen = (coords, v, cam) =>
      coords.map(([lon, lat]) => {
        const { x, z } = field.proj.project(lat, lon);
        return project(x, field.sample(x, z), z, v, cam);
      });

    const stroke = (pts, colour, lw, dash) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.setLineDash(dash || []);
      ctx.strokeStyle = colour;
      ctx.lineWidth = lw;
      ctx.lineJoin = "round";
      ctx.lineCap = dash ? "butt" : "round";
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawGraph = (v, cam) => {
      // The whole network, in the grade colours, on every screen that has a
      // map. Before this it was white dashes for everything, so an unplanned
      // mountain told you where the pistes were but not which of them you
      // could ski — and that is the first thing anyone wants off a ski map.
      //
      // Washed out on purpose. When a route is drawn over the top it has to be
      // unmistakably the route, so the network steps back further again rather
      // than competing with it. Two passes either way: a single pale line
      // disappears into the snowfields, which are most of the mountain, so a
      // white casing carries it over snow and rock both.
      const hasRoute = Boolean(propsRef.current.route?.features?.length);
      // Faded enough to sit behind the route, solid enough to still be read.
      // At 0.45 the network had effectively vanished on the navigate screen,
      // which is the one place a skier most wants to see what else is around.
      const alpha = hasRoute ? 0.62 : 1;
      const casing = hasRoute ? 0.6 : 0.9;
      let seen = 0;
      let hidden = 0;
      let clipped = 0;
      for (const feature of propsRef.current.graph.features) {
        const pts = toScreen(feature.geometry.coordinates, v, cam);
        const lift = feature.properties.kind === "lift";
        // A connector is dashed like a lift, because it is a thing you cross
        // rather than a thing you ski, but in its own neutral so the two do
        // not read as the same. Never in a grade colour: piste blue on a two
        // hundred metre skate would be telling a skier there is a run there.
        const link = feature.properties.link;
        const colour = link
          ? LINK_TINT
          : lift ? LIFT_TINT : PISTE_TINT[feature.properties.difficulty] ?? LIFT_TINT;
        const dash = lift ? [3, 4] : link ? [2, 3] : null;
        // Per visible run, not per feature. A piste that crosses a ridge is
        // two strokes with the ridge between them, and the casing has to be
        // split the same way or it draws the missing stretch in white.
        const runs = visibleRuns(pts);
        if (mapTest) {
          seen++;
          if (!runs.length) hidden++;
          else if (runs.length > 1 || runs[0].length < pts.length) clipped++;
        }
        const thin = lift || link;
        for (const seg of runs) {
          ctx.globalAlpha = casing;
          stroke(seg, "rgba(255,255,255,0.95)", thin ? 2.6 : 3.4, dash);
          ctx.globalAlpha = alpha;
          stroke(seg, colour, thin ? 1.2 : 1.9, dash);
          ctx.globalAlpha = 1;
        }
      }
      // How much of the network the mountain is standing in front of. A count
      // rather than a pixel sample, so the check for it can say what it means:
      // looking straight down at a height field nothing can be hidden, and at
      // any real pitch a great deal is.
      if (mapTest) window.__skisOcclusion = { seen, hidden, clipped };
    };

    /**
     * The name of a run, written along the run.
     *
     * A piste map names its pistes on the pistes. Ours named the junctions at
     * either end and left the thing in between anonymous, so a skier looking
     * at the mountain could see there was a red there and not that it was the
     * Bettaforca.
     *
     * Only close in, and only where the line is long enough on screen to carry
     * the word: zoomed out the whole network is thirty overlapping names and
     * the mountain disappears under them. The text is laid along the segment
     * of the line that runs most nearly horizontally, and flipped where that
     * segment points left, because a name written upside down is worse than no
     * name.
     */
    const drawRunNames = (v, cam, placed, spoken = null) => {
      const g = propsRef.current.graph;
      if (!g?.features?.length) return placed;
      /*
       * The zoom threshold is a fade, not a cliff.
       *
       * Crossing NAME_ZOOM used to return early, so every run name on the
       * mountain switched on together between two frames — "Piculin just pops
       * up out of nowhere". Below the threshold the pass still runs while
       * anything is still on screen, so the same names fade back out instead
       * of blinking off.
       */
      const zoomOk = labelZoom(v) >= NAME_ZOOM;
      if (!zoomOk && !anyFading("r:")) return placed;
      const hasRoute = Boolean(propsRef.current.route?.features?.length);
      ctx.font = "600 10px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      /*
       * Asymmetric, and that is the point.
       *
       * A name already on the mountain is tested with a box shrunk by
       * INCUMBENT_SLACK; a newcomer is tested with its full box. Without that
       * gap the declutterer oscillates: two labels contest one patch, the
       * winner is whoever the greedy order reaches first, and the order shifts
       * every few frames as the view turns — so they trade the spot back and
       * forth for as long as you keep turning. Thirteen names losing their spot
       * over thirty frames and fifteen coming back is what that looks like.
       *
       * Hysteresis is the standard cure and the cost is honest: an incumbent
       * may sit a few pixels closer to its neighbour than a newcomer would be
       * allowed to. Both still have their casings, so both still read.
       */
      const hits = (box, slack = 0) =>
        placed.some((o) =>
          box.l + slack < o.r && box.r - slack > o.l && box.t + slack < o.b && box.b - slack > o.t);
      const drawnNames = [];
      // How solid each one is, not merely whether it is there: a check that
      // counts set membership calls a fade a disappearance, which is the one
      // thing a fade is not.
      const lit = mapTest ? [] : null;
      // Why each name is not on the mountain, for the feature suite: a churn
      // number with no cause attached is not something you can act on.

      /*
       * One label per piste, on the best piece of it.
       *
       * A run is a dozen edges and every one of them carries the same name, so
       * this groups them. Taking the first edge and giving up when the word did
       * not fit on it was the first attempt, and it drew nothing: the first
       * fragment of a piste is usually a fifty metre stub off a junction.
       */
      const byName = new Map();
      for (const f of g.features) {
        if (f.properties.kind !== "run" || !f.properties.name) continue;
        /*
         * Not if another layer has already said it.
         *
         * A piste is very often named after the lift that serves it or the
         * place at its top — Sonne, Belvedere, Marchner and Arndt at Kronplatz
         * are each a lift, a junction and a run — so the same word was written
         * two and three times over. Every other layer already went through
         * `spoken`; this one did not, because it was the last to be written and
         * nobody had passed it the set.
         */
        if (spoken?.has(f.properties.name)) continue;
        const list = byName.get(f.properties.name) ?? [];
        list.push(f);
        byName.set(f.properties.name, list);
      }

      /*
       * The longest pistes first, and only as many as this zoom has room for.
       *
       * The order used to be the graph's, which is arbitrary, and incumbency
       * was bolted on to stop two names trading one patch as the view turned.
       * A fixed rank does that better, and does something incumbency could not:
       * it makes the visible set a PREFIX of an order rather than the winners
       * of a race, so zooming in only ever adds a name and never swaps one.
       * Length is the right rank because it is what makes a piste worth naming
       * — the run that defines a side of the mountain gets its name before a
       * fifty metre link off a junction does.
       *
       * The budget is what stops forty-one names stacking over one bowl.
       */
      const held = (name) => frameNow - (namedAt.get(name) ?? -Infinity) < PLACE_HOLD_MS;
      const spanOf = (features) => features.reduce((sum, f) => {
        const c = f.geometry.coordinates;
        let m = 0;
        // Degrees, with longitude squashed the way it is at these latitudes.
        // Only the ordering matters, so the constant does not have to be exact.
        for (let i = 1; i < c.length; i++) {
          m += Math.hypot((c[i][0] - c[i - 1][0]) * 0.7, c[i][1] - c[i - 1][1]);
        }
        return sum + m;
      }, 0);
      const runBudget = Math.round(
        RUN_NAME_BASE_COUNT * Math.max(1, labelZoom(v) - NAME_ZOOM + 1) ** RUN_NAME_ZOOM_POWER);
      /*
       * Ranked, and the budget counted against what actually gets written.
       *
       * Marking the first N by rank and calling the rest spare wastes the
       * budget: a piste can be top-ranked and still have nowhere to put its
       * name — off the screen, behind a ridge, no gap between two other
       * labels — and its slot went with it. Monterosa drew three names at
       * every zoom out of a budget of nine, because six of the nine longest
       * pistes could not be placed and the tenth was never asked.
       *
       * Walking in rank order and taking the first N that CAN be placed is
       * still a prefix, and still stable frame to frame, because what can be
       * placed barely changes between frames. It just does not throw slots
       * away.
       */
      const order = [...byName]
        .map(([name, features]) => ({ name, features, span: spanOf(features) }))
        /*
         * Incumbents first, then the rest by length.
         *
         * Counting the budget against what gets written recovered the coverage
         * a rank prefix threw away, and brought back the churn the prefix was
         * for: a name that loses its spot frees a slot, another takes it, and
         * when the first comes back they trade. Letting whoever is already on
         * the mountain claim their slot before any newcomer is asked settles
         * that, and it is stable because incumbency changes slowly — a name
         * holds for PLACE_HOLD_MS after it was last written.
         */
        .sort((a, b) => (held(b.name) ? 1 : 0) - (held(a.name) ? 1 : 0)
          || b.span - a.span
          || a.name.localeCompare(b.name));
      let shown = 0;

      for (const { name, features } of order) {
        const w = ctx.measureText(name).width;
        /*
         * A whole piste fragment, not a link of it.
         *
         * OSM geometry is densely sampled: the longest single link between two
         * consecutive vertices at full zoom is twenty-eight pixels, so looking
         * for a link the word fits on found nothing at any zoom. What the word
         * sits on is the chord of a fragment, and a fragment is a piece of
         * piste between two junctions, which is exactly the unit a name
         * belongs to.
         *
         * A fragment that doubles back has a short chord and a long path, and
         * a word laid across its middle would sit off the snow, so the two
         * lengths have to agree.
         */
        let best = null;
        let stayed = null;
        /*
         * Every fragment that could hold the word, not only the best of them.
         *
         * Which fragment wins used to be decided before anyone asked whether
         * the word would fit ON THE SCREEN there, so a piste whose longest
         * stretch runs off the edge got no label at all while a shorter
         * stretch of the same piste sat in the middle of the frame doing
         * nothing. Monterosa went from eighteen names to three.
         */
        const seen = [];
        const was = lastOn.get(name);
        /* eslint-disable-next-line prefer-const -- reassigned by the fade-out path below */
        let anywhere = null;
        for (const feature of features) {
          const pts = toScreen(feature.geometry.coordinates, v, cam);
          if (pts.length < 2) continue;
          const a = pts[0];
          const b = pts[pts.length - 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const chord = Math.hypot(dx, dy);
          if (chord < w + 12) continue;
          let path = 0;
          for (let i = 1; i < pts.length; i++) path += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          if (path > chord * 1.35) continue; // a horseshoe, not a stretch
          const flat = Math.abs(dy / (chord || 1));
          const score = chord * (1.35 - flat);
          const cand = { pts, a, b, dx, dy, chord, score, feature };
          if (!anywhere || score > anywhere.score) anywhere = cand;
          seen.push(cand);
          // A fragment hidden behind a ridge is not a place to write its name:
          // the word would float on bare snow with no line under it. But the
          // fragment is still where the label has to fade out FROM, so the
          // best hidden one is kept as somewhere to stand while it goes.
          if (!visible(pts[Math.floor(pts.length / 2)])) continue;
          if (!best || score > best.score) best = cand;
          /*
           * And if it is the fragment the name is already written on, that
           * settles it.
           *
           * The score depends on the chord's projected length and how flat it
           * lies, both of which change as the view turns, so two fragments of
           * one piste trade the label every few degrees. Each swap moves the
           * word to a different part of the mountain, which moves its box,
           * which changes what it collides with — collisions were the largest
           * single cause of names coming and going. Staying put while it is
           * still a legal place to be costs nothing and removes all of that.
           */
          if (was === feature) stayed = cand;
        }
        best = stayed ?? best;
        /*
         * Nowhere to write it this frame — which is usually momentary.
         *
         * A fragment's chord shortens and lengthens as the mountain turns, so
         * one that is a few pixels too short to hold the word drops out for a
         * frame or two and comes straight back. Zeroing the fade there was a
         * blink with extra steps: it was the last one left in the suite, one
         * gap in nineteen names over thirty frames.
         *
         * So the fragment it was last written on is remembered and re-projected
         * — the camera has moved, so the remembered SCREEN position would be
         * stale, but the piste has not — and the label fades out along it.
         */
        if (best ?? anywhere) lastOn.set(name, (best ?? anywhere).feature);
        if (!anywhere) {
          const pts = was ? toScreen(was.geometry.coordinates, v, cam) : null;
          if (!pts || pts.length < 2) {
            fades.set(`r:${name}`, 0);
            continue;
          }
          const a = pts[0];
          const b = pts[pts.length - 1];
          anywhere = { pts, a, b, dx: b.x - a.x, dy: b.y - a.y, feature: was };
        }
        // Behind a ridge, with the same patience a place marker gets. A word
        // grazing a silhouette for two frames while you turn is not a reason
        // to take it off the mountain.
        const behind = steady(`ro:${name}`, !best, frameNow, RUN_NAME_OCCLUSION_MS);
        best = best ?? anywhere;
        // On the line, at its middle vertex, rather than at the chord's
        // midpoint: on a piste that bends, the chord's middle is off the snow.
        const pts = best.pts;
        let angle = Math.atan2(best.dy, best.dx);
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;

        /*
         * The word's footprint, followed along the word.
         *
         * Two wrong answers were tried first. `|cos| * w` wide by sixteen tall
         * is the word's HORIZONTAL extent and nothing else: a piste runs down
         * the screen, so most run names sit near vertical, and at eighty degrees
         * that reserved fourteen pixels by sixteen for a word sixty pixels long.
         * They were never in each other's way and every one of them drew —
         * forty-one piste names stacked over one bowl, which is what "too many
         * labels" looks like.
         *
         * The exact axis-aligned bounds of the rotated rectangle is the other
         * wrong answer, in the other direction. At forty-five degrees a sixty
         * pixel word gets a fifty-two pixel square, three quarters of which is
         * the two empty triangles either side of the ink. Every diagonal name
         * then blocked every other one and the tier went to nothing.
         *
         * So the word is treated as what it is — a line of glyphs — and tracked
         * with a few small squares along its own baseline. That follows a
         * diagonal closely, claims nothing in the corners, and is still just
         * rectangles for a declutterer that only knows about rectangles.
         */
        const TALL = 13;
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);
        const steps = Math.max(2, Math.min(6, Math.round(w / TALL)));
        const boxesAt = (p) => {
          const out = [];
          for (let i = 0; i <= steps; i++) {
            const t = (i / steps - 0.5) * w;
            const bx = p.x + ux * t;
            const by = p.y + uy * t;
            out.push({ l: bx - TALL / 2, r: bx + TALL / 2, t: by - TALL / 2, b: by + TALL / 2 });
          }
          return out;
        };

        /*
         * If the middle is taken, slide along the piste rather than give up.
         *
         * A run is hundreds of metres of line and the word needs forty pixels
         * of it, so there is almost always somewhere else on the same piste
         * that is free. Yielding the whole label instead was the largest cause
         * of names coming and going as the view turned: the place markers and
         * the route pins are placed first and always win, so every marker
         * drifting across a piste took that piste's name off the mountain and
         * put it back a moment later.
         *
         * Middle first, because that is where a name reads best, then out
         * towards the ends in steps.
         */
        const along = [0.5, 0.38, 0.62, 0.28, 0.72];
        let at = null;
        let box = null;
        const slack = held(name) ? INCUMBENT_SLACK : 0;
        /*
         * And it has to be all on the screen.
         *
         * A place name is clamped inside the frame — only the words move, the
         * dot stays put — but a run name cannot be: it is written along the
         * piste, so sliding it sideways would take it off the snow. The
         * position is rejected instead and the next one along the run tried,
         * which is a move the piste allows.
         *
         * Without this, every run whose middle fell near an edge was sliced by
         * it. Kronplatz showed "Arndt" with the A cut off, "interberg" for
         * Hinterberg and "Sylvest" for Sylvester in one frame: a name cut by
         * the screen is not a name, and it reads as a rendering fault rather
         * than as a label that did not fit.
         */
        const onScreen = (bs) => bs.every((b) =>
          b.l >= 0 && b.t >= 0 && b.r <= width && b.b <= height);
        /*
         * Positions taken from the part of the run you can see.
         *
         * Fractions of the whole fragment were the first attempt and they fail
         * at close range: zoom in far enough and a piste is several screens
         * long, so its middle — and every position measured from its ends — is
         * off the edge. Run names went from fifteen to none.
         *
         * So the vertices whose label would be wholly on screen are collected
         * first, and the middle of THAT is where the word goes. A word reads
         * best in the middle of the stretch you can see, which is not the
         * middle of the piste.
         */
        /*
         * Sampled along the line, not at its vertices.
         *
         * Vertices were the first attempt and they vanish at close range: OSM
         * samples a piste every twenty or thirty metres, which at this zoom is
         * hundreds of pixels, so a run crossing the screen can have no vertex
         * ON the screen at all. Fifteen names at Kronplatz reported "no room
         * anywhere along it" while their pistes ran right through the middle
         * of the frame.
         *
         * Walking the polyline at a fixed pixel spacing finds a position
         * wherever the line is visible, however far apart the data is.
         */
        /*
         * Somewhere on this piste, on the screen, with nothing already there.
         *
         * Tried over every fragment in score order rather than only the best
         * one, because the best-scoring stretch is often the one running off
         * the edge. Within a fragment the line is walked at a fixed pixel
         * spacing rather than vertex by vertex: OSM samples a piste every
         * twenty or thirty metres, which at close range is hundreds of pixels,
         * so a run crossing the whole frame can have no vertex on the screen
         * at all.
         *
         * Outwards from the middle of the visible stretch, so the first free
         * spot is the most central one — a word reads best in the middle of
         * the piste you can see, which is not the middle of the piste.
         */
        const place = (line) => {
          const found = [];
          for (let i = 1; i < line.length; i++) {
            const a = line[i - 1];
            const b = line[i];
            const span = Math.hypot(b.x - a.x, b.y - a.y);
            const steps = Math.max(1, Math.min(60, Math.round(span / LABEL_STEP_PX)));
            for (let k = 0; k <= steps; k++) {
              const t = k / steps;
              const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
              const boxes = boxesAt(p);
              if (onScreen(boxes)) found.push({ p, boxes, at: found.length });
            }
          }
          const mid = (found.length - 1) / 2;
          // The index is carried on each entry: `indexOf` inside a comparator
          // reads the half-sorted order and orders by nothing at all.
          found.sort((x, y) => Math.abs(x.at - mid) - Math.abs(y.at - mid));
          return found.find((f) => !f.boxes.some((b) => hits(b, slack))) ?? null;
        };
        let got = place(pts);
        if (!got) {
          for (const cand of [...seen].sort((x, y) => y.score - x.score)) {
            if (cand === best) continue;
            got = place(cand.pts);
            if (got) break;
          }
        }
        if (got) { at = got.p; box = got.boxes; }
        // Nothing free anywhere along it: fade out from the middle, which is
        // where it was.
        const mid = pts[Math.floor(pts.length / 2)];
        const room = Boolean(at);
        at = at ?? mid;
        box = box ?? boxesAt(mid);
        const mx = at.x;
        const my = at.y;
        /*
         * Losing its place is given the same patience as going behind a ridge.
         *
         * Requiring the whole word on the screen stopped names being sliced by
         * the edge, and cost stability: a name near an edge now flips off and
         * on as the view turns, where before it stayed and was cut. So an
         * unplaceable name holds its last position for a moment before it
         * goes — invisible while it is off the frame, and the difference
         * between a name that blinks as you turn and one that does not.
         */
        const cramped = steady(`rr:${name}`, !room, frameNow, RUN_NAME_OCCLUSION_MS);
        const keep = zoomOk && !behind && !cramped && shown < runBudget;
        if (keep) shown++;
        const solid = fadeOf(`r:${name}`, keep, frameDt);
        // Reserved only while it is wanted. A label on its way out stops
        // holding the ground it is leaving, so the one that displaced it can
        // start arriving in the same quarter second rather than after it.
        if (keep) placed.push(...box);
        if (solid <= 0.02) continue;

        ctx.save();
        ctx.globalAlpha = solid;
        ctx.translate(mx, my);
        ctx.rotate(angle);
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = `rgba(255,255,255,${hasRoute ? 0.8 : 0.94})`;
        ctx.strokeText(name, 0, 0);
        ctx.fillStyle = hasRoute ? "rgba(11,26,36,0.6)" : "rgba(11,26,36,0.82)";
        ctx.fillText(name, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
        lit?.push({ name, alpha: Math.round(solid * 100) / 100 });
        if (keep) { drawnNames.push(name); namedAt.set(name, frameNow); }
      }
      ctx.textBaseline = "alphabetic";
      if (mapTest) {
        window.__skisRunNames = drawnNames;
        window.__skisRunLit = lit;
      }
      return placed;
    };

    const drawRoute = (v, cam) => {
      const r = propsRef.current.route;
      if (!r?.features?.length) return;
      const done = propsRef.current.camera?.doneThrough ?? -1;
      // Scale the route line with the framing so it stays a first-class object
      // when zoomed out and does not become a stripe when zoomed in.
      const k = Math.max(0.62, Math.min(1.5, cam.f / (field.span * 0.9)));
      // Split once, drawn four times. The route is four concentric strokes and
      // every one of them has to break at the same place, or the casing draws
      // the stretch the ridge is hiding.
      /*
       * Not depth tested while navigating, and that is deliberate.
       *
       * A mesh cell is a fixed piece of ground — 167 metres at Monterosa —
       * and at NAV_ACROSS the camera is looking along the surface at a
       * grazing angle, so the facet you are standing on projects over most of
       * the screen and everything beyond its far edge is judged to be behind
       * the mountain. Measured: on one leg all fifteen of its points were in
       * frame and NONE of them were drawn. The height field simply does not
       * have the resolution to answer "can I see the piste under my own skis"
       * and the honest thing is to stop asking it. The network around you
       * keeps its occlusion, so the mountain still reads as solid; the line
       * you are following is the one thing that must never be hidden.
       */
      const flat = isFollowing(propsRef.current);
      const lines = r.features.map((f) => {
        const pts = toScreen(f.geometry.coordinates, v, cam);
        return {
          props: f.properties,
          runs: flat ? (pts.length > 1 ? [pts] : []) : visibleRuns(pts),
        };
      });
      /*
       * How much of the route actually got drawn.
       *
       * There is no other way to ask. The route is four concentric strokes on
       * a canvas, so a check cannot query it, and "is the route on screen"
       * answered by projecting its coordinates says nothing about whether the
       * depth test kept them: on the navigate screen every point of the leg
       * was in frame and none of it was being painted.
       */
      if (mapTest) {
        window.__skisRouteDrawn = lines.map((l) => ({
          i: l.props.i,
          leg: l.props.leg,
          kind: l.props.kind,
          runs: l.runs.length,
          pts: l.runs.reduce((n, seg) => n + seg.length, 0),
        }));
      }
      const pass = (colour, lw, dash) => {
        for (const l of lines) for (const seg of l.runs) stroke(seg, colour(l), lw, dash);
      };
      // `leg`, not `i`. `done` is a leg index and there are fewer legs than
      // segments, so comparing it against the segment index left part of the
      // stretch you had just skied undimmed and dimmed part of the one ahead.
      //
      // And navigating, the far end of the day steps back too: see
      // NAV_LOOKAHEAD. Elsewhere the whole route is the subject and all of it
      // is drawn at full weight.
      const ahead = flat ? done + NAV_LOOKAHEAD : Infinity;
      const dimmed = (l) => l.props.leg < done || l.props.leg > ahead;
      // Casing first, as one continuous object: the whole day reads at a glance.
      pass((l) => (dimmed(l) ? "rgba(11,26,36,0.12)" : "rgba(11,26,36,0.28)"), 12 * k);
      pass((l) => (dimmed(l) ? DIM_ACCENT : ACCENT_LINE), 9.5 * k);
      pass((l) => (dimmed(l) ? "rgba(255,255,255,0.3)" : "#ffffff"), 7 * k);
      for (const l of lines) {
        ctx.globalAlpha = dimmed(l) ? 0.35 : 1;
        const lift = l.props.kind === "lift";
        const link = l.props.link;
        const colour = link ? LINK_COLOUR : lift ? "#22323f" : PISTE_COLOUR[l.props.difficulty] || "#7d95a5";
        const dash = lift ? [5, 4] : link ? [3, 4] : null;
        for (const seg of l.runs) stroke(seg, colour, (lift || link ? 2.4 : 3.4) * k, dash);
        ctx.globalAlpha = 1;
      }
    };

    /**
     * The names of the places on the mountain, always on.
     *
     * A route that says "Champoluc" means nothing against an unlabelled ridge,
     * and the whole point of the mid-day case is knowing which side of the
     * mountain you are looking at.
     *
     * Always on, but not all at once: thirteen labels on a phone at rest
     * overlap into a grey smear, which shows fewer names than showing some of
     * them. So they are placed in order of how much they matter — the valley
     * bases you drive to first, then the mountain huts, then junctions — and
     * one that would collide with a name already down is dropped rather than
     * drawn over. Zoom in and the ones that lost the room come back.
     */
    /**
     * The chrome is DOM drawn over this canvas, so anything the declutterer
     * does not know about wins the pixels: "Champoluc" rendered half under the
     * zoom buttons. Measured rather than guessed at — the first attempt
     * reserved a box where the controls were assumed to be and the compass sat
     * forty pixels above it. The canvas fills the viewport, so client rects are
     * already in the coordinates used here.
     */
    const chromeBoxes = () => {
      const boxes = [];
      for (const sel of CHROME) {
        const node = typeof document === "undefined" ? null : document.querySelector(sel);
        if (!node) continue;
        const cs = getComputedStyle(node);
        if (cs.opacity === "0" || cs.visibility === "hidden") continue;
        const r = node.getBoundingClientRect();
        if (r.width && r.height) boxes.push({ l: r.left - 4, r: r.right + 4, t: r.top - 4, b: r.bottom + 4 });
      }
      return boxes;
    };

    const drawPlaces = (v, cam, placed, { only = null, spoken = new Set() } = {}) => {
      const list = Object.entries(propsRef.current.nodes ?? {})
        .filter(([, n]) => (only === "bases" ? n.base : only === "rest" ? !n.base : true));
      if (!list.length) return placed;
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      // A base is where a car or a bus is, which is what a lost skier needs
      // first. A rifugio is somewhere you can stand still. Everything else is
      // a junction, useful but not urgent.
      /*
       * How much a place matters, as a number that never changes.
       *
       * This is the whole of the fix for names moving about as you zoom. What
       * used to decide which names were shown was the collision race: every
       * named node competed at every zoom, and as the projection changed a
       * different subset won, so labels swapped places with each other for no
       * reason a person could see.
       *
       * A rank fixes that because it lets the visible set be a PREFIX of a
       * fixed order rather than the winners of a race. Zooming in only ever
       * lengthens the prefix, so a name that is up stays up; zooming out only
       * ever shortens it. Nothing swaps. Collision goes back to being what it
       * should be — a way of dropping the leftovers — instead of deciding what
       * matters.
       *
       * The order: the valley bases you drive to, then the places you can eat
       * at, then everything else by how many ways meet there. A junction where
       * five pistes part company is worth naming; a bend in one piste is not,
       * and altitude only breaks the ties.
       */
      const byRank = (a, b) =>
        (a.n.base ? 0 : a.n.rifugio ? 1 : 2) - (b.n.base ? 0 : b.n.rifugio ? 1 : 2)
        || (b.n.alt ?? 0) - (a.n.alt ?? 0)
        || a.n.name.localeCompare(b.n.name);

      /*
       * How many of them this zoom has room for.
       *
       * Deliberately flat. What a skier needs far out is which side of the
       * mountain they are looking at, which is four or five names; what they
       * need close in is the junction in front of them, and by then most of the
       * resort is off the screen anyway so the same budget shows a much larger
       * share of what is left. A steep curve buys nothing and costs legibility
       * at exactly the zoom people spend most of their time at.
       */
      const placeBudget = Math.round(PLACE_BASE_COUNT * labelZoom(v) ** PLACE_ZOOM_POWER);

      // The chrome is DOM drawn over this canvas, so anything the declutterer
      // does not know about wins the pixels: "Champoluc" rendered half under
      // the zoom buttons. Measured rather than guessed at — the first attempt
      // reserved a box where the controls were assumed to be and the compass
      // sat forty pixels above it. The canvas fills the viewport, so client
      // rects are already in the coordinates used here.

      /**
       * Two kinds of label real data produced that should never be drawn.
       *
       * A generated name. The graph gives an unnamed junction "Point 74", and
       * a mountain labelled Point 37, Point 53, Point 74, Point 75 tells a
       * skier nothing while burying the names that mean something. If OSM has
       * no name for a place, this has nothing to say about it.
       *
       * A repeat. One place is often several nodes — a lift station, the top
       * of the piste beside it, a junction ten metres on — so "Passo dei
       * Salati" and "Gabiet" each came out twice, side by side, which reads as
       * a bug rather than as detail. The best-ranked one keeps the name.
       *
       * `spoken` is the frame's, not this call's. It used to be local, and
       * this runs twice a frame — once for the valley bases and once for
       * everything else — so a name that was a base at one end and a junction
       * at the other got through both times. Latemar drew "Gardonè" twice
       * twenty pixels apart and "Monte Agnello" twice, Kronplatz drew "Miara"
       * twice. It arrives seeded with the pin names and the huts add theirs to
       * it as they are drawn, so one name is written on the mountain once
       * whichever layer says it.
       */
      // Labels come from the graph's own `named` flag rather than from
      // guessing at the text: an unnamed junction now carries a readable
      // description ("Above Gabiet", "Olen junction") so the plan form can
      // offer it, and none of those belong on the mountain as a label.
      const candidates = list
        .filter(([, n]) => n.named !== false)
        .map(([key, n]) => ({ key, n }))
        // Ranked before the dedupe, so the best-ranked node keeps a shared name.
        .sort(byRank)
        /*
         * Keyed by the node, not by the word it says.
         *
         * Two junctions at Kronplatz are both called "Olang I - Valdaora I",
         * and keying the fade on the name gave them one fade between them: the
         * one that draws raised it a step each frame and the duplicate reset it
         * to zero, so it sat at exactly one step — six per cent — forever. Seven
         * names did that, which is the half-transparent copies on the map, and
         * the renderer never rested because a fade was always in flight.
         *
         * A name another layer is already writing is not written again here.
         *
         * Dropped rather than faded out. Fading it was tried and was worse: a
         * duplicate is a standing condition, not a hand-off — Kronplatz has two
         * separate junctions both called "Olang I - Valdaora I" — so there is
         * no moment at which the second one is on its way anywhere. Drawing it
         * at a decaying alpha left a half-transparent copy of a dozen names
         * sitting under the real ones, and where ownership flipped frame to
         * frame the copy never reached zero and simply stalled there.
         *
         * The pop that change was meant to fix is fixed at its source instead:
         * the hut layer now claims its name when it comes on screen rather than
         * when it wins a slot, so ownership stops moving. The fade is reset so
         * that if a name genuinely is handed back — the hut leaves the frame —
         * it arrives from nothing rather than at whatever it last was.
         */
        .map((c) => {
          const taken = spoken.has(c.n.name);
          if (!taken) spoken.add(c.n.name);
          return { ...c, taken };
        })
        .map((c) => {
          const { x, z } = field.proj.project(c.n.lat, c.n.lon);
          return { ...c, s: project(x, field.sample(x, z), z, v, cam) };
        })
        /*
         * The screen edge is a fade too, with a band to fade in.
         *
         * Culling at sixty pixels made a label leaving the frame vanish at full
         * strength — invisible in itself, since it is off the screen, except
         * that it comes back the same way and the last one out is the first one
         * in. Turning the mountain sweeps names across both edges constantly,
         * and it was the largest remaining pop on the map after the fades went
         * in everywhere else.
         *
         * So the cull moves well outside the frame and leaving the frame merely
         * stops the label being wanted. It fades out over the band, off canvas,
         * where nothing is drawn that anyone can see.
         */
        .filter(({ key, s }) => {
          const near = s.x > -EDGE_BAND && s.x < width + EDGE_BAND
            && s.y > -EDGE_BAND && s.y < height + EDGE_BAND;
          // Far enough out to be genuinely gone: no position to fade at, so the
          // fade is reset and it arrives from nothing next time.
          if (!near) fades.set(`l:${key}`, 0);
          return near;
        })
        .map((c) => ({
          ...c,
          onScreen: c.s.x > -30 && c.s.x < width + 30 && c.s.y > -20 && c.s.y < height + 20,
        }))
        /*
         * Same rule as the pistes, with one exception.
         *
         * A junction name floating over a ridge it is not on is the most
         * misleading thing on the map: it reads as a place up there. So a
         * junction behind the mountain is behind the mountain.
         *
         * A base is not. Stafal, Champoluc and Alagna sit in deep valleys at
         * the edges of the massif, so at any real pitch at least one of them
         * is behind it — and the first version of this rule took all three
         * off the map at once. "Your car is at Champoluc" is the problem this
         * app exists to solve, and it cannot be solved by a map that will not
         * say where Champoluc is. Physical honesty is worth a lot here and it
         * is not worth that.
         */
        /*
         * Kept when it is behind the mountain, and faded out there instead.
         *
         * Dropping it from the list took the label off between two frames, and
         * a junction grazes a silhouette constantly as the view turns: "Punta
         * Jolanda doesn't have the disappearing timed out". So the test becomes
         * a flag the fade reads, with the same patience a place marker gets —
         * a name is only really behind the mountain once it has been behind it
         * for a while.
         */
        .map((c) => {
          const hidden = steady(`lo:${c.key}`, !visible(c.s), frameNow, RUN_NAME_OCCLUSION_MS);
          /*
           * A base behind the mountain is dimmed, not dropped and not ignored.
           *
           * Exempting bases outright was the fix for taking all three off the
           * map at once, and it bought a different fault: Stafal and Champoluc
           * sit in deep valleys, so from the opening view they are usually
           * behind the massif, and their names were painted at full strength
           * onto whatever ridge happened to be in front of them. Reported as
           * the names being "on the mountain, at a certain point where it is
           * not", which is exactly right — the label claimed a position on a
           * slope kilometres from the village.
           *
           * Neither hiding it nor asserting it is the answer. Half strength
           * says what is true: the village is over there, and there is
           * mountain between you and it. It stays findable, which is the whole
           * reason for the exemption, and stops pretending to be somewhere it
           * is not, which is what the exemption cost.
           */
          return { ...c, behind: c.n.base ? false : hidden, occluded: hidden };
        })
        /*
         * Only the ones this zoom has room for, and always the same ones.
         *
         * The prefix of the ranking, not the winners of the collision race.
         * This tier had no budget at all — every named node competed at every
         * zoom — which is both why the mountain was buried in names and why
         * they moved about: two labels contesting one patch swapped it as the
         * projection shifted, and there was no order to appeal to.
         */
        /*
         * Past the budget it fades out; it does not stop being drawn.
         *
         * Dropping it from the list here was the third time this exact mistake
         * has been made in this file: a label that never reaches `fadeOf`
         * freezes at whatever it last was, so the budget edge became a pop.
         * The hut tier has carried a comment saying so for weeks.
         */
        ;

      /*
       * No encroachment allowance here, unlike the run names.
       *
       * A run name has one place to go — the middle of its piste — so it needed
       * hysteresis to stop two of them trading that one patch. A place name has
       * four: under the dot, over it, and out to either side. That is the
       * stronger anti-churn mechanism and it costs nothing, where the slack
       * costs a few pixels of overlap — and these names are the ones the map
       * must never let touch, because two of them are often the same place
       * under two spellings sitting on top of each other.
       */
      const hits = (box) =>
        placed.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t);

      const drawn = [];
      const lit = mapTest ? [] : null;
      // Counted against what gets written, not against rank position: a
      // top-ranked name with nowhere to go would otherwise take its slot with
      // it. Same reasoning as the run names above.
      let up = 0;
      for (const { key, n, s, behind, occluded, onScreen, taken } of candidates) {
        const w = ctx.measureText(n.name).width;
        // Four places to put it, in order of preference. Dropping a name on the
        // first collision cost Champoluc every time, because the zoom buttons
        // sit exactly over it in the default view — and a base you might be
        // walking to is the last name that should go. Under, over, then out to
        // either side; only a point boxed in on all four sides loses its label.
        const spots = [
          { x: s.x, y: s.y + 15 },
          { x: s.x, y: s.y - 9 },
          { x: s.x - w / 2 - 10, y: s.y + 4 },
          { x: s.x + w / 2 + 10, y: s.y + 4 },
        ];
        let box = null;
        let tx = 0;
        let y = 0;
        for (const spot of spots) {
          // Pulled inside the frame rather than allowed to run off it. A name
          // sliced by the screen edge is not a name.
          const cx = Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, spot.x));
          const candidate = { l: cx - w / 2 - 3, r: cx + w / 2 + 3, t: spot.y - 12, b: spot.y + 4 };
          if (hits(candidate)) continue;
          box = candidate;
          tx = cx;
          y = spot.y;
          break;
        }
        /*
         * Boxed in on all four sides, or behind the mountain: fade out where it
         * was rather than stop being drawn.
         *
         * The preferred spot is the position to leave from. It may be under
         * something for the quarter second it takes to go, which is a far
         * smaller cost than the label blinking — and it is on its way out, so
         * it is the fainter of the two the whole time.
         */
        const room = Boolean(box);
        if (!box) {
          const cx = Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, spots[0].x));
          box = { l: cx - w / 2 - 3, r: cx + w / 2 + 3, t: spots[0].y - 12, b: spots[0].y + 4 };
          tx = cx;
          y = spots[0].y;
        }
        const keep = room && !behind && onScreen && !taken && up < placeBudget;
        if (keep) up++;
        const solid = fadeOf(`l:${key}`, keep, frameDt);
        /*
         * The box is reserved on the decision, not on the fade.
         *
         * These two lines were the other way round, so a label that was wanted
         * but still faint returned before it claimed its space. The next name
         * in the list took that space, which made the first one unwanted on the
         * following frame, which faded it further — and the pair settled at an
         * equilibrium instead of resolving. Seven names at Kronplatz sat at six
         * per cent opacity indefinitely, which is what a stalled ghost is, and
         * the renderer never stopped repainting because a fade was always in
         * flight.
         */
        if (keep) placed.push(box);
        if (solid <= 0.02) continue;
        // See `occluded` above: a base you cannot actually see from here reads
        // at half strength, so it locates the village without claiming the
        // ridge in front of it.
        ctx.globalAlpha = solid * (occluded ? BEHIND_DIM : 1);

        ctx.beginPath();
        ctx.arc(s.x, s.y, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(11,26,36,0.55)";
        ctx.stroke();

        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.strokeText(n.name, tx, y);
        ctx.fillStyle = n.base ? "#0b1a24" : "rgba(11,26,36,0.7)";
        ctx.fillText(n.name, tx, y);
        ctx.globalAlpha = 1;
        lit?.push({ name: n.name, alpha: Math.round(solid * 100) / 100 });
        if (keep) drawn.push({ name: n.name, ...box });
      }
      // Canvas text leaves no DOM to assert against, so the placement is
      // published for the feature suite. Same gate as the camera hooks.
      if (mapTest) {
        // Two passes now, so this accumulates rather than replaces: the bases
        // are drawn before the hut markers and everything else after them.
        window.__skisLabels = only === "rest" ? [...(window.__skisLabels ?? []), ...drawn] : drawn;
        window.__skisLabelLit = only === "rest" ? [...(window.__skisLabelLit ?? []), ...lit] : lit;
      }
      return placed;
    };

    /**
     * Where to eat, and where to hire skis.
     *
     * Most of what a skier reads off a piste map is not junctions: it is the
     * huts. This app had every lift and every run and not one restaurant. They
     * are drawn after the place names and share the same collision list, so a
     * hut never sits on top of a station, and the marker is a rounded square
     * rather than the circle a place uses — at eleven pixels a glyph is a
     * smudge, but a different shape reads at a glance.
     *
     * Names only when there is room and the camera is close enough for the
     * mountain to have any: at rest a resort has twenty-odd of these and
     * twenty-odd labels is a grey smear over the terrain.
     */
    /**
     * A map pin with a glyph in it, rather than a coloured blob.
     *
     * A square meant food and a circle meant hire, which is a legend nobody
     * has. These are the shapes every map uses for the same things. Thirteen
     * pixels across with a white disc behind them, because a glyph drawn
     * straight onto snow disappears into it.
     *
     * Three of them, and there were five. A cup for a bar, a roof for a hut
     * and cutlery for a restaurant are three drawings of one fact — there is
     * food here — and at thirteen pixels the difference between them is not
     * legible anyway, so what they actually produced was a mountain covered in
     * shapes a person had to squint at and then still tap to identify. The
     * card says what it is in words, which is where a distinction that fine
     * belongs. A rifugio on the mountain and a restaurant in the village get
     * the same mark and different sentences.
     *
     * What stays separate is what is genuinely a different errand: leaving the
     * car, and hiring skis. Those are things you do once, at the bottom, on
     * purpose, and mistaking one for lunch wastes a chairlift.
     */
    const pin = (x, y, r, kind) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.fill();
      ctx.lineWidth = 1.7;
      // Drive-to places share a blue; ski-to places share the warm brown. The
      // ring is the first thing you read at eleven pixels, so it carries the
      // distinction the glyph then names.
      const drives = kind === "rental" || kind === "parking";
      ctx.strokeStyle = drives ? "#2c8fb5" : "#c07a1e";
      ctx.stroke();

      ctx.save();
      ctx.translate(x, y);
      ctx.lineWidth = 1.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = drives ? "#1d6f8f" : "#8a5510";
      ctx.beginPath();
      if (kind === "parking") {
        // A P. Every car park sign on earth, and the one glyph here that does
        // not have to be learned.
        ctx.moveTo(-1.5, 3.0); ctx.lineTo(-1.5, -3.0); ctx.lineTo(0.8, -3.0);
        ctx.quadraticCurveTo(2.4, -3.0, 2.4, -1.3);
        ctx.quadraticCurveTo(2.4, 0.4, 0.8, 0.4);
        ctx.lineTo(-1.5, 0.4);
      } else if (kind === "rental") {
        // Two skis, tips up.
        ctx.moveTo(-2.1, 2.6); ctx.lineTo(-1.1, -2.8);
        ctx.moveTo(1.1, 2.6); ctx.lineTo(2.1, -2.8);
        ctx.moveTo(-2.9, 2.6); ctx.lineTo(2.9, 2.6);
      } else {
        // Fork and knife: somewhere to eat, whatever OSM called it.
        ctx.moveTo(-1.9, -2.9); ctx.lineTo(-1.9, -0.6);
        ctx.moveTo(-0.6, -2.9); ctx.lineTo(-0.6, -0.6);
        ctx.moveTo(-1.25, -0.6); ctx.lineTo(-1.25, 2.9);
        ctx.moveTo(1.7, 2.9); ctx.lineTo(1.7, -0.4);
        ctx.quadraticCurveTo(1.7, -2.9, 0.7, -2.9);
        ctx.quadraticCurveTo(0.7, -0.4, 1.7, -0.4);
      }
      ctx.stroke();
      ctx.restore();
    };

    // Which places the markers pass put down, so the names pass can name those
    // and only those. Two passes because a name reserves six times the room a
    // marker does, and running them together cost the bases their labels.
    const hutsDrawn = new Set();

    /*
     * How solid each place is, easing toward where it belongs.
     *
     * Everything that decides whether a marker is drawn is a hard yes or no —
     * is it behind the ridge, does its box collide with one already down, is it
     * inside this zoom's budget — and every one of them flips on a threshold.
     * Turn the mountain a degree and a marker crosses a silhouette; that frees
     * a box, which lets a second marker in, which pushes a third out. Two
     * screenshots a frame apart had visibly different mountains.
     *
     * The decisions stay hard, because softening them would mean drawing
     * markers through a ridge. What softens is the drawing: a place eases in
     * and out over a fifth of a second, so a marker that flickers for two
     * frames barely changes and one that is genuinely gone leaves properly.
     * A pop is a thing the eye is built to catch; a fade of this length is not.
     */
    /*
     * How many frames running a place has been on the wrong side of the
     * occlusion test.
     *
     * This is where the flicker starts. Everything downstream is a hard
     * threshold on a shared resource — the collision boxes — so one marker
     * winking out frees room, a second takes it, a third loses what it had.
     * One genuine change becomes three, every frame, and the mountain
     * shimmers.
     *
     * Reserving an incumbent's box first was the first fix and it works, but
     * it makes what is shown depend on history: a low place picked up during a
     * turn keeps its slot against a higher one afterwards, and the mountain
     * slowly fills with village bars. Two of the five showing were below the
     * median altitude after one slow turn.
     *
     * So the hysteresis goes where the instability is instead. A place has to
     * fail the depth test for several frames running before it is dropped,
     * which absorbs a marker grazing a silhouette without touching the order —
     * the ranking stays strictly by altitude, and the cascade has nothing to
     * start from.
     */
    /**
     * The piste fragment each run name was last written on.
     *
     * Cross-frame on purpose: it is what a name fades out along on a frame
     * where nothing is long enough to hold it. Keyed by name, and the whole
     * effect is rebuilt when the resort changes, so it cannot outlive the
     * mountain it refers to.
     */
    const lastOn = new Map();
    /** When each run name was last written, so an incumbent keeps its spot. */
    const namedAt = new Map();

    /** When each place was last drawn, and how long it has been hidden. */
    const shownAt = new Map();
    const hiddenSince = new Map();
    /** How many places the last frame put on the mountain. */
    let lastShownCount = 0;
    const steady = (key, hidden, now, hold = OCCLUSION_HOLD_MS) => {
      if (!hidden) { hiddenSince.delete(key); return false; }
      const since = hiddenSince.get(key);
      if (since === undefined) { hiddenSince.set(key, now); return false; }
      return now - since >= hold;
    };

    const fades = new Map();
    const fadeOf = (key, want, dt) => {
      /*
       * Everything starts at nothing and fades up, including the first one.
       *
       * A key seen for the first time used to start at full if it was wanted,
       * so a place arriving popped to solid between two frames and only ever
       * faded on the way OUT. Half a fade is not a fade — "they should appear
       * gradually" is the whole request — and it made the first appearance the
       * most abrupt thing on the map. Starting at zero also fades the opening
       * set in over a quarter of a second, which is the map arriving rather
       * than the map being there.
       */
      const from = fades.get(key) ?? 0;
      const step = Math.min(1, dt / (want ? PLACE_FADE_MS : PLACE_FADE_OUT_MS));
      const to = from + ((want ? 1 : 0) - from) * step;
      fades.set(key, to);
      // Anything moving needs another frame to finish moving in.
      if (Math.abs(to - (want ? 1 : 0)) > 0.01) fadingPlaces = true;
      return to;
    };
    let fadingPlaces = false;

    /**
     * Is anything in this tier still on its way out?
     *
     * A pass that returns early when its tier is switched off would freeze
     * every fade in that tier at whatever it was, which is a pop with extra
     * steps. So the early return asks this first, and keeps running the pass
     * for the quarter second it takes the last label to go.
     */
    const anyFading = (prefix) => {
      for (const [key, value] of fades) if (value > 0.02 && key.startsWith(prefix)) return true;
      return false;
    };

    const drawHuts = (v, cam, placed, { markersOnly = false, labelsOnly = false, spoken = null } = {}) => {
      const all = propsRef.current.places ?? [];
      if (!all.length) return placed;
      /*
       * Named at the same zoom the runs are, and marked from further out.
       *
       * A fade, not a cliff — the same fix the run names needed. Returning
       * early below the threshold switched every hut name off between two
       * frames and froze its fade at full, so the next crossing popped too.
       * Below the threshold the pass keeps running while anything is still on
       * screen, and stops once the last one has gone.
       */
      // Their own gate, a step past the markers. See HUT_NAME_ZOOM.
      const namesOn = labelZoom(v) >= HUT_NAME_ZOOM;
      if (labelsOnly && !namesOn && !anyFading("n:")) return placed;
      const named = [];
      const nameLit = mapTest ? [] : null;
      /*
       * How many places are worth showing, and which ones, by how close you
       * are.
       *
       * Every one of them, at every zoom, was the first version and it is too
       * many: thirty-seven at Kronplatz, so the mountain viewed from a
       * distance was a rash of identical orange discs over the terrain a
       * skier was trying to read. A marker that far out cannot tell you
       * anything useful anyway — you are not choosing lunch from ten
       * kilometres up — so it is decoration with a cost.
       *
       * Ranked by altitude, highest first, and that does the work with no
       * table of kinds behind it. The high places are the landmarks: a summit
       * restaurant is visible from most of the resort and is a real planning
       * question ("can I eat at the top?"). The ski hire is at the bases,
       * which are the lowest points, so it appears as you zoom into a base —
       * which is exactly when it is the thing you want and never before.
       * That is also how a paper piste map does it.
       *
       * The declutterer still runs on top of this. It answers a different
       * question — "does this name physically fit" — and answering only that
       * one is what left the far view crowded, because at that distance the
       * markers are small and a great many of them fit.
       */
      /*
       * Counted up from the gate, not from zero zoom.
       *
       * `HUT_BASE_COUNT * zoom ** power` has no floor: at the whole-resort
       * view it still asked for five. Measuring from HUT_ZOOM instead means
       * the tier is empty until the runs are named and then grows from there,
       * which is the hierarchy rather than a side effect of a curve.
       */
      const over = labelZoom(v) - HUT_ZOOM;
      const wanted = over < 0
        ? 0
        : Math.round(HUT_BASE_COUNT * (over + 1) ** HUT_ZOOM_POWER);
      /*
       * With a dead band, so a hair of zoom does not add and remove one.
       *
       * The budget is a continuous function of zoom rounded to a whole number.
       * Nudge the camera and it steps by one; the place at the bottom of the
       * ranking goes, and comes back, and goes. The band lets what is already
       * on the mountain stay there while the number passes under it, and only
       * trims once the gap is bigger than the slack — which walks the count
       * down over a few frames instead of snapping it.
       */
      const budget = Math.max(
        wanted,
        Math.min(lastShownCount, Math.round(wanted * PLACE_BUDGET_SLACK))
      );
      /*
       * A budget of nothing still runs the loop.
       *
       * Returning early here was right while the budget could never reach
       * zero. With a gate it reaches zero every time you pull back past it,
       * and returning left every marker's fade frozen at whatever it last
       * was — so crossing the gate outward made five markers vanish between
       * one frame and the next, which is the pop this tier's whole fade
       * machinery exists to prevent. Fall through with nothing affordable and
       * they fade out the way they faded in.
       */
      if (!labelsOnly) hutsDrawn.clear();
      // Sorted, not sliced. The budget is spent on places that actually get
      // drawn, and whether one does depends on the mountain being in the way
      // and on the room left beside it — neither of which this can know in
      // advance. Slicing first meant that when the three highest places all
      // happened to be behind a ridge, the answer was no places at all, on a
      // mountain with thirty-seven.
      const list = [...all].sort((a, b) => (b[4] ?? 0) - (a[4] ?? 0));

      ctx.font = "600 10.5px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      const hits = (box) =>
        placed.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t);

      const drawn = [];
      // Why a place is not on the mountain, for when the answer matters. Four
      // different tests can drop one and they need different fixes.
      const lit = mapTest ? [] : null;
      /*
       * Incumbents first, then everyone else, both in altitude order.
       *
       * Hysteresis on the depth test stops a marker grazing a silhouette from
       * winking, and on its own takes the churn over a slow turn from 36 to
       * 20. Reserving the boxes of what was already showing takes it to 8: an
       * arrival waits for room rather than evicting someone, so one change
       * cannot cascade into three.
       *
       * Both, because they fix different halves. Neither changes WHICH places
       * are eligible — that is altitude, and it stays altitude.
       */
      const holding = (full) => frameNow - (shownAt.get(full) ?? -Infinity) < PLACE_HOLD_MS;
      const order = [
        ...list.filter(([full]) => holding(full)),
        ...list.filter(([full]) => !holding(full)),
      ];
      /*
       * A short name that two places share is not a short name.
       *
       * `shortName` strips the leading "Rifugio", "Bar", "Baita" and so on,
       * which is right when it leaves something you could point at and wrong
       * when the mountain has two of them: Monterosa has Bar Gabiet and
       * Rifugio Gabiet, and Baita Rifugio Belvedere and Rifugio Belvedere.
       * Both pairs collapsed to one word, and the tier drops a name it has
       * already written rather than fading it — so whichever lost the race
       * that frame vanished outright. Measured as a 0.43 step on "Gabiet",
       * which is the popping this whole tier was fixed to stop.
       *
       * So an ambiguous short name is not used at all and the place keeps its
       * full one. Two labels a word apart are worth more than one label and
       * one blink, and on a screen whose job is "pick where to eat" they are
       * the difference between a choice and a guess.
       */
      const ambiguous = new Set();
      const shortSeen = new Set();
      for (const [full] of all) {
        const short = shortName(full);
        if (shortSeen.has(short)) ambiguous.add(short);
        shortSeen.add(short);
      }
      for (const [full, kind, lat, lon, alt, facts] of order) {
        const short = shortName(full);
        const name = ambiguous.has(short) ? full : short;
        const { x, z } = field.proj.project(lat, lon);
        const s = project(x, field.sample(x, z), z, v, cam);
        /*
         * Every reason to hide something goes through the fade, not around it.
         *
         * Three tests used to `continue` before `fadeOf` was ever called: off
         * the screen, behind the mountain, and — in the names pass — having no
         * marker under it. A fade that is not asked for does not run, so it
         * froze at whatever it last was, which for something that had been on
         * screen is one. Go behind a ridge and the marker vanished between two
         * frames; come back out and it appeared at full strength between two
         * more. All the softening in this file was reaching only the places
         * that lost their room to a collision.
         *
         * Far off screen is the exception and is not a fade: there is nothing
         * to see either way, so the fade is set to zero outright and the place
         * comes back the way a new one does.
         */
        if (s.x < -60 || s.x > width + 60 || s.y < -60 || s.y > height + 60) {
          fades.set(`m:${full}`, 0);
          fades.set(`n:${full}`, 0);
          continue;
        }
        const hidden = steady(`h:${full}`, !visible(s), frameNow);
        /*
         * The hut owns the name from here, not from wherever it ends up.
         *
         * This used to be claimed at the bottom of the loop, only when the
         * marker had won a slot — so the budget and the collision test decided
         * which layer wrote "Belvedere", and both change frame to frame. The
         * junction of the same name took it back the moment the marker lost
         * its room and handed it over again a moment later, and the word
         * flickered between two positions twenty pixels apart.
         *
         * Being on screen is stable across a frame or two in a way that
         * winning a slot is not, so that is what settles it.
         */
        if (!labelsOnly && !hidden) spoken?.add(name);

        const r = 6.4;
        /*
         * A marker's box is the marker, near enough.
         *
         * Three pixels of padding either side makes a nineteen pixel claim
         * around a thirteen pixel disc, and on a summit where four
         * restaurants sit within a hundred metres that is the difference
         * between all four showing and two of them. The padding was there to
         * keep discs from touching; one pixel does that, and a cluster that
         * physically cannot fit is a cluster the eye can see is a cluster.
         */
        const box = { l: s.x - r - 1, r: s.x + r + 1, t: s.y - r - 1, b: s.y + r + 1 };
        if (labelsOnly) {
          /*
           * The marker went down in the earlier pass; this one only has to
           * find room for the words.
           *
           * Which it never did. The marker's own box runs to s.y + 9.4 and the
           * label's box started at s.y + 8.4 — a one pixel overlap, so every
           * hut name in the app collided with the disc it belonged to and was
           * dropped, in every resort, at every zoom, since the day the markers
           * were added. Nothing looked broken: the markers were there and the
           * budget and the fade all worked, so it read as a design that had
           * simply chosen not to write the names.
           *
           * Cleared by four pixels rather than by exempting the marker from
           * the test, because a name touching its own disc looks like a
           * mistake even when it is deliberate.
           */
          const w = ctx.measureText(name).width;
          const tx = Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, s.x));
          const ty = s.y + r + 17;
          const label = { l: tx - w / 2 - 3, r: tx + w / 2 + 3, t: ty - 10, b: ty + 3 };
          // A name goes when its marker goes, at the same speed, rather than
          // being cut the moment the marker loses its slot.
          const fits = namesOn && hutsDrawn.has(full) && !hits(label);
          const solid = fadeOf(`n:${full}`, fits, frameDt);
          if (fits) placed.push(label);
          if (solid <= 0.02) continue;
          ctx.globalAlpha = solid;
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(255,255,255,0.92)";
          ctx.strokeText(name, tx, ty);
          ctx.fillStyle = "rgba(11,26,36,0.78)";
          ctx.fillText(name, tx, ty);
          ctx.globalAlpha = 1;
          nameLit?.push({ name, alpha: Math.round(solid * 100) / 100 });
          if (fits) named.push(name);
          continue;
        }
        // The box is reserved on the decision, not on the fade: a marker on its
        // way out still owns its room until it has gone, or the one replacing
        // it arrives on top of it.
        /*
         * Whole, or not at all.
         *
         * The cull above is on the marker's centre with twenty pixels of
         * slack, so a place near the edge drew a disc sliced by the canvas —
         * "Soleil" at Monterosa came out as a crescent nine pixels wide. A
         * marker cut by the frame reads as a rendering fault rather than as
         * somewhere to eat, and it is the same complaint as a marker popping:
         * things on the mountain should arrive whole.
         *
         * Folded into `wanted` rather than skipped, so leaving the frame fades
         * the way going behind a ridge does.
         */
        const inside = box.l >= 0 && box.t >= 0 && box.r <= width && box.b <= height;
        /*
         * Past the budget it fades out; it does not stop being drawn.
         *
         * This loop used to `break` at the budget, which reads as an economy
         * and is a bug: a place pushed out of the ranking never reached
         * `fadeOf` again, so its fade froze at full and the marker vanished
         * between two frames. Everything the fade was there for — the gentle
         * arrival, the slow exit — applied only to places that lost their room
         * to a collision, and not to the far more common case of losing it to
         * the budget. It is the largest part of "everything keeps appearing
         * and disappearing".
         *
         * The cost of running to the end of the list instead is a few dozen
         * projections a frame.
         */
        const room = drawn.length < budget;
        const keep = !hidden && inside && room && !hits(box);
        const solid = fadeOf(`m:${full}`, keep, frameDt);
        if (keep) placed.push(box);
        if (solid > 0.02) {
          ctx.globalAlpha = solid;
          pin(s.x, s.y, r, kind);
          ctx.globalAlpha = 1;
          // How solid, not just whether. Counting set membership calls a fade
          // a disappearance, which is the one thing a fade is not; what the
          // eye objects to is a marker that jumps between frames, and that is
          // this number.
          if (lit) lit.push({ full, alpha: Math.round(solid * 100) / 100 });
        }
        if (!keep) {
          continue;
        }

        drawn.push({ name, full, kind, alt, lat, lon, facts, x: s.x, y: s.y, ...box });
        hutsDrawn.add(full);
        shownAt.set(full, frameNow);
      }
      if (mapTest && !labelsOnly) {
        window.__skisPlaceLit = lit;
      }
      if (mapTest && labelsOnly) {
        window.__skisPlaceNameLit = nameLit;
      }
      if (!labelsOnly) {
        lastShownCount = drawn.length;
        // What is on the glass right now, for the tap handler. The markers
        // are painted to a canvas, so there is nothing to hang a click on:
        // hit testing has to be done against the same list that drew them.
        tappable.current = drawn;
      }
      if (mapTest && !labelsOnly) {
        window.__skisPlaces = drawn;
        // Everything the resort has, so a check can ask whether what got shown
        // is the high ground rather than merely the right number of things.
        window.__skisAllPlaces = all;
      }
      return placed;
    };

    /**
     * Start, finish, and where you are.
     *
     * Deliberately not depth tested, unlike everything else on the mountain.
     * These are three markers, not a network, so they cannot make the map an
     * x-ray — and they are the answers to "where am I" and "where is the car",
     * which are the two questions worth not being able to lose. A position
     * marker that vanishes because the ridge you just came over is between you
     * and the camera is a worse map than one that admits the pin is behind
     * something.
     */
    /*
     * Where the pins' names will go, before anything else is laid out.
     *
     * The pins are the route's ends and the skier's own position, so their
     * names are the ones on the map that cannot be dropped — and they were the
     * only labels not taking part in the collision test. Drawn last, on top of
     * everything, they landed across whatever a junction or a restaurant had
     * already claimed: on Kronplatz mid-route, "Belvedere" sat over "Sonne"
     * and over "Olang I - Valdaora I" at once.
     *
     * Measured first and drawn last, so the boxes are reserved before any
     * other name is placed while the dots still paint over the route rather
     * than under it. Below the dot if that is free, above it if not, and the
     * name is dropped rather than stacked if neither is.
     */
    const planPins = (v, cam, placed) => {
      const p = propsRef.current.pins;
      if (!p?.features?.length) return [];
      ctx.font = "600 12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      const hits = (box) =>
        placed.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t);
      const out = [];
      for (const feature of p.features) {
        const [lon, lat] = feature.geometry.coordinates;
        const { x, z } = field.proj.project(lat, lon);
        const s = project(x, field.sample(x, z), z, v, cam);
        const role = feature.properties.role;
        const r = role === "now" ? 8 : 6;
        const name = feature.properties.name;
        const w = ctx.measureText(name).width;
        // The dot stays where the place is; only the words move inside the
        // frame. At Kronplatz the route starts on a node near the left edge
        // called "Olang I - Valdaora I", and the map said "I - Valdaora I".
        const tx = Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, s.x));
        /*
         * Somewhere to stand even when there is no room.
         *
         * Both slots taken used to mean no box, and no box meant the label
         * simply stopped being drawn between two frames. A pin label is the
         * name of the place you are going, so blinking it off as a restaurant
         * drifts under it is the worst version of the flicker. It keeps its
         * preferred slot as a position to fade out from, and `fits` says
         * whether it may be there at all.
         */
        let box = null;
        let fallback = null;
        for (const ty of [s.y + r + 15, s.y - r - 8]) {
          const candidate = { name, l: tx - w / 2 - 3, r: tx + w / 2 + 3, t: ty - 12, b: ty + 4, tx, ty };
          fallback = fallback ?? candidate;
          if (hits(candidate)) continue;
          box = candidate;
          break;
        }
        const fits = Boolean(box);
        if (fits) placed.push(box);
        out.push({ feature, s, role, r, box: box ?? fallback, fits });
      }
      return out;
    };

    const drawPins = (v, cam, plan) => {
      const drawn = [];
      const lit = mapTest ? [] : null;
      for (const { feature, s, role, r, box, fits } of plan) {

        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(11,26,36,0.22)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = role === "now" ? ACCENT : role === "finish" ? INK : "#ffffff";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = role === "start" ? "#0b1a24" : "#ffffff";
        ctx.stroke();

        // Which way to go next. It points at the end of the current leg: the
        // top station of the lift you are riding, or the junction the run
        // finishes at. Aimed from the target's projected position rather than
        // a stored heading, so it stays right while the map turns.
        //
        // Clear of the dot rather than tucked under it: underneath, its white
        // casing merged with the casing on the route running through the same
        // pixels and it read as a smudge.
        if (role === "now" && feature.properties.aim) {
          const [alon, alat] = feature.properties.aim;
          const t = field.proj.project(alat, alon);
          const target = project(t.x, field.sample(t.x, t.z), t.z, v, cam);
          const ang = Math.atan2(target.y - s.y, target.x - s.x);
          const at = (rad, d) => [s.x + Math.cos(rad) * d, s.y + Math.sin(rad) * d];
          const tip = at(ang, r + 15);
          const left = at(ang + 0.62, r + 6);
          const right = at(ang - 0.62, r + 6);
          ctx.beginPath();
          ctx.moveTo(tip[0], tip[1]);
          ctx.lineTo(left[0], left[1]);
          ctx.lineTo(right[0], right[1]);
          ctx.closePath();
          ctx.lineJoin = "round";
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          ctx.fillStyle = ACCENT;
          ctx.fill();
        }

        if (!box) continue;
        // The dot is never faded — it is the answer to "where am I", and three
        // of them cannot clutter anything. Only the word beside it fades.
        const solid = fadeOf(`p:${role}:${box.name}`, fits, frameDt);
        if (solid <= 0.02) continue;
        ctx.globalAlpha = solid;
        ctx.font = "600 12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3.5;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.strokeText(box.name, box.tx, box.ty);
        ctx.fillStyle = "#0b1a24";
        ctx.fillText(box.name, box.tx, box.ty);
        ctx.globalAlpha = 1;
        lit?.push({ name: box.name, alpha: Math.round(solid * 100) / 100 });
        if (fits) drawn.push(box);
      }
      // Same gate as the place names: canvas text leaves nothing to assert
      // against, so where it landed is published for the feature suite.
      if (mapTest) {
        window.__skisPinLabels = drawn;
        window.__skisPinLit = lit;
      }
    };

    // Motion carried between a gesture and the render loop. Declared here, above
    // the loop that reads them, rather than relying on the first frame landing
    // after the gesture block has run.
    /** Pixels per frame, smoothed, so one jittery sample cannot fling the map. */
    /*
     * How fast the thumb is moving, in pixels per MILLISECOND.
     *
     * Per millisecond and not per pointermove event, which is what this was.
     * Per event happened to work, by a coincidence worth writing down: a
     * pointermove carries less travel the more often it fires, so "pixels per
     * event" times "events per second" came out at the right speed whatever
     * the device — as long as the browser fired exactly one move per frame,
     * which it does not have to and does not always do. Safari coalesces, and
     * a phone under load skips. Then the two stop cancelling and a flick goes
     * however far the hardware felt like.
     *
     * A speed and a frame time multiply to a distance on any device, which is
     * the whole of it.
     */
    const velocity = { x: 0, y: 0 };
    let movedAt = 0;
    /** Remaining momentum after a flick. */
    const glide = { x: 0, y: 0 };

    // ---- loop ------------------------------------------------------------
    // Scroll arrives faster than frames do; see the note on `wheel`.
    let wheelDelta = 0;
    let wheelPinch = false;
    let wheelAt = null;
    let lastFrameAt = 0;
    // When the camera last moved, so the detail request can wait for it to
    // stop. Zero once the request for that resting place has gone out.
    /*
     * The camera the terrain in `blur` was drawn with, and how far the current
     * one has slid from it.
     *
     * Panning is a pure translation of this projection. `fit` derives the
     * focal length and the centring from the projected bounding box, which
     * depends on bearing, pitch and zoom and on nothing else — the pan is
     * added at the very end, in screen space. So a frame that differs only in
     * pan is the previous frame, shifted, and can be blitted rather than
     * rasterised.
     *
     * That matters because it is the common gesture and the expensive one.
     * Painting the ground from the photograph rather than a flat colour a quad
     * costs eighteen milliseconds a frame, every frame of a drag; reusing the
     * picture costs one drawImage. Turning, pitching and zooming still redraw,
     * and they should — those change what the mountain looks like, not just
     * where it is.
     *
     * The depth buffer slides with it, so the occlusion test has to look up
     * where the pixel WAS. And a slide far enough to expose ground the cached
     * picture never contained forces a real redraw.
     */
    // The frame time the draw pass should ease by. Set once at the top of a
    // frame rather than threaded through six functions.
    let frameDt = 16.7;
    /** The clock this frame is drawn against, for every hold and every fade. */
    let frameNow = 0;
    let raf = 0;
    let lastBearing = null;
    /** The camera as of the last frame, and when it last differed. */
    let lastSig = "";
    let stillSince = 0;
    /** Whether the picture currently on the offscreen came from the GPU. */
    let onGpu = false;
    /** The stride the picture on the offscreen was drawn at. */
    let drawnStep = MESH_STRIDE;
    /*
     * The GPU, if this browser has one to give.
     *
     * Null is a supported answer and the 2D path below is what answers it: a
     * complete renderer that needs nothing but a canvas, which is also what
     * runs in every check that does not ask for WebGL. Created once and kept,
     * because a context is expensive and there is a hard limit on how many a
     * page may hold.
     */
    let glr = null;
    let glField = null;
    let glDrape = null;
    /*
     * Whether to use it at all, decided by timing it rather than by asking.
     *
     * WebGL being present says nothing about WebGL being fast. A phone runs it
     * on the GPU and a textured mesh is a millisecond; a machine with no GPU
     * falls back to a software rasteriser — SwiftShader, which is what this is
     * developed against — and the same mesh is a hundred and forty. That is
     * slower than the 2D path it replaced, and the 2D path is still here and
     * still complete.
     *
     * So the first few redraws are timed and the loser is dropped. The first
     * two are skipped: they carry the shader compile and the mesh upload, and
     * judging a renderer on its startup cost would fail every real device.
     */
    /*
     * 200ms, which is "this is broken", not "this is slower than 2D".
     *
     * Measured head to head against the 2D path on a software rasteriser with
     * no GPU at all — the worst case anything real will hit — with the drape
     * on: 142ms against 125 at rest, then 114 against 179, 100 against 158 and
     * 74 against 123 as you zoom in. The GPU wins nearly everywhere even
     * there, and wins by more the closer you get, which is where the 2D path
     * was falling apart. So the budget is not a race between the two; it is a
     * floor under a device whose WebGL is a stub.
     */
    const GL_BUDGET_MS = 200;
    const GL_TRIAL_SKIP = 2;
    const GL_TRIAL_FRAMES = 6;
    let glTrial = [];
    const forced = typeof window !== "undefined" && mapTest
      ? new URLSearchParams(window.location.search).get("gl")
      : null;
    if (forced !== "0") glr = createTerrainGL();
    const frame = () => {
      const v = view.current;

      // One zoom per frame, from everything that has scrolled since the last
      // one. targetZoom rather than zoom, so the easing below carries it.
      if (wheelDelta && wheelAt) {
        const rate = wheelPinch ? PINCH_RATE : WHEEL_RATE;
        let scale = 2 / (1 + Math.exp(-Math.abs(wheelDelta * rate)));
        if (wheelDelta > 0) scale = 1 / scale; // scrolling down zooms out
        zoomAbout(v, scale, wheelAt.x, wheelAt.y);
        wheelDelta = 0;
        dirty.current = true;
      }

      const now = performance.now();
      // Capped, so a frame dropped to a background tab does not resolve the
      // whole ease in one step and jump.
      const dt = Math.min(64, lastFrameAt ? now - lastFrameAt : 16.7);
      lastFrameAt = now;

      /*
       * A zoom only navigation allows does not outlive it.
       *
       * Backing off to sixteen kilometres is a navigation thing — the window
       * there is NAV_ACROSS/zoom, not the resort. Leave the screen with that
       * zoom still set and the framing camera reads it as a multiplier on the
       * whole mountain and puts the resort in a corner. Corrected here rather
       * than on the transition, because there is no single place a transition
       * happens and this is checked every frame anyway.
       */
      const floor = zoomFloorFor(propsRef.current);
      if (v.targetZoom < floor) v.targetZoom = floor;
      if (v.zoom < floor) v.zoom = floor;

      const gap = v.targetZoom - v.zoom;
      if (Math.abs(gap) > 0.001) {
        const was = v.zoom;
        v.zoom += gap * (1 - Math.exp(-dt / ZOOM_EASE_MS));
        /*
         * A zoom that eases has to pay for its pan in instalments.
         *
         * `zoomAbout` shifts the pan by the whole correction the moment it is
         * called, which is right for a pinch — the pinch snaps `zoom` to
         * `targetZoom` on the same line, so pan and zoom never disagree. A
         * double tap does not snap: it sets the target and lets this ease
         * carry it over about 110 ms. So the pan jumped a frame before the
         * zoom arrived, and for the length of the ease the map slid sideways
         * and then settled back. That slide is the glitch.
         *
         * Here the correction is applied per frame against the zoom that
         * actually happened this frame, so the point under the finger stays
         * under it for the whole animation instead of only at the end.
         *
         * `v.frame` is last frame's, and that is fine: ax and ay come from the
         * viewport and the chrome, not from zoom or pan, so they do not move
         * while a zoom eases. (Which is not the usual answer in this file —
         * see rotateAbout, where using the last frame's camera was exactly the
         * bug. The difference is that this reads only the layout half of it.)
         */
        if (v.zoomAt && v.frame && was > 0) {
          const step = v.zoom / was;
          v.panX += (1 - step) * (v.zoomAt.x - v.frame.ax - v.panX);
          v.panY += (1 - step) * (v.zoomAt.y - v.frame.ay - v.panY);
        }
        dirty.current = true;
      } else if (v.zoomAt) {
        v.zoomAt = null;
      }

      if (Math.hypot(glide.x, glide.y) > GLIDE_STOP) {
        // A flick that reaches the edge is resisted rather than killed, so it
        // eases into the wall and springs back instead of stopping dead.
        //
        // Scaled by the frame time, because `glide` is a speed and this is the
        // distance it covers. Applied raw it was a distance PER FRAME, so the
        // same flick of the same thumb threw the map twice as far on a 120Hz
        // phone as on a 60Hz one — and twice as far as anyone tuned it to go.
        // Of everything here that overshoots, this is the one a person can
        // feel, because it is the gesture they make most.
        const lim = v.panLimit;
        v.panX = resist(v.panX, glide.x * dt, lim?.x, width);
        v.panY = resist(v.panY, glide.y * dt, lim?.y, height);
        const bleed = Math.exp(-dt / GLIDE_MS);
        glide.x *= bleed;
        glide.y *= bleed;
        dirty.current = true;
      } else if (glide.x || glide.y) {
        glide.x = 0;
        glide.y = 0;
      }

      // Spring back to the wall once nothing is pushing against it.
      const lim = v.panLimit;
      if (lim && !v.dragging) {
        for (const axis of ["panX", "panY"]) {
          const cap = axis === "panX" ? lim.x : lim.y;
          const over = Math.abs(v[axis]) - cap;
          if (over > 0.3) {
            // Same reason as the glide: a fraction of the overshoot per frame
            // is a different spring on a different display.
            const back = Math.max(0.5, over * 0.22) * Math.min(2, dt / 16.7);
            v[axis] -= Math.sign(v[axis]) * Math.min(over, back);
            dirty.current = true;
          }
        }
      }

      // Publish where north actually is, for the compass to point at. A CSS
      // variable rather than React state: this changes every frame of a turn,
      // and re-rendering the app for it would stutter the very gesture that is
      // producing it.
      //
      // The angle, not the bearing. Rotating a needle by the bearing alone is
      // what MapLibre's compass does and it is only right at the cardinals:
      // the vertical axis is foreshortened by the pitch, so at bearing 152 and
      // pitch 46 north sits 37 degrees round, not 28.
      const br = (v.bearing * Math.PI) / 180;
      const pt = (v.pitch * Math.PI) / 180;
      const north = Math.round(
        ((Math.atan2(Math.sin(br), -Math.cos(br) * Math.cos(pt)) * 180) / Math.PI + 360) % 360
      );
      if (north !== lastBearing) {
        lastBearing = north;
        // On the root, because the compass is a sibling of the canvas and a
        // custom property only inherits downwards.
        document.documentElement.style.setProperty("--map-north", String(north));
      }

      // Redraw only when something moved. 3,600 filled quads a frame is not a
      // thing to do at 60Hz on a phone in a pocket on a chairlift.
      if (dirty.current || fadingPlaces) {
        dirty.current = false;
        frameDt = dt;
        frameNow = now;
        fadingPlaces = false;
        /*
         * How much time the fades have actually been advanced by.
         *
         * Published for the checks, which otherwise measure an alpha step
         * against the time between their own samples — and the renderer does
         * not repaint on their cadence. It repaints only when something moved,
         * so one redraw can span several of a sampler's frames and legitimately
         * move a fade several times as far as the sampler thinks it could. This
         * is the clock the fades are on, so it is the one to judge them by.
         */
        if (mapTest) window.__skisFadeClock = (window.__skisFadeClock ?? 0) + dt;
        const cam = fit(v);
        lastCam.current = cam;
        publishScale(v, cam);

        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, `rgb(${SKY_TOP.join(",")})`);
        sky.addColorStop(0.55, `rgb(${SKY_MID.join(",")})`);
        sky.addColorStop(1, `rgb(${SKY_HORIZON.join(",")})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // Terrain first, then everything on it — and depth-tested against it,
        // so a run on the far side of a ridge is hidden by the ridge. Drawing
        // the network over the finished surface made the mountain an x-ray of
        // itself: at Kronplatz most of the network is behind something, and
        // two lines crossing on screen gave no clue which one you were on.
        // The terrain is drawn as flat filled quads, so every one of the 3,600
        // is a single tone with a hard step to its neighbour, and close up it
        // reads as tiling rather than as ground. More quads is the obvious
        // answer and does not fit: GRID 90 is 52fps on a laptop, so a third of
        // that on a phone.
        //
        // So it is painted once into an offscreen surface and composited back
        // through a small blur, which costs one drawImage and dissolves the
        // steps. The route and the pistes go on afterwards, on the real
        // canvas, and stay sharp.
        /*
         * Is this frame the last one, slid sideways?
         *
         * Everything the picture depends on other than the pan: the focal
         * length and centring `fit` derived, and the view angles behind them.
         * `f` alone would nearly do, but two different bearings can fit the
         * bbox to the same width, and drawing one mountain with another's
         * terrain is not a mistake that announces itself.
         */
        /*
         * Is this frame the last one, slid sideways?
         *
         * Everything that changes what drawTerrain puts on the canvas, and
         * nothing that only changes where it puts it. Getting that list wrong
         * is silent in the worst way — the picture simply stops responding to
         * something, and it looks like that thing not working rather than like
         * a stale cache. Turning the sun's shadows off did nothing at all,
         * because the shadows are not in the camera and the camera was all
         * this compared.
         *
         * By identity rather than by a string key, so the drape counts as a
         * different drape when the sharper tiles for a closer view arrive.
         * A key of "has imagery: yes" would have frozen the coarse mosaic on
         * screen for ever.
         */
        /*
         * Moving, or settled?
         *
         * Everything the camera can change, pan included — a slid frame is
         * still a moving one, even though the picture is reused rather than
         * redrawn. Compared against the last frame rather than the last draw,
         * because the question is whether the user's hand has stopped, not
         * whether the cache is warm.
         */
        const nowSig = `${cam.f}|${v.bearing}|${v.pitch}|${v.zoom}|${cam.ox}|${cam.oy}`;
        if (nowSig !== lastSig || v.dragging) { lastSig = nowSig; stillSince = now; }
        // Never while a finger is down. A thumb that pauses mid-drag holds the
        // camera still, and refining there spends a long frame under the hand
        // and then throws it away on the next pixel of movement — a stutter
        // exactly where the map is meant to feel attached to the finger.
        const settled = !v.dragging && now - stillSince >= MESH_SETTLE_MS;
        const step = settled ? 1 : MESH_STRIDE;

        const now2 = {
          f: cam.f,
          bearing: v.bearing,
          pitch: v.pitch,
          zoom: v.zoom,
          width,
          height,
          imagery: propsRef.current.imagery,
          block: propsRef.current.block,
          nodes: propsRef.current.nodes,
          shadowsOn,
          step,
        };
        const same = cachedAt !== null &&
          Object.keys(now2).every((k) => cachedAt.what[k] === now2[k]);
        const slidX = same ? cam.ox - cachedAt.ox : null;
        const slidY = same ? cam.oy - cachedAt.oy : null;
        // Far enough and the cached picture no longer contains the ground that
        // has slid into frame, so it has to be drawn rather than moved.
        const reuse = slidX !== null && Math.abs(slidX) <= PAN_REUSE_MAX &&
          Math.abs(slidY) <= PAN_REUSE_MAX;

        if (reuse) {
          depthShiftX = slidX;
          depthShiftY = slidY;
        } else {
          depthShiftX = 0;
          depthShiftY = 0;
          const gpuStart = performance.now();
          onGpu = drawTerrainGL(v, cam);
          if (onGpu) judgeGpu(performance.now() - gpuStart);
          if (!onGpu) {
            offCtx.setTransform(1, 0, 0, 1, 0, 0);
            offCtx.clearRect(0, 0, off.width, off.height);
            offCtx.setTransform(dpr, 0, 0, dpr, TERRAIN_MARGIN * dpr, TERRAIN_MARGIN * dpr);
            depthCtx.setTransform(1, 0, 0, 1, 0, 0);
            depthCtx.clearRect(0, 0, depth.width, depth.height);
            depthCtx.setTransform(DEPTH_SCALE, 0, 0, DEPTH_SCALE,
              TERRAIN_MARGIN * DEPTH_SCALE, TERRAIN_MARGIN * DEPTH_SCALE);
            depthScale = DEPTH_SCALE;
            depthBias = field.span * DEPTH_BIAS_FRAC;
            drawTerrain(v, cam, offCtx, depthCtx, step);
            // One readback for the frame. Per-point getImageData is the obvious
            // way to write this and is orders of magnitude slower: every call
            // synchronises with the compositor, and there are thousands of
            // points.
            depthData = depth.width && depth.height
              ? depthCtx.getImageData(0, 0, depth.width, depth.height)
              : null;
          }
          cachedAt = { what: now2, ox: cam.ox, oy: cam.oy };
          drawnStep = onGpu ? 1 : step;
        }

        // Blur it, then cut the blur back to the sharp shape.
        //
        // Blurring straight onto the canvas softens the outline as much as the
        // interior, and past about a pixel the mountain starts to look out of
        // focus rather than smooth. Compositing the blurred copy through the
        // sharp one with destination-in keeps only the pixels the sharp
        // terrain covers, so the silhouette and the slab's edges stay crisp
        // while the facets inside them dissolve. That buys a blur wide enough
        // to actually work.
        // Not on the GPU. The blur exists to dissolve the steps between flat
        // quads, and there are none: the shading is interpolated across each
        // triangle and the drape is a filtered texture, so blurring would only
        // throw away the detail this was all for.
        if (!reuse && !onGpu) {
          blurCtx.setTransform(1, 0, 0, 1, 0, 0);
          blurCtx.clearRect(0, 0, blur.width, blur.height);
          blurCtx.filter = `blur(${blurFor(cam.f, !!propsRef.current.imagery, step) * dpr}px)`;
          blurCtx.drawImage(off, 0, 0);
          blurCtx.filter = "none";
          blurCtx.globalCompositeOperation = "destination-in";
          blurCtx.drawImage(off, 0, 0);
          blurCtx.globalCompositeOperation = "source-over";
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Offset in device pixels, because that is what the offscreen is in.
        ctx.drawImage(onGpu ? off : blur,
          (depthShiftX - TERRAIN_MARGIN) * dpr, (depthShiftY - TERRAIN_MARGIN) * dpr);
        ctx.restore();
        drawGraph(v, cam);
        drawRoute(v, cam);
        /*
         * In the order a lost skier needs them: the valley bases, then the
         * huts as markers, then the huts' own names, then the junctions.
         *
         * A name reserves a box six times the width of a marker, so this
         * ordering is what actually decides which names exist. The bases go
         * first and always did — those are the names you read when you are
         * working out where you are, and they are where the car is.
         *
         * The huts used to go last, behind the junctions, and the junctions
         * took the mountain: what was left was a dozen identical orange discs
         * with no words under them. A junction name is a label on a place you
         * pass through; a restaurant name is a place you decide to go to, and
         * you cannot decide between two markers that look the same. So the
         * huts are named before the junctions now, and it is the junctions
         * that come back as you zoom in.
         */
        const boxes = chromeBoxes();
        // Ahead of every other name, because these three are the route's own
        // ends and where the skier is standing. Only the boxes are claimed
        // here; the dots are painted at the end so nothing draws over them.
        const pins = planPins(v, cam, boxes);
        // One name, said once, whichever layer says it.
        const spoken = new Set(
          (propsRef.current.pins?.features ?? []).map((f) => f.properties?.name)
        );
        drawPlaces(v, cam, boxes, { only: "bases", spoken });
        drawHuts(v, cam, boxes, { markersOnly: true, spoken });
        drawHuts(v, cam, boxes, { labelsOnly: true });
        drawPlaces(v, cam, boxes, { only: "rest", spoken });
        // Last, because a place is a better thing to know than a piste name,
        // and there are far more piste names than there is room for.
        drawRunNames(v, cam, boxes, spoken);
        drawPins(v, cam, pins);
      }

      /*
       * The camera has stopped and the picture is the coarse one. Ask for a
       * frame, so the fine mesh goes down.
       *
       * Here rather than inside the draw, because the draw only runs when
       * something is dirty and nothing is: the hand came off and the map is
       * sitting there at half resolution. One dirty flag, and the branch above
       * does the rest — the stride is part of the cache key, so it redraws
       * rather than reusing what it has.
       */
      if (!onGpu && drawnStep > 1 && lastSig && !view.current.dragging &&
          now - stillSince >= MESH_SETTLE_MS) {
        dirty.current = true;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // ---- gestures --------------------------------------------------------
    // The conventions every map app shares, and the ones MapLibre implements
    // for the real map, so the two views behave identically:
    //
    //   one finger drag    pan
    //   two finger pinch   zoom
    //   two finger twist   rotate
    //   two finger drag    tilt
    //   double tap         zoom in
    //
    // The previous version put rotate and tilt on a one-finger drag, which is
    // what made it feel wrong: dragging re-aimed the camera instead of moving
    // the map under your thumb.
    const pointers = new Map();
    let gesture = null;

    const centroid = () => {
      const pts = [...pointers.values()];
      return {
        x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
        y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
      };
    };
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return { dist: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x) };
    };

    /**
     * The terrain point under a screen position, found with the app's own
     * forward projection rather than an inverse of it.
     *
     * The closed-form inverse this replaces solved for the GROUND plane, and
     * the thing under your fingers is not on the ground plane — it is on the
     * mountain, at whatever altitude that is, times the vertical exaggeration.
     * At a distance that error is nothing; zoomed in and pitched over it put
     * the anchor hundreds of metres from where the finger actually was.
     *
     * Coarse sweep of the height field then two refinements. It runs once when
     * a two finger gesture begins, not per frame, so a few thousand
     * projections cost nothing anyone can feel.
     */
    const groundUnder = (v, sx, sy) => {
      const f = fieldRef.current;
      const cam = lastCam.current;
      if (!f || !cam) return null;

      /*
       * The screen position, inverted exactly, and then a ray cast at the
       * ground.
       *
       * What this replaces searched the whole height field for the point whose
       * projection landed nearest the finger, refining three times. It is the
       * obvious way to write it and it is wrong for a reason worth keeping:
       * screen distance is not unimodal over a mountain. A screen position
       * corresponds to every point along one ray, which on a mountain means
       * the visible surface AND everything hidden behind ridges — so a coarse
       * pass can settle in the wrong basin and every refinement afterwards
       * digs further into it. Measured: 26 pixels of error at the framing the
       * app opens on, 104 at a steep pitch, 250 at worst. That error was
       * landing on the first frame of every drag, as a jump.
       *
       * A ray has a first hit and nothing ambiguous about it. `toUnit` is a
       * perspective projection with the camera a fixed distance back along the
       * view axis, so for any depth the world point projecting to this pixel
       * is a closed form — the rotation and the pitch are two 2x2s, both of
       * determinant one, and both invert. March out along the ray, take the
       * first step that is underground, bisect.
       */
      const u = (sx - cam.ox) / cam.f;
      const w0 = (sy - cam.oy) / cam.f;
      const b = (v.bearing * Math.PI) / 180;
      const p = (v.pitch * Math.PI) / 180;
      const cp = Math.cos(p);
      const sp = Math.sin(p);
      const cb = Math.cos(b);
      const sb = Math.sin(b);

      /** The world point on this pixel's ray at a given depth. */
      const along = (d) => {
        const w = f.span * 1.45 + d;
        const rx = u * w;
        const vy = w0 * w;
        // Inverting sy = -rz·cos p - py·sin p and depth = rz·sin p - py·cos p.
        const rz = -cp * vy + sp * d;
        const py = -sp * vy - cp * d;
        return {
          x: rx * cb + rz * sb + f.cx,
          z: -rx * sb + rz * cb + f.cz,
          // py is in the exaggerated space the projection works in.
          y: py / VERT_EXAGGERATION + f.cy,
        };
      };

      /** How far above the ground the ray is at a depth; negative is inside. */
      const clearance = (d) => {
        const q = along(d);
        if (q.x < f.minX || q.x > f.maxX || q.z < f.minZ || q.z > f.maxZ) return null;
        return q.y - f.sample(q.x, q.z);
      };

      // Never right up against the camera, where w approaches zero and the ray
      // sweeps the whole scene between two steps.
      const near = -f.span * 1.3;
      const far = f.span * 2.2;
      const steps = 120;
      let prevD = null;
      let prevC = null;
      let hit = null;
      for (let i = 0; i <= steps; i++) {
        const d = near + ((far - near) * i) / steps;
        const c = clearance(d);
        if (c === null) { prevD = null; prevC = null; continue; }
        if (prevC !== null && prevC > 0 && c <= 0) { hit = [prevD, d]; break; }
        prevD = d;
        prevC = c;
      }
      // No crossing: the pixel is sky. Nothing to hold, and saying so is
      // better than answering with the nearest point on a ray that never
      // touched the ground — a drag anchored to that would move the map by
      // whatever the sky happens to be over. A drag starting on sky falls back
      // to moving the picture, which is the right thing for a grab that did
      // not grab anything.
      if (!hit) return null;
      let [lo, hi] = hit;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const c = clearance(mid);
        if (c === null) break;
        if (c > 0) lo = mid;
        else hi = mid;
      }
      const q = along((lo + hi) / 2);
      // Snapped onto the surface: the ray is within a hair of it by now, and
      // anything drawn at this point has to sit on the ground rather than a
      // fraction under it.
      return { x: q.x, z: q.z, y: f.sample(q.x, q.z) };
    };

    /*
     * Cast shadows, switchable, for the checks only.
     *
     * Whether a shadow reached the screen cannot be answered from one picture.
     * The snow palette is blue-leaning to begin with, so "count the blue
     * pixels" put two thirds of a sunlit mountain in shadow, and no threshold
     * separates the two populations because they overlap. Rendering the same
     * view twice and subtracting does separate them, and there is no other way
     * to ask.
     */
    let shadowsOn = true;
    if (mapTest && typeof window !== "undefined") {
      window.__skisSetShadows = (on) => {
        shadowsOn = Boolean(on);
        dirty.current = true;
      };
      // Reading it back is how a check can tell the toggle took effect rather
      // than being swallowed by the cache, which is how it failed the first
      // time.
      window.__skisShadowsOn = () => shadowsOn;
    }

    // Where on the mountain a screen position lands. The gesture code needs
    // this to hold the ground under a thumb; a check needs it to know what
    // ground was grabbed, which is the only way to ask whether it was held.
    if (mapTest && typeof window !== "undefined") {
      window.__skisGroundAt = (sx, sy) => {
        const hit = groundUnder(view.current, sx, sy);
        return hit ? field.proj.unproject(hit.x, hit.z) : null;
      };
      /*
       * How far the ground the finger grabbed has got from the finger, right
       * now, mid-gesture.
       *
       * The one number that says whether a drag is holding the ground. Pan
       * magnitude cannot: after release it includes the fling, and while held
       * it is stable but says nothing about whether the map outran the thumb.
       * Null when nothing is being dragged.
       */
      window.__skisGroundGap = () => {
        // `gesture.x/y` is where the thumb was on its last move, which is where
        // it still is mid-drag.
        // Null when there is no drag, or when the grab landed on sky: a
        // gesture with no anchor never takes the ground-holding path, so there
        // is nothing there to measure.
        if (!gesture?.anchor || !projectRef.current) return null;
        // Solved now, like the drag itself. Against `lastCam` this measured
        // the renderer's lag as if it were the gesture's error.
        const at = projectRef.current(
          gesture.anchor.x, gesture.anchor.y, gesture.anchor.z,
          view.current, fit(view.current));
        if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) return null;
        return Math.hypot(
          gesture.x - gesture.grabDX - at.x,
          gesture.y - gesture.grabDY - at.y);
      };
    }

    const startGesture = () => {
      const c = centroid();
      const grabbed = groundUnder(view.current, c.x, c.y);
      /*
       * The camera as it is now, not as it was when the page last drew.
       *
       * `move` solves `fit(v)` per pointer event and measures the grab against
       * that; this recorded the grab's offset against `lastCam` instead. When
       * the two disagree — and they do whenever anything is still animating
       * when the finger lands, which after a zoom, a recentre or a leg change
       * is most of the time — the difference is subtracted from every move of
       * the gesture and never recovered. Measured after a two finger tap: the
       * next drag ran 57 pixels behind the thumb, for the whole drag.
       */
      const grabAt = grabbed && projectRef.current
        ? projectRef.current(grabbed.x, grabbed.y, grabbed.z, view.current, fit(view.current))
        : null;
      const sp = pointers.size >= 2 ? spread() : {};
      const pts = [...pointers.values()];
      gesture = {
        x: c.x, y: c.y,
        ...sp,
        // Two fingers can mean three things. Tilt excludes the other two and
        // is latched once; zoom and rotate each latch on their own threshold
        // and then run together, so a pinch can become a twist without
        // lifting a finger.
        x0: c.x, y0: c.y, dist0: sp.dist ?? 0, angle0: sp.angle ?? 0,
        // The narrowest the fingers have been. Rotation is gated on arc
        // travel, and using the smallest separation keeps the gate honest
        // while a pinch is closing.
        minDist: sp.dist ?? 0,
        last: pts.map((q) => ({ ...q })),
        // Where the fingers were when the pair was complete. The tilt test
        // measures against this rather than against the previous frame.
        ref: pts.map((q) => ({ ...q })),
        // undefined until the first real movement decides, then latched, the
        // way MapLibre latches it. Fingers stacked one above the other are
        // ambiguous with a pinch, so tilt is off from the start there.
        canTilt: pts.length >= 2 && isVertical(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
          ? false
          : undefined,
        tilting: false,
        zooming: false,
        rotating: false,
        // What the finger or fingers are resting on. Found once here rather
        // than every frame: rotation pivots on it, and a one-finger drag holds
        // it under the thumb.
        anchor: grabbed,
        // How far the grab landed from the thumb, which is the search's own
        // error and has to be subtracted rather than corrected away. See the
        // note in `move`.
        grabDX: grabAt ? c.x - grabAt.x : 0,
        grabDY: grabAt ? c.y - grabAt.y : 0,
      };
    };

    /**
     * Zoom about a point on the screen rather than about the middle of it.
     *
     * Pinching used to scale around the frame centre, so whatever you had
     * between your fingers slid away from them. Screen position is
     *   s = ax + f (u - M) + pan
     * and f scales by k, so holding s fixed needs
     *   pan' = pan + (1 - k)(s - ax - pan)
     * which is all this is.
     */
    const zoomFloor = () => zoomFloorFor(propsRef.current);

    const zoomAbout = (v, k, sx, sy) => {
      const before = v.targetZoom;
      v.targetZoom = clampZoom(v.targetZoom * k, zoomFloor());
      const actual = v.targetZoom / before; // k, unless the clamp took a bite
      // A pinch is its own anchor, every frame. Any eased zoom still owed pan
      // is cancelled rather than left to fight the fingers.
      v.zoomAt = null;
      const f = v.frame;
      if (!f || actual === 1) return;
      v.panX += (1 - actual) * (sx - f.ax - v.panX);
      v.panY += (1 - actual) * (sy - f.ay - v.panY);
    };

    /**
     * The same zoom, animated, holding the same point.
     *
     * For a zoom that arrives all at once — a double tap — where `zoomAbout`
     * would pay the whole pan before the zoom it is paying for has happened.
     * This only records where to hold; the ease in the frame loop pays it off
     * as the zoom actually moves.
     */
    const zoomTowards = (v, k, sx, sy) => {
      v.targetZoom = clampZoom(v.targetZoom * k, zoomFloor());
      v.zoomAt = { x: sx, y: sy };
    };

    /**
     * Turn the map about a point on the screen, not about the camera's target.
     *
     * This is why rotating felt violent once you were zoomed in. Pinching
     * already pivots on your fingers, but bearing did not: it pivoted on the
     * middle of the resort. Zoomed out those are nearly the same point and a
     * thirty degree twist reads as thirty degrees. Zoomed in and panned across
     * the valley, the pivot is somewhere off the side of the screen and the
     * same twist swings whatever you were looking at right out of frame.
     * MapLibre rotates about `pinchAround` for exactly this reason.
     *
     * Done by projecting the anchor before and after and putting the
     * difference into the pan, which is added in screen space at the very end.
     *
     * Each projection uses the camera solved from the view AS IT STANDS, and
     * that is the whole of it. Both used to use `lastCam` — one camera, from
     * the last frame the page drew — on the reasoning that a shared camera
     * makes the pan already in it cancel. The pan does cancel. The FRAMING
     * does not: the camera fits the resort to the viewport every frame, so
     * turning the bearing changes the subject's own extent on screen and with
     * it the focal length and the centring. A correction computed at the old
     * focal length is the wrong size for the frame that then gets drawn, and
     * the error scales with how much of the screen a metre covers — which is
     * exactly the zoom.
     *
     * Measured on Kronplatz, a forty degree twist about a point 45% down the
     * screen, drift of the ground under the fingers:
     *
     *   zoom 1     28px  ->   1px
     *   zoom 5    120px  ->   3px
     *   zoom 16   301px  ->   5px      (on a 430px screen)
     *
     * Three hundred pixels is seventy per cent of the screen width, which is
     * the "it over-rotates" everyone means: the twist itself was small, and
     * the mountain slid out from under it. `fit` is eighty node projections
     * and no drawing, so solving it twice per move costs nothing next to a
     * frame — the pan handler does the same thing for the same reason.
     */
    const rotateAbout = (v, dDeg) => {
      const anchor = gesture?.anchor;
      const proj = projectRef.current;
      if (!anchor || !proj || !dDeg || !v.frame) {
        v.bearing += dDeg;
        return;
      }
      const before = proj(anchor.x, anchor.y, anchor.z, v, fit(v));
      v.bearing += dDeg;
      const after = proj(anchor.x, anchor.y, anchor.z, v, fit(v));
      if (!Number.isFinite(before.x) || !Number.isFinite(before.y)) return;
      if (!Number.isFinite(after.x) || !Number.isFinite(after.y)) return;
      v.panX += before.x - after.x;
      v.panY += before.y - after.y;
    };

    // How far a two finger gesture has to go before it commits to being one
    // thing. Without these every pinch also rotated and tilted a little,
    // because two fingers never move perfectly symmetrically, and the map
    // wobbled the whole way through the zoom.
    /**
     * Movement past the wall, with the give of a rubber band.
     *
     * Beyond the limit the first pixel of finger travel buys a third of a
     * pixel and every pixel after buys less, converging on OVERSHOOT_MAX of
     * the frame however hard you pull. The spring in the frame loop takes it
     * back when you let go. The hard clamp this replaces stopped dead mid-drag,
     * which feels like the app has stopped listening rather than like the map
     * has an edge.
     *
     * A flat third was the first version and has no ceiling: a long drag past
     * the stop kept going at a third speed, so the mountain could be pulled
     * most of a screen clear of its own wall. How far depended on where the
     * wall was, which is a fact about the framing — reframing the camera on
     * the resort moved the wall in and the same 600px drag went from 261px
     * past it to 378px, with nothing about the gesture having changed. A band
     * that asymptotes has the same give where it matters, in the first few
     * pixels, and an edge that is felt rather than computed.
     *
     * Path-independent, which is why it maps back through the inverse rather
     * than scaling each increment: resisting increment by increment makes the
     * result depend on how many pointer events the browser happened to
     * coalesce, so the same drag ends up somewhere different on every device.
     *
     *   band(x) = c x / (1 + c x / D)      band(0) = 0, band'(0) = c, band(inf) = D
     *   band^-1(y) = y / (c (1 - y / D))
     */
    const OVERSHOOT = 0.26;
    const OVERSHOOT_MAX = 0.12;
    const resist = (cur, d, lim, frame) => {
      const next = cur + d;
      if (lim == null || Math.abs(next) <= lim) return next;
      const cap = Math.max(1, (frame ?? 0) * OVERSHOOT_MAX);
      const band = (x) => (OVERSHOOT * x) / (1 + (OVERSHOOT * x) / cap);
      const unband = (y) => y / (OVERSHOOT * Math.max(1e-3, 1 - y / cap));
      const wasOver = Math.max(0, Math.abs(cur) - lim);
      const raw = unband(Math.min(wasOver, cap * 0.999)) + (Math.abs(next) - lim - wasOver);
      return Math.sign(next) * (lim + band(Math.max(0, raw)));
    };

    /**
     * Thresholds, taken from MapLibre's own touch handlers rather than guessed.
     *
     * Two of mine were wrong in ways that caused exactly the cross-talk that
     * kept being reported.
     *
     * Zoom is measured in zoom levels, log2 of the change in separation, not
     * as a percentage. Rotation is measured as ARC TRAVEL — how far the
     * fingertips actually moved along the circle — and only then converted to
     * an angle using the current separation. That is the part I had missed. A
     * fixed 8 degree gate is trivially tripped by fingers 160px apart, where
     * 8 degrees is 11px of travel; the same 25px of arc asks for 18 degrees
     * there and 36 degrees when the fingers are close. It scales because what
     * your hand actually does is move a distance, not sweep an angle.
     */
    const ZOOM_START = 0.1;         // zoom levels, |log2(d / d0)|
    const ROTATE_ARC = 25;          // pixels of fingertip travel along the arc
    const PITCH_MIN_MOVE = 2;       // pixels before a finger counts as moving
    const SINGLE_TOUCH_GRACE = 100; // ms to wait for the second finger to move
    const isVertical = (dx, dy) => Math.abs(dy) > Math.abs(dx);

    /**
     * Double tap to zoom, and only a tap counts.
     *
     * This used to fire on any second pointerdown within 300ms, whatever
     * happened in between, so two quick drags in a row zoomed the map. Four in
     * a row put it at the ceiling. A tap has to be short and stay put, so both
     * are now tracked and a press that moved is not a tap.
     */
    const TAP_MS = 260;
    const TAP_SLOP = 12;
    /** How near a fingertip has to land. A thumb is about 44px across. */
    const TAP_REACH = 26;
    let lastTap = 0;
    /** The place marker under a tap, or null. Nearest within reach wins. */
    const nearestPlace = (sx, sy) => {
      let best = null;
      let near = TAP_REACH;
      for (const place of tappable.current) {
        const d = Math.hypot(place.x - sx, place.y - sy);
        if (d < near) { near = d; best = place; }
      }
      return best
        ? { name: place0(best), full: best.full, kind: best.kind,
            alt: best.alt, lat: best.lat, lon: best.lon, facts: best.facts }
        : null;
    };
    const place0 = (p) => p.full ?? p.name;
    let press = null;
    const down = (e) => {
      // Capture is an optimisation, not a requirement, and it throws for a
      // pointer the browser does not consider active. Unguarded, that throw
      // aborted the rest of this handler and the gesture never started at all.
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      /*
       * Marked as dragging BEFORE the gesture starts, not after.
       *
       * `startGesture` solves the camera now that it records its grab against
       * the same one the drag will use, and solving the camera settles the pan
       * inside its wall unless a finger is down. Setting the flag afterwards
       * meant a touch landing while the map was still springing back snapped
       * it home in one frame instead of letting the spring finish — the dead
       * stop the spring exists to replace.
       */
      view.current.dragging = true;
      startGesture();
      // A new touch stops a glide, so the map is always grabbable.
      glide.x = 0;
      glide.y = 0;
      velocity.x = 0;
      velocity.y = 0;
      movedAt = 0;

      if (pointers.size === 1) {
        const now = performance.now();
        press = { t: now, x: e.clientX, y: e.clientY };
        if (now - lastTap < 300) {
          zoomTowards(view.current, 1.6, e.clientX, e.clientY);
          dirty.current = true;
          lastTap = 0; // a zoom consumes the pair, so a third tap starts over
          /*
           * And the finger that is still down is not now dragging.
           *
           * `down` opens a gesture before it knows what the touch is for, so
           * the second tap of a pair armed one — and a thumb that rolls two
           * pixels before it lifts then dragged the map, from a grab measured
           * against the view as it was BEFORE the zoom. The map jumped. This
           * is the same stale-anchor fault as the one rotateAbout had, in the
           * one place where re-arming would not help: the view keeps changing
           * for the whole ease, so there is no moment at which a grab taken
           * now would still be right.
           *
           * So the pair is a zoom and nothing else. A second finger arriving
           * re-arms the gesture from scratch and takes over as a pinch, which
           * is what it should be.
           */
          gesture.zoomTap = true;
          press = null;
          view.current.dragging = false;
        }
      } else {
        press = null; // a second finger is a pinch, never a tap
      }
      canvas.style.cursor = "grabbing";
    };

    const move = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // The second tap of a double tap is a zoom. One finger still down after
      // it does not drag; two do, because `down` re-armed the gesture.
      if (gesture?.zoomTap && pointers.size === 1) return;
      const v = view.current;
      const c = centroid();

      if (pointers.size === 1) {
        /*
         * Drag holds the ground, not the screen.
         *
         * A screen-space pan moves the picture by however many pixels the
         * thumb moved, which is right for a flat map seen from directly above
         * and wrong for everything else. Tilted over, a pixel near the top of
         * the frame is hundreds of metres of mountain and a pixel near the
         * bottom is tens — so the same drag slides the ground out from under
         * the finger at one end of the screen and lags behind it at the other.
         * It is the difference between moving a photograph of a mountain and
         * turning the mountain, and it is the single thing that makes this
         * feel unlike Google Earth, which grabs the ground and keeps it under
         * you.
         *
         * So the point under the thumb when the drag started is projected
         * again with the camera that drew the last frame, and the pan takes up
         * whatever gap has opened between where it is and where the thumb now
         * is. Same camera on both sides, so the pan already in it cancels and
         * only the correction is left — the same trick `rotateAbout` uses.
         *
         * The fallback is the old behaviour, for the frame before a camera
         * exists and for a grab that lands on sky.
         */
        let dx = c.x - gesture.x;
        let dy = c.y - gesture.y;
        const held = gesture.anchor;
        /*
         * The camera as it is now, not as it was when the page last drew.
         *
         * `fit` is eighty node projections and no drawing, so solving it per
         * pointermove costs nothing next to a frame. Using the last drawn one
         * instead meant this had to guess how much pan had been applied since,
         * and the guess made the whole gesture depend on how often the renderer
         * happened to repaint: the same drag came out as 56, 67 or 104 pixels
         * of map for 67 of thumb depending on the cadence, and the cadence
         * changes whenever anything else on the map starts or stops animating.
         *
         * It also gives `resist` below this frame's pan limit rather than the
         * previous one's, which is the bound it is supposed to be enforcing.
         */
        const cam = fit(v);
        const proj = projectRef.current;
        if (held && cam && proj) {
          const at = proj(held.x, held.y, held.z, v, cam);
          if (Number.isFinite(at.x) && Number.isFinite(at.y)) {
            /*
             * Measured from where the grab landed, not from the thumb.
             *
             * `groundUnder` searches the height field and returns the nearest
             * point it sampled, which is tens of metres from the one truly
             * under the finger — a real distance on screen. Taking the gap
             * between the thumb and that point as a correction made the FIRST
             * move of every drag apply the whole search error at once: touch
             * the map and it jumps, before you have moved at all.
             *
             * The offset is recorded when the finger goes down and held for
             * the gesture, so the first move corrects by nothing and every
             * move after it tracks exactly. Which point was grabbed stops
             * mattering; only that the same one stays under the thumb.
             */
            /*
             * The whole remaining gap, applied once.
             *
             * A digitiser delivers moves faster than the page draws frames —
             * two or three per frame at 120Hz — so this runs several times
             * between renders and each run must leave the ground exactly under
             * the thumb. It does, because `cam` above is solved from the view
             * as it stands rather than from the last frame: every move measures
             * a gap that already includes what the moves before it did, so
             * there is nothing left to compound.
             */
            const gapX = c.x - gesture.grabDX - at.x;
            const gapY = c.y - gesture.grabDY - at.y;
            // A grab swung behind the camera projects a long way off, and
            // correcting to it would throw the map across the screen between
            // two frames. Past this it is not a correction.
            if (Math.hypot(gapX, gapY) < GRAB_MAX_JUMP) {
              dx = gapX;
              dy = gapY;
            }
          }
        }
        v.panX = resist(v.panX, dx, v.panLimit?.x, width);
        v.panY = resist(v.panY, dy, v.panLimit?.y, height);
        // Clamped below at half a millisecond: coalesced moves can arrive with
        // the same timestamp, and dividing by zero puts an infinity into the
        // average that never washes out.
        const now = performance.now();
        const span = Math.max(0.5, movedAt ? now - movedAt : 16.7);
        movedAt = now;
        velocity.x = velocity.x * 0.7 + (dx / span) * 0.3;
        velocity.y = velocity.y * 0.7 + (dy / span) * 0.3;
      } else if (pointers.size >= 2) {
        const pts = [...pointers.values()];
        const { dist, angle } = spread();
        let turn = angle - gesture.angle;
        // atan2 wraps; without this a gesture crossing the cut spins the map.
        if (turn > Math.PI) turn -= 2 * Math.PI;
        if (turn < -Math.PI) turn += 2 * Math.PI;
        gesture.minDist = Math.min(gesture.minDist || dist, dist);

        // ---- tilt ----------------------------------------------------------
        // Decided per finger, not from the midpoint: both have to have moved,
        // both have to be travelling mostly vertically, and both the same way.
        // Latched on the first real movement and never revisited, so a pinch
        // that develops later cannot steal a tilt already under way, and a
        // tilt cannot appear part way through a pinch.
        if (gesture.canTilt === undefined && gesture.ref.length >= 2) {
          // Measured from where the fingers were when the second one landed,
          // not from the previous frame. The browser fires one pointermove per
          // finger, so in any single call only one of them is new: comparing
          // both against the last frame meant "both moved" was never true on
          // the same tick and nothing was ever decided. MapLibre reads the
          // whole touch list at once and does not hit this.
          const a = { x: pts[0].x - gesture.ref[0].x, y: pts[0].y - gesture.ref[0].y };
          const b = { x: pts[1].x - gesture.ref[1].x, y: pts[1].y - gesture.ref[1].y };
          const movedA = Math.hypot(a.x, a.y) >= PITCH_MIN_MOVE;
          const movedB = Math.hypot(b.x, b.y) >= PITCH_MIN_MOVE;
          if (movedA && movedB) {
            gesture.canTilt =
              isVertical(a.x, a.y) && isVertical(b.x, b.y) && a.y > 0 === b.y > 0;
          } else if (movedA || movedB) {
            // One finger alone says nothing yet. Give the other a moment to
            // catch up, then take the silence as a no.
            gesture.firstMove ??= performance.now();
            if (performance.now() - gesture.firstMove > SINGLE_TOUCH_GRACE) {
              gesture.canTilt = false;
            }
          }
        }

        if (gesture.canTilt) gesture.tilting = true;

        // ---- zoom and rotate ------------------------------------------------
        //
        // Independent, and both allowed at once. This was one exclusive latch,
        // so whichever crossed its threshold first owned the whole gesture:
        // pinch to zoom and then twist, without lifting your fingers, and
        // nothing rotated. MapLibre registers these as separate handlers that
        // name each other as allowed —
        //
        //   _add("touchRotate", touchRotate, ["touchPan", "touchZoom"]);
        //   _add("touchZoom",   touchZoom,   ["touchPan", "touchRotate"]);
        //   _add("touchPitch",  touchPitch);
        //
        // so zoom, rotate and pan run together while pitch, with no allow-list
        // of its own, is the one that excludes everything else. That is why the
        // tilt latch above stays exclusive and these two do not.
        //
        // Each still has to cross its own threshold, measured from the start of
        // the gesture, which is what stops a slight unintended twist during a
        // pinch from spinning the mountain. Once engaged each applies only the
        // CURRENT frame's delta, so joining half way through a gesture does not
        // jump by everything that accumulated before it.
        if (!gesture.tilting && gesture.canTilt === false) {
          const zoomed = Math.abs(Math.log2(dist / (gesture.dist0 || dist)));
          // Arc travel, converted to an angle by the separation. See the note
          // on ROTATE_ARC: this is why a fixed angle gate cross-talks.
          const gate = (2 * ROTATE_ARC) / Math.max(gesture.minDist, 1);
          let swept = angle - gesture.angle0;
          if (swept > Math.PI) swept -= 2 * Math.PI;
          if (swept < -Math.PI) swept += 2 * Math.PI;
          if (zoomed >= ZOOM_START) gesture.zooming = true;
          if (Math.abs(swept) >= gate) gesture.rotating = true;
        }

        if (gesture.tilting) {
          const dy =
            ((pts[0].y - gesture.last[0].y) + (pts[1].y - gesture.last[1].y)) / 2;
          v.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, v.pitch - dy * pitchRate(v.zoom)));
        } else {
          if (gesture.rotating) {
            // Minus, and it matters. Screen y points down, so atan2 between the
            // two fingers grows as they turn clockwise, while the projection
            // turns the picture anticlockwise as bearing grows: a point to the
            // right of centre rises as bearing increases. Adding one to the
            // other rotated the mountain against the fingers. Pinned by "a
            // clockwise twist turns the mountain clockwise" in features, and by
            // the bearing check in field.test.js that this depends on.
            rotateAbout(v, -(turn * 180) / Math.PI);
          }
          if (gesture.zooming) {
            zoomAbout(v, dist / (gesture.dist || dist), c.x, c.y);
            v.zoom = v.targetZoom; // pinch tracks the fingers, no easing
          }
        }

        gesture.dist = dist;
        gesture.angle = angle;
        gesture.last = pts.map((q) => ({ ...q }));
      }

      gesture.x = c.x;
      gesture.y = c.y;
      dirty.current = true;
    };

    const up = (e) => {
      const wasPanning = pointers.size === 1;
      pointers.delete(e.pointerId);
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
      if (pointers.size) {
        startGesture();
        // Velocity is only tracked for one finger. Coming out of a pinch with
        // a stale value from before it flicked the map on release.
        velocity.x = 0;
        velocity.y = 0;
        movedAt = 0;
        return;
      }
      view.current.dragging = false;
      dirty.current = true; // let the spring run even if nothing else changed
      canvas.style.cursor = "grab";
      // Only now is it known whether that press was a tap or a drag.
      if (press) {
        const still = Math.hypot(e.clientX - press.x, e.clientY - press.y) < TAP_SLOP;
        const tapped = still && performance.now() - press.t < TAP_MS;
        /*
         * A tap on a place opens it, and does not also count towards a double
         * tap zoom.
         *
         * TAP_REACH is bigger than the marker: the disc is thirteen pixels
         * across and a fingertip is about forty-four, so hit testing the disc
         * itself asks for a precision nobody has with gloves on. Nearest wins
         * rather than first, so two markers close together open the one you
         * were actually going for.
         */
        const hit = tapped ? nearestPlace(e.clientX, e.clientY) : null;
        if (hit) {
          propsRef.current.onPlace?.(hit);
          lastTap = 0;
        } else {
          // A tap on bare mountain puts the card away, which is what every map
          // does and what a finger reaches for before it finds the close
          // button. It still counts towards a double tap zoom: dismissing is
          // not an action you took, it is one you stopped taking.
          if (tapped) propsRef.current.onPlace?.(null);
          lastTap = tapped ? performance.now() : 0;
        }
        press = null;
      }
      // Let go mid-flick and the map should keep going and settle, the way it
      // does in every map app. Without this a drag stops dead under your
      // thumb, which is the single thing that makes a map feel cheap.
      const speed = Math.hypot(velocity.x, velocity.y);
      if (wasPanning && speed > FLING_MIN) {
        // Scaled as a pair, so a capped flick keeps its direction.
        const keep = speed > GLIDE_MAX ? GLIDE_MAX / speed : 1;
        glide.x = velocity.x * keep;
        glide.y = velocity.y * keep;
        dirty.current = true;
      }
    };

    /**
     * Safari's own pinch, which touch-action does not cover.
     *
     * WebKit fires these non-standard gesture events for a two finger pinch
     * alongside the pointer events, and acts on them itself. `touch-action:
     * none` stops the scroll and the double tap zoom but not this, so on an
     * iPhone a pinch on the map could zoom Safari's page underneath the
     * gesture the map was already handling. Chromium does not implement them,
     * which is why no test here could have caught it.
     *
     * Scoped to the canvas on purpose: swallowing these document wide would
     * take Safari's accessibility zoom away from the whole app.
     */
    const SAFARI_GESTURES = ["gesturestart", "gesturechange", "gestureend"];
    const swallow = (e) => e.preventDefault();

    /**
     * Scroll to zoom, taken from MapLibre's scroll handler rather than guessed.
     *
     * What was here applied a flat 8% per event and ignored `deltaY` entirely,
     * which is wrong in three separate ways and they compound:
     *
     * A mouse notch is one event, so a notch moved 8% — barely anything. A
     * trackpad flick is a stream of thirty or forty small events, and each one
     * took its own full 8%: half a second of two-finger scroll is 1.08^40,
     * about seventeen times, straight into the clamp. Same code, same
     * gesture, and it was an order of magnitude too slow on one device and
     * two too fast on the other.
     *
     * `deltaMode` was ignored, so Firefox — which reports lines, about 3 per
     * notch, where Chrome reports 100 pixels — behaved differently again.
     *
     * And the trackpad-pinch branch, `1 - deltaY * 0.01`, goes to zero at a
     * delta of 100 and negative past it. A firm pinch multiplied the zoom by a
     * negative number and the map snapped to the far stop.
     *
     * So: normalise the delta to pixels, accumulate it, and apply it once per
     * rendered frame. Frequency stops mattering, which is the whole fix — what
     * you get depends on how far you scrolled, not on how many events your
     * hardware decided to send. The sigmoid is MapLibre's: smooth from no
     * movement, and a single frame can never do more than double or halve.
     */
    const WHEEL_LINE = 40;      // pixels per line, MapLibre's own constant
    const WHEEL_PAGE = 400;
    const WHEEL_RATE = 1 / 450; // a mouse notch, which is a coarse instrument
    const PINCH_RATE = 1 / 100; // a trackpad pinch, which is a deliberate size
    const wheel = (e) => {
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= WHEEL_LINE;
      else if (e.deltaMode === 2) d *= WHEEL_PAGE;
      wheelDelta += d;
      // Trackpad pinch arrives as a wheel event with ctrlKey set.
      wheelPinch = e.ctrlKey;
      wheelAt = { x: e.clientX, y: e.clientY };
      dirty.current = true;
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    for (const t of SAFARI_GESTURES) canvas.addEventListener(t, swallow, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("transitionend", onSettled, true);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
      for (const t of SAFARI_GESTURES) canvas.removeEventListener(t, swallow);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="app__map"
      style={{ touchAction: "none", cursor: "grab" }}
      aria-label="Terrain view of the resort, built from the route graph. Drag to orbit."
    />
  );
}
