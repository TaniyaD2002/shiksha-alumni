/**
 * Placeholder copy for the sections that are not built yet.
 *
 * The structure is real — headings, lead paragraph, body sections, cards — so
 * the layout can be reviewed now and the Lorem Ipsum swapped for Shiksha's own
 * copy later without touching any component.
 */

const LOREM_SHORT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

const LOREM_LONG =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'

export const HOME = {
  eyebrow: 'Placeholder content',
  title: 'Shiksha',
  lead: LOREM_LONG,
  highlights: [
    { title: 'Lorem ipsum', body: LOREM_SHORT },
    { title: 'Dolor sit amet', body: LOREM_SHORT },
    { title: 'Consectetur elit', body: LOREM_SHORT },
  ],
  sections: [
    { heading: 'Sed do eiusmod', body: LOREM_LONG },
    { heading: 'Tempor incididunt', body: LOREM_LONG },
  ],
}

export const ABOUT = {
  eyebrow: 'Placeholder content',
  title: 'About Us',
  lead: LOREM_LONG,
  highlights: [
    { title: 'Our story', body: LOREM_SHORT },
    { title: 'Our mission', body: LOREM_SHORT },
    { title: 'Our team', body: LOREM_SHORT },
  ],
  sections: [
    { heading: 'Ut enim ad minim', body: LOREM_LONG },
    { heading: 'Quis nostrud exercitation', body: LOREM_LONG },
    { heading: 'Duis aute irure', body: LOREM_LONG },
  ],
}

export const PROGRAMME = {
  eyebrow: 'Placeholder content',
  title: 'Programme',
  lead: LOREM_LONG,
  highlights: [
    { title: 'Stage one', body: LOREM_SHORT },
    { title: 'Stage two', body: LOREM_SHORT },
    { title: 'Stage three', body: LOREM_SHORT },
    { title: 'Stage four', body: LOREM_SHORT },
  ],
  sections: [
    { heading: 'Excepteur sint occaecat', body: LOREM_LONG },
    { heading: 'Cupidatat non proident', body: LOREM_LONG },
  ],
}

export const FAQS = {
  eyebrow: 'Placeholder content',
  title: 'FAQs',
  lead: LOREM_SHORT,
  faqs: [
    { q: 'Lorem ipsum dolor sit amet?', a: LOREM_LONG },
    { q: 'Consectetur adipiscing elit?', a: LOREM_LONG },
    { q: 'Sed do eiusmod tempor incididunt?', a: LOREM_LONG },
    { q: 'Ut labore et dolore magna aliqua?', a: LOREM_LONG },
    { q: 'Quis nostrud exercitation ullamco?', a: LOREM_LONG },
    { q: 'Duis aute irure dolor in reprehenderit?', a: LOREM_LONG },
  ],
}
