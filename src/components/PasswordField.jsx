import { useId, useState } from 'react'

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
      <path
        d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      {off && (
        <path
          d="M4 20 20 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

/** Password input with a show/hide toggle. */
export default function PasswordField({
  label = 'Password',
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  minLength,
  required = true,
  hint,
}) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="password-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon off={visible} />
        </button>
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
