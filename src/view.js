// Fixed top-down camera (Tibia-like): north is always up. Sprites lean back (tilt close to the camera pitch) so the three-quarter top-down art is shown almost undistorted; depth is taken from the feet (see billboard.js), so leaning never gets them cut by walls.
// roofs: draw roofs (off: Diablo/Tibia-3D look, interiors always visible); painter: depth-by-footprint hack for the sprite era
export const VIEW = { yaw: 0, pitch: 0.9, tilt: -0.55, dist: 17, minDist: 10, maxDist: 28, fov: 40, hands: false, roofs: false, painter: false };
