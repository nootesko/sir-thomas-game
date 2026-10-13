// Colorful inline SVG icons for the interface (emoji fonts are missing on some devices). Any element with
// data-ic="name" gets the icon; icon(name) returns the markup for code-built UI.
const O = 'stroke="#1a0b1c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
export const ICONS = {
  bag: `<path d="M14 18c0-5 4-9 10-9s10 4 10 9" fill="none" ${O}/><path d="M8 20h32l-3 20a4 4 0 0 1-4 3H15a4 4 0 0 1-4-3z" fill="#c8823a" ${O}/><path d="M18 28h12" ${O} fill="none"/><circle cx="24" cy="28" r="3" fill="#ffd12a" ${O}/>`,
  shield: `<path d="M24 5l16 6v11c0 11-7 18-16 21C15 40 8 33 8 22V11z" fill="#3fa9ff" ${O}/><path d="M24 11l10 4v7c0 7-4 12-10 14z" fill="#ffd12a" opacity=".9"/>`,
  scroll: `<rect x="11" y="9" width="26" height="30" rx="3" fill="#f3e2b0" ${O}/><path d="M16 17h16M16 23h16M16 29h10" ${O} fill="none" stroke-width="2.5"/><rect x="8" y="6" width="32" height="6" rx="3" fill="#c8823a" ${O}/><rect x="8" y="36" width="32" height="6" rx="3" fill="#c8823a" ${O}/>`,
  map: `<path d="M6 12l12-4 12 4 12-4v28l-12 4-12-4-12 4z" fill="#8fd06a" ${O}/><path d="M18 8v28M30 12v28" ${O} fill="none" stroke-width="2.5"/><path d="M33 20l4 4m0-4l-4 4" stroke="#e0302a" stroke-width="3" stroke-linecap="round"/>`,
  gear: `<path d="M21 5h6l1 5 4 2 4-3 4 4-3 4 2 4 5 1v6l-5 1-2 4 3 4-4 4-4-3-4 2-1 5h-6l-1-5-4-2-4 3-4-4 3-4-2-4-5-1v-6l5-1 2-4-3-4 4-4 4 3 4-2z" fill="#b8b0c8" ${O}/><circle cx="24" cy="24" r="6" fill="#62395f" ${O}/>`,
  sword: `<path d="M10 38L32 9l6-2-2 6-29 22z" fill="#e8f0ff" ${O}/><path d="M9 31l8 8M6 42l5-5" ${O} fill="none"/><path d="M38 38L16 9l-6-2 2 6 29 22z" fill="#e8f0ff" ${O} opacity=".95"/><path d="M39 31l-8 8M42 42l-5-5" ${O} fill="none"/>`,
  dodge: `<path d="M8 16h18M4 24h24M8 32h18" ${O} fill="none" stroke="#fff"/><path d="M28 12l12 12-12 12" fill="none" ${O}/><path d="M28 12l12 12-12 12" fill="none" stroke="#9fe0ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  run: `<circle cx="29" cy="9" r="5" fill="#ffd12a" ${O}/><path d="M18 22l8-6 7 6 6 2M26 16l-3 12 8 6-2 9M23 28l-7 5-6-1" fill="none" ${O} stroke-width="5"/><path d="M18 22l8-6 7 6 6 2M26 16l-3 12 8 6-2 9M23 28l-7 5-6-1" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  heart: `<path d="M24 41S6 30 6 17a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 24-18 24z" fill="#ff5a5a" ${O}/>`,
  bolt: `<path d="M27 4L10 27h12l-3 17 19-25H26z" fill="#ffd12a" ${O}/>`,
  star: `<path d="M24 5l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" fill="#ffd12a" ${O}/>`,
  crit: `<path d="M24 4l4 13 13-6-7 12 12 5-13 3 5 13-11-8-6 12-2-13-13 3 9-10L6 16l13 3z" fill="#ff8a3a" ${O}/>`,
  snow: `<path d="M24 5v38M8 14l32 20M8 34l32-20" ${O} fill="none" stroke="#fff" stroke-width="4"/><path d="M24 5v38M8 14l32 20M8 34l32-20" fill="none" stroke="#7fc6ff" stroke-width="2"/>`,
  skull: `<path d="M24 6c-9 0-15 6-15 14 0 5 3 8 5 10v6h20v-6c2-2 5-5 5-10 0-8-6-14-15-14z" fill="#f0ecf8" ${O}/><circle cx="18" cy="21" r="4" fill="#1a0b1c"/><circle cx="30" cy="21" r="4" fill="#1a0b1c"/><path d="M20 36v5M24 36v5M28 36v5" ${O}/>`,
  hand: `<path d="M18 26V10a3 3 0 0 1 6 0v12-3a3 3 0 0 1 6 0v4-2a3 3 0 0 1 6 0v12c0 7-5 11-11 11-5 0-8-3-11-7l-5-7a3 3 0 0 1 5-3z" fill="#ffe0b8" ${O}/>`,
};
export const icon = (name, size = 24) => `<svg class="svgi" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${ICONS[name] || ''}</svg>`;
export function applyIcons(root = document) { root.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = icon(el.dataset.ic, +el.dataset.size || 28); }); }
