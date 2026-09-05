/**
 * Sample photos for alumni who have not uploaded one.
 *
 * pravatar.cc returns a stable portrait for a given `u` seed, so the same
 * alum keeps the same face across reloads and across devices. Swap the base
 * URL here if you move to a different image service.
 */
const SERVICE = 'https://i.pravatar.cc'

export function sampleAvatar(seed, size = 400) {
  const key = encodeURIComponent(String(seed ?? 'shiksha'))
  return `${SERVICE}/${size}?u=${key}`
}

/** An alum's real photo when there is one, otherwise a sample. */
export function alumniPhoto(alum, size = 400) {
  return alum?.photo_url || sampleAvatar(alum?.id ?? alum?.name, size)
}
