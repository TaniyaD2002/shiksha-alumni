/**
 * Sample photos for alumni who have not uploaded one.
 *
 * pravatar serves a fixed catalogue of portraits at `?img=N`. Left to pick at
 * random it returns whatever it likes, which produced some odd matches, so the
 * list below is a hand-picked subset: young, well-lit, straight-to-camera, no
 * sunglasses or costume. The seed is hashed, so a given alum always gets the
 * same face.
 *
 * This is only a fallback. Set `photo_url` on the alumni row to control exactly
 * which picture an alum gets.
 */
const SERVICE = 'https://i.pravatar.cc'
const SIZE = 600

/** Reviewed portraits from the pravatar catalogue. */
const CURATED = [5, 9, 12, 16, 26, 32, 36, 44, 47]

/** Small deterministic string hash - same seed in, same number out. */
function hash(seed) {
  let value = 0
  const text = String(seed ?? 'shiksha')

  for (let index = 0; index < text.length; index += 1) {
    value = (value * 31 + text.charCodeAt(index)) >>> 0
  }

  return value
}

export function sampleAvatar(seed) {
  const portrait = CURATED[hash(seed) % CURATED.length]
  return `${SERVICE}/${SIZE}?img=${portrait}`
}

/** An alum's real photo when there is one, otherwise a sample. */
export function alumniPhoto(alum) {
  return alum?.photo_url || sampleAvatar(alum?.id ?? alum?.name)
}
