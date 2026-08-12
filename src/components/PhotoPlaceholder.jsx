export function PhotoPlaceholder({ tall = false }) {
  return (
    <div className={`photo-drop${tall ? ' photo-drop-tall' : ''}`}>
      <svg
        className="photo-icon"
        viewBox="0 0 24 24"
        role="presentation"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="8.5" cy="10" r="1.6" fill="currentColor" />
        <path
          d="m4 17 4.8-4.8a1.5 1.5 0 0 1 2.1 0L15 16.3l1.7-1.7a1.5 1.5 0 0 1 2.1 0L21 16.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="photo-text">
        Alumni photo
        <span className="photo-sub">or browse files</span>
      </p>
    </div>
  )
}

export default PhotoPlaceholder
