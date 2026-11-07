// Let next/image optimise (AVIF/WebP, responsive sizes) pictures stored in Supabase Storage
const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost').hostname
module.exports = { images: { remotePatterns: [{ hostname: host }], formats: ['image/avif', 'image/webp'] } }
