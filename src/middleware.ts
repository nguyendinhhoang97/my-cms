import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, locals, platform } = context;
  const pathname = url.pathname;
  
  // Inject database vào locals
  if (platform && platform.env) {
    locals.db = platform.env.DB;
  }
  
  // Lấy session từ cookie
  const sessionId = cookies.get('session')?.value;
  
  // Tạm thời lưu user vào locals
  if (sessionId) {
    locals.user = { id: 1, username: 'admin', role: 'admin' };
  } else {
    locals.user = null;
  }
  
  // Nếu vào admin mà chưa đăng nhập -> redirect về login
  if (pathname.startsWith('/admin') && !locals.user) {
    return context.redirect('/login');
  }
  
  // Nếu đã đăng nhập rồi mà vào login -> redirect về admin
  if (locals.user && pathname === '/login') {
    return context.redirect('/admin');
  }
  
  return next();
});