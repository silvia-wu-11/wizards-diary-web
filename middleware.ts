import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const AUTH_ROUTES = ['/login', '/register'];
const PROTECTED_PREFIXES = ['/', '/diary', '/book'];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function isProtectedRoute(pathname: string) {
  // 首页允许未登录访问（用于新用户引导）
  if (pathname === '/') return false;
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!req.auth;

  // API auth 路由由 NextAuth 处理
  if (pathname.startsWith('/api/auth')) return NextResponse.next();

  // 已登录访问登录/注册页 → 重定向首页
  if (isAuthRoute(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // 未登录访问需鉴权路由 → 重定向登录页，保留 from
  if (isProtectedRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
