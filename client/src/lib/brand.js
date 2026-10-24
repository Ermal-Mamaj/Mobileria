export const BRAND = 'Bella Casa';
export const BRAND_LINE = 'Mobilie për çdo dhomë të shtëpisë';

// Each room of the house is painted its own wall colour, in this order. The
// same room keeps the same colour on every page (it follows the room's
// position in the CMS list), so a visitor learns "the walnut room".
export const ROOM_TONES = ['walnut', 'sage', 'lake', 'ink', 'ochre', 'olive'];

export function roomTone(index) {
  if (index == null || index < 0) return ROOM_TONES[0];
  return ROOM_TONES[index % ROOM_TONES.length];
}

// The tone that comes after a room's own, for whatever sits next to it.
export function nextTone(tone) {
  const i = ROOM_TONES.indexOf(tone);
  return ROOM_TONES[(i + 1) % ROOM_TONES.length];
}

export function mapsUrl(address) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function telUrl(phone) {
  // "+383 44/49 218 690" style numbers carry two prefixes; dial the first.
  const first = String(phone).split('/')[0];
  const rest = String(phone).includes('/') ? String(phone).split('/')[1].replace(/^\d+/, '') : '';
  return `tel:${(first + rest).replace(/[^\d+]/g, '')}`;
}
