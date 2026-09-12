import { Link } from 'react-router-dom'
import logoUrl from '../assets/Shiksha-Logo-Updated-1.png'

/**
 * The Shiksha brand mark. Swapping the artwork means replacing the file the
 * import above points at — nothing else moves.
 */
export default function Logo({ to = '/', className = '' }) {
  const image = (
    <img className="logo-img" src={logoUrl} alt="Shiksha" width="1080" height="480" />
  )

  if (!to) return <span className={`logo ${className}`.trim()}>{image}</span>

  return (
    <Link className={`logo ${className}`.trim()} to={to}>
      {image}
    </Link>
  )
}
