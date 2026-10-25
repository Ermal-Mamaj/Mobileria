export const BRAND = 'Bella Casa';
export const BRAND_LINE = 'Mobilie për çdo dhomë të shtëpisë';

// The Bella Casa logo, shipped with the site (client/public/brand). A logo
// uploaded in the CMS (Cilësimet → Logoja) still takes the nav's place.
export const LOGO_FULL = '/brand/logo-full.webp';
export const LOGO_MARK = '/brand/logo-mark.png';

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

// WhatsApp chat link for a number typed any way ("+383 44 218 690",
// "044218690"…). Local Kosovo numbers starting with 0 get the 383 prefix.
// An optional message is prefilled in the chat.
export function whatsappUrl(number, message) {
  let digits = String(number).split('/')[0].replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `383${digits.slice(1)}`;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

// The CMS takes Facebook / Instagram as either a full link or a bare page
// name; both end up as a link.
export function socialUrl(network, value) {
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '').replace(/^(www\.)?(facebook|instagram)\.com\//i, '');
  return `https://www.${network}.com/${handle}`;
}
