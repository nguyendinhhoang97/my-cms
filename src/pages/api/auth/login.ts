// src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData();
    const username = formData.get('username');
    const password = formData.get('password');
    
    console.log('Đang đăng nhập:', { username });
    
    // Kiểm tra tài khoản hardcode
    if (username === 'admin' && password === 'admin123') {
      // Set cookie session
      cookies.set('session', 'admin-session-id', {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 ngày
        secure: false, // tạm thời để false cho local
      });
      
      console.log('Đăng nhập thành công!');
      return redirect('/admin');
    }
    
    console.log('Sai tài khoản hoặc mật khẩu');
    return redirect('/login?error=invalid');
    
  } catch (error) {
    console.error('Lỗi:', error);
    return redirect('/login?error=server');
  }
};