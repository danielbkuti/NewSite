import { cn } from '@/lib/utils'

// The Fauxcus wordmark — see design-elements.md for the full spec this
// implements. One component covers every in-app placement instead of each
// page hand-rolling its own gradient-clip-text span (which is what this
// app used to do for "FlexMaster", and how NavBar/LandingPage/the auth
// forms all ended up on three *different*, none-of-them-brand gradients).
//
// Construction: the word "Fauxcus" in Sora 700 inside a rounded tile, a
// square notch cut from the tile's bottom-right corner holding a check.
// Two tile variants, both settled on (after a few rounds of iteration —
// see the git history for the ones that didn't stick) as the permanent
// look everywhere a Fauxcus mark appears, not per-instance overrides:
//   - 'color' (default): the brand gradient tile, starfield-clipped
//     letters, a starfield-filled notch. For light/neutral grounds.
//   - 'black': a starfield-filled tile with a gradient outline,
//     gradient-clipped letters, a gradient-filled notch. For dark or
//     already-gradient/photographic grounds (design-elements.md's
//     "inverse lockup") — e.g. this app's dark Footer, and NavBar's
//     scrolled state.
// In both, the check inside the notch isn't drawn in its own color —
// it's a checkmark-shaped cutout (a CSS mask, see `checkCutoutMask`
// below) punched through the notch's fill, revealing the tile's own
// background underneath in the check's shape: starfield-through-
// gradient-notch on the color tile, gradient-through-starfield-notch on
// the black one.
//
// Deviation from design-elements.md, per explicit request: the doc's
// letter treatment is a CSS-simulated starfield (dot pattern) for the
// color tile and the brand gradient for the black tile. Both are replaced
// here with the actual constellation photo (`/starfield-bg.jpg`,
// Texturelabs_Sky_143L.jpg downsized for the web) clipped to the text —
// "ignore what is there, make the text transparent, use this as a
// background, and similarly for the black variant."
//
// Sizes are the two lockups design-elements.md actually gives call sites
// for (§6 "In-app placement" only ever asks for the 32px/secondary scale;
// §3 also specifies a 74px/primary scale for anywhere a bigger lockup is
// wanted later) plus the icon scale for anywhere too small for the photo
// to read as anything but noise — literal pixel values from §3, not a
// fluid/interpolated scale.
// Padding, outlineStroke, and lip below are per logo-outline-handoff.md
// (white outline traced around the letterforms, a white "lip" along the
// notch's top/left edge, and a shorter/wider tile so the notch keeps
// room for the check to read) — the rest of each scale is unchanged
// from before that pass. The outline itself is a stroked copy of the
// word behind the filled glyph, not a single-span paintOrder stroke —
// see the lettering render below for why.
const SCALES = {
  primary: {
    fontSize: 74,
    tracking: '-0.05em',
    tileRadius: 34,
    padding: '24px 50px 24px 44px',
    notch: 44,
    checkSize: 26,
    checkStroke: 3.4,
    starfield: true,
    outlineStroke: 3,
    lip: 2,
  },
  secondary: {
    fontSize: 32,
    tracking: '-0.04em',
    tileRadius: 16,
    padding: '10px 25px 10px 21px',
    notch: 20,
    checkSize: 12,
    checkStroke: 4.2,
    starfield: true,
    outlineStroke: 1.4,
    lip: 1.5,
  },
  // Below 30px type the photo has no room to read as stars — it's just
  // texture noise — so this scale drops it for a plain solid fill
  // instead, per design-elements.md's own "don't apply the starfield
  // below 30px type" rule. Padding is scaled down from secondary's own
  // ratios (no icon-scale padding is given in the spec). The white
  // outline still applies here — it's what keeps the mark legible at
  // 17px, per logo-outline-handoff.md.
  icon: {
    fontSize: 17,
    tracking: '-0.04em',
    tileRadius: 8.5,
    padding: '5px 14px 5px 12px',
    notch: 12,
    checkSize: 8,
    checkStroke: 5.5,
    starfield: false,
    outlineStroke: 0.7,
    lip: 1,
  },
}

