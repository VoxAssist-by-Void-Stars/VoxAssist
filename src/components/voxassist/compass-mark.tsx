import type { SVGProps } from "react"

/**
 * VoxAssist brand mark — the 3a "Compass" (4-point vault graph).
 * Monochrome, drawn with `currentColor` so it inherits the surrounding
 * text color: white on the violet login panel, violet on neutral chrome.
 * Drop-in replacement for the old `AudioLines` logo glyph.
 */
export function CompassMark({
  filled = false,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* connector arms */}
      <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
        <line x1="12" y1="8.4" x2="12" y2="6.6" />
        <line x1="15.6" y1="12" x2="17.4" y2="12" />
        <line x1="12" y1="15.6" x2="12" y2="17.4" />
        <line x1="8.4" y1="12" x2="6.6" y2="12" />
      </g>
      {/* N / E / S / W nodes */}
      <g fill="currentColor">
        <circle cx="12" cy="4.8" r="1.8" />
        <circle cx="19.2" cy="12" r="1.8" />
        <circle cx="12" cy="19.2" r="1.8" />
        <circle cx="4.8" cy="12" r="1.8" />
      </g>
      {/* open hub ring with void core — or a solid disc when `filled` */}
      {filled ? (
        <circle cx="12" cy="12" r="3.4" fill="currentColor" />
      ) : (
        <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth={1.8} />
      )}
    </svg>
  )
}
