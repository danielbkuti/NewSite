const COLUMNS = [
  {
    heading: 'Product',
    links: ['Features', 'Pricing', 'Integrations', 'Changelog'],
  },
  {
    heading: 'Company',
    links: ['About us', 'Careers', 'Contact us', 'Blog'],
  },
  {
    heading: 'Resources',
    links: ['Help center', 'Docs', 'Community', 'Status'],
  },
  {
    heading: 'Legal',
    links: ['Privacy policy', 'Terms of service', 'Cookie policy'],
  },
]

// Persistent footer at the bottom of every authenticated page. Content
// is the standard placeholder set for a page like this (About/Contact/
// etc.) — plain <span>s, not real <a> links, since none of these go
// anywhere yet and a href="#" would just jump the page to the top.
// The top edge is clipped into a gentle upward slope rather than a
// plain straight line, so the section break reads as a deliberate
// design choice rather than the page just stopping.
export function Footer() {
  return (
    <footer
      className="relative mt-16 bg-neutral-900 pt-20 pb-10 text-neutral-300"
      style={{ clipPath: 'polygon(0 40px, 100% 0, 100% 100%, 0 100%)' }}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-10 px-6 sm:grid-cols-4">
        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <h4 className="mb-3 text-sm font-semibold text-white">{column.heading}</h4>
            <ul className="flex flex-col gap-2 text-sm">
              {column.links.map((link) => (
                <li key={link}>
                  <span className="cursor-default transition-colors hover:text-white">
                    {link}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center gap-3 border-t border-white/10 px-6 pt-6 text-xs text-neutral-500 sm:flex-row sm:justify-between">
        <span className="bg-gradient-to-r from-[#e0c3fc] via-[#b79ce0] to-[#8ec5fc] bg-clip-text font-bold text-transparent">
          FlexMaster
        </span>
        <span>© {new Date().getFullYear()} FlexMaster. All rights reserved.</span>
      </div>
    </footer>
  )
}