const OUTLINE_COLOR = '#ffffff'
const BRAND_GRADIENT = 'linear-gradient(to bottom right, #e0c3fc, #7c5fb0, #8ec5fc)'
const STARFIELD_IMAGE = 'url(/starfield-bg.jpg) center/cover'
// Lucide's own "check" glyph path, in its native 24×24 viewBox —
// reproduced literally (frontend/node_modules/lucide-react/dist/esm/icons/check.mjs)
// rather than rendered via <Check>, since it's used here as a mask
// shape (see checkCutoutMask) rather than a drawn, colored icon.
const CHECK_PATH = 'M20 6 9 17l-5-5'

// Per-variant fills, applied everywhere a Logo appears — not
// per-instance overrides. `tile` and `notch` are literal CSS
// `background` values; `letters` picks which of the two `letterStyle`
// treatments below applies.
const VARIANT = {
  color: { tile: BRAND_GRADIENT, notch: STARFIELD_IMAGE, letters: 'starfield' },
  // The starfield tile is the one place `.gradient-ring` (index.css)
  // earns its keep — plain ink held its own edge against Footer's flat
  // dark ground, but a *photo* tile can still blend into something
  // busier around it.
  black: { tile: STARFIELD_IMAGE, notch: BRAND_GRADIENT, letters: 'gradient' },
}

