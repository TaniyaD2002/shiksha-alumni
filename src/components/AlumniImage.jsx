import { useEffect, useState } from 'react'
import { alumniPhoto } from '../lib/avatar'
import PhotoPlaceholder from './PhotoPlaceholder'

/**
 * An alum's photo: their own upload when there is one, otherwise a sample
 * portrait from the image service. Falls back to the drawn placeholder if
 * neither loads (offline, blocked, dead URL).
 */
export default function AlumniImage({ alum, tall = false }) {
  const src = alumniPhoto(alum)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (failed) return <PhotoPlaceholder tall={tall} />

  return (
    <img
      src={src}
      alt={alum?.name ? `${alum.name}` : ''}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
