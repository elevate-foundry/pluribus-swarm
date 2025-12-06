import { Link } from 'wouter'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-cinzel mb-4">404</h1>
        <p className="text-gray-400 mb-8">Page not found</p>
        <Link href="/">
          <a className="px-6 py-3 bg-white/10 rounded hover:bg-white/20 transition">
            Return Home
          </a>
        </Link>
      </div>
    </div>
  )
}