// The check inside the notch is a cutout, not a drawn icon — a CSS
// mask punched through the notch's own fill in the checkmark's shape,
// so whatever's underneath (the tile's own background — the notch is
// its child, painted directly on top of it) shows through in that
// shape: starfield glinting through the gradient notch on the black
// tile, the gradient through the starfield notch on the color tile.
//
// Two mask-image LAYERS combined with mask-composite, exactly the
// technique `.gradient-ring` (index.css) already uses for its own ring
// cutout — not a single SVG with a white rect + a black check drawn on
// top of it, which was the first version of this and didn't actually
// cut anything: `mask-mode` defaults to `match-source`, which for an
// image-referenced mask (not a literal inline `<mask>` element)
// resolves to *alpha*, not luminance, in this environment — and a
// solid white rect with an opaque black shape painted on it has no
// alpha variation anywhere (both are 100% opaque), so nothing was ever
// masked out. Two separate single-shape layers (an opaque full-box
// rect; an opaque check stroke, nothing else — everywhere else in each
// SVG is genuinely transparent, alpha 0, just by not being painted)
// XORed via mask-composite sidesteps luminance entirely: overlap
// between the two (the check, since it sits inside the rect) cancels
// to alpha 0, everywhere the rect alone covers stays alpha 1. The
// check's `d` is lucide's own `check` path, scaled from its native
// 24×24 box down to `checkSize` and centered in the `notchSize` box —
// the same sizing/centering `width/height` + flex-centering used to
// give <Check> before any of this.
function checkCutoutMask(notchSize, checkSize, checkStroke) {
  const offset = (notchSize - checkSize) / 2
  const scale = checkSize / 24
  const svgUri = (body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${notchSize}" height="${notchSize}">${body}</svg>`)}")`
  const fullRect = svgUri(`<rect width="${notchSize}" height="${notchSize}" fill="#fff"/>`)
  const checkOnly = svgUri(
    `<path d="${CHECK_PATH}" fill="none" stroke="#fff" stroke-width="${checkStroke}" ` +
      `stroke-linecap="round" stroke-linejoin="round" transform="translate(${offset} ${offset}) scale(${scale})"/>`
  )
  return `${fullRect}, ${checkOnly}`
}

export function Logo({ variant = 'color', scale = 'secondary', sizeScale = 1, className }) {
  const s = SCALES[scale]
  const v = VARIANT[variant]
  const isBlack = variant === 'black'
  // Icon scale drops the photo for the letters specifically (too small
  // to read as anything but noise — see the SCALES comment above); a
  // gradient has no equivalent size floor, so the black variant keeps
  // its gradient lettering at every scale, only the color variant's
  // falls back to solid ink.
  const resolvedLetterFill = s.starfield ? v.letters : 'solid'

  const letterStyle =
    resolvedLetterFill === 'gradient'
      ? {
          backgroundImage: BRAND_GRADIENT,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
        }
      : resolvedLetterFill === 'starfield'
        ? {
            backgroundImage: 'url(/starfield-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          }
        : { color: '#0d0d16' }

  const checkMask = checkCutoutMask(s.notch, s.checkSize, s.checkStroke)

  const lettersBaseStyle = {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: s.fontSize,
    lineHeight: 1,
    letterSpacing: s.tracking,
    whiteSpace: 'nowrap',
  }

  return (
    <span
      className={cn('relative inline-block overflow-hidden align-middle', className)}
      style={{
        borderRadius: s.tileRadius,
        padding: s.padding,
        transform: sizeScale === 1 ? undefined : `scale(${sizeScale})`,
        background: v.tile,
      }}
    >
      {isBlack && <span aria-hidden="true" className="gradient-ring" />}

      {resolvedLetterFill === 'solid' ? (
        // Icon scale's lettering is already opaque ink, so the fill
        // itself covers the inner half of a centred stroke — one span,
        // `paintOrder: 'stroke fill'` puts the stroke under the glyph.
        <span
          aria-hidden="true"
          style={{
            ...lettersBaseStyle,
            ...letterStyle,
            WebkitTextStroke: `${s.outlineStroke}px ${OUTLINE_COLOR}`,
            paintOrder: 'stroke fill',
          }}
        >
          Fauxcus
        </span>
      ) : (
        // Starfield/gradient lettering has a *transparent* fill
        // (background-clip: text), so there's nothing opaque to hide a
        // centred stroke's inner half — `paintOrder` alone left the
        // letterforms' counters closed up. Instead: a stroked, unfilled
        // copy sits behind the real glyph, and the real glyph's own
        // image fill masks the stroke's inner half, leaving only the
        // outer half visible (net outline ≈ half of outlineStroke). Both
        // copies must share every metric (font/size/tracking/nowrap) or
        // the contours drift apart — see logo-outline-handoff.md.
        <span style={{ position: 'relative', display: 'block' }}>
          <span
            aria-hidden="true"
            style={{
              ...lettersBaseStyle,
              position: 'absolute',
              left: 0,
              top: 0,
              background: 'none',
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
              WebkitTextStroke: `${s.outlineStroke}px ${OUTLINE_COLOR}`,
            }}
          >
            Fauxcus
          </span>
          <span aria-hidden="true" style={{ ...lettersBaseStyle, ...letterStyle, position: 'relative' }}>
            Fauxcus
          </span>
        </span>
      )}
      {/* Visually identical text for anything that reads the DOM (a11y
          tree, copy/paste, find-in-page) — the span above is aria-hidden
          since its "text" is really an image fill. */}
      <span className="sr-only">Fauxcus</span>

      {/* The notch "lip" — a white edge along its top and left, so the
          notch reads as a cut rather than a smudge where the two dark
          fills meet. Two plain bars, siblings of the notch and rendered
          before it in the tree so the notch's own check cutout still
          reveals the tile underneath, not these bars. Can't be a border/
          box-shadow on the notch itself — the notch is masked, and the
          mask would clip those too. */}
      <span
        aria-hidden="true"
        className="absolute right-0"
        style={{ bottom: s.notch, width: s.notch + s.lip, height: s.lip, background: OUTLINE_COLOR }}
      />
      <span
        aria-hidden="true"
        className="absolute bottom-0"
        style={{ right: s.notch, width: s.lip, height: s.notch, background: OUTLINE_COLOR }}
      />

      <span
        aria-hidden="true"
        className="absolute right-0 bottom-0"
        style={{
          width: s.notch,
          height: s.notch,
          background: v.notch,
          WebkitMaskImage: checkMask,
          maskImage: checkMask,
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
    </span>
  )
}
