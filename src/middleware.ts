import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Redirect root to login — auth protection is handled by (app)/layout.tsx
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
