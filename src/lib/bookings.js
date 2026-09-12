/**
 * When a booking stops counting as "upcoming".
 *
 * Both the alum's booking panel and the Your Sessions page ask this, and they
 * used to answer it separately — which is how past sessions ended up listed
 * under "Your upcoming sessions" on one screen but not the other. The clock is
 * the browser's, so a session drops out of the list as soon as its start time
 * passes for the student looking at it.
 */

/** True while `booking.scheduled_at` is still ahead of `now`. */
export function isUpcoming(booking, now = Date.now()) {
  return new Date(booking.scheduled_at).getTime() >= now
}

/**
 * Split bookings into `[upcoming, past]`. `upcoming` keeps the caller's order
 * (soonest first, as the queries sort them); `past` is reversed to put the most
 * recent session at the top.
 */
export function splitBookings(bookings, now = Date.now()) {
  const upcoming = []
  const past = []

  for (const booking of bookings) {
    if (isUpcoming(booking, now)) upcoming.push(booking)
    else past.push(booking)
  }

  past.reverse()
  return [upcoming, past]
}
