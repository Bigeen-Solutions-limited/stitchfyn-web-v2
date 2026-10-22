// Photo file types every upload accepts. Listing exact types (not image/*) makes iPhones hand over a JPEG instead of
// HEIC, which the server can't read. Shared by the fabric, progress and material photo inputs.
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
