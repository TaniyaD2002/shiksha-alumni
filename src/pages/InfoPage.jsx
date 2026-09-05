import { useState } from 'react'
import { Link } from 'react-router-dom'

function Highlights({ items }) {
  if (!items?.length) return null

  return (
    <div className="info-highlights">
      {items.map((item) => (
        <article className="info-card" key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>
      ))}
    </div>
  )
}

function Faq({ item, index }) {
  const [open, setOpen] = useState(index === 0)

  return (
    <div className={`faq${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="faq-q"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{item.q}</span>
        <span className="faq-mark" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && <p className="faq-a">{item.a}</p>}
    </div>
  )
}

/**
 * One layout for every section that is still a placeholder. Pass it a block
 * from src/content/pages.js.
 */
export default function InfoPage({ page, showHero = false }) {
  return (
    <>
      <section className="info-head">
        <p className="info-eyebrow">{page.eyebrow}</p>
        <h1 className="info-title">{page.title}</h1>
        <p className="info-lead">{page.lead}</p>

        {showHero && (
          <Link className="btn btn-primary info-cta" to="/alumni">
            Browse the alumni network
          </Link>
        )}
      </section>

      <Highlights items={page.highlights} />

      {page.sections?.map((section) => (
        <section className="info-section" key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>
      ))}

      {page.faqs && (
        <section className="faq-list">
          {page.faqs.map((item, index) => (
            <Faq key={item.q} item={item} index={index} />
          ))}
        </section>
      )}
    </>
  )
}
