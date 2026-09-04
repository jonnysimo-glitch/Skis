/**
 * Lat/lon to local metres, centred on a resort.
 *
 * The 3D layer needs node positions in metres on a flat plane to place them on
 * the terrain mesh. Over a single ski area — twenty kilometres at most — a
 * plate carrée about the area's own centre is accurate to well under a metre,
 * which is far below the precision of the pistes themselves.
 *
 * This lived in resort.js, closed over that one node set. A generated resort
 * module has no copy of it, and src/map/field.test.js had already written its
 * own "projector for any node set, the same maths resort.js uses" — two
 * reimplementations of one formula is the signal it belongs here.
 */

/** Metres per degree of latitude. Constant enough at this scale. */
const M_PER_LAT = 111320;

export function projectorFor(nodes) {
  const values = Object.values(nodes);
  if (!values.length) throw new Error("projectorFor needs at least one node");

  const lats = values.map((n) => n.lat);
  const lons = values.map((n) => n.lon);
  // The centre of the bounding box, not the mean: a resort with thirty nodes
  // clustered round one base and three up a valley should still be centred on
  // the terrain it covers rather than dragged towards the crowd.
  const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon0 = (Math.min(...lons) + Math.max(...lons)) / 2;
  const mPerLon = M_PER_LAT * Math.cos((lat0 * Math.PI) / 180);

  return {
    lat0,
    lon0,
    // North is -z: the projection looks along +z, so this keeps north away
    // from the camera at a bearing of zero.
    project: (lat, lon) => ({ x: (lon - lon0) * mPerLon, z: -(lat - lat0) * M_PER_LAT }),
  };
}
