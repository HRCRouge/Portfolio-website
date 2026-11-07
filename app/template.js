// A template re-mounts on every page change, which replays the fade-in animation (see .page in globals.css)
export default function Template({ children }) {
  return <div className="page">{children}</div>
}
