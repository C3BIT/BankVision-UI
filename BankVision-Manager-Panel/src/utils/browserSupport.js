// @livekit/track-processors requires Insertable Streams for MediaStreamTrack
// (MediaStreamTrackProcessor/Generator) plus OffscreenCanvas — unsupported in
// Safari and Firefox as of writing. Check once so we can disable the
// virtual-background button instead of letting the user hit a thrown
// "not supported" error on click.
export const isVirtualBackgroundSupported =
  typeof MediaStreamTrackProcessor !== "undefined" &&
  typeof MediaStreamTrackGenerator !== "undefined" &&
  typeof OffscreenCanvas !== "undefined";
