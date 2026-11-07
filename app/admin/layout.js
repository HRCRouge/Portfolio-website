// Keeps the admin page out of search engines (the page itself is a client component and can't export metadata)
export const metadata = { robots: 'noindex, nofollow' }
export default function AdminLayout({ children }) { return children }
