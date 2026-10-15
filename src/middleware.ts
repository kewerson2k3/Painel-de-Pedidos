import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'painel_session';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // Arquivos estáticos e rotas públicas que não precisam de autenticação
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.includes('.') || // Qualquer arquivo estático com extensão (.png, .ico, .svg, etc.)
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Se já estiver logado e tentar acessar /login, redireciona para a home
  if (pathname === '/login') {
    if (token) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Se não estiver logado e tentar acessar qualquer outra página protegida
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
