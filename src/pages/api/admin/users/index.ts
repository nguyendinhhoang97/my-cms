// src/pages/api/admin/users/index.ts
import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { getD1DB } from '../../../../lib/d1';

export const GET: APIRoute = async ({ locals, platform }) => {
  if (locals.user?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Không có quyền' }), { status: 403 });
  }
  
  try {
    const db = getD1DB(platform);
    const result = await db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY id DESC').all();
    
    return new Response(JSON.stringify(result.results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GET users error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, locals, platform }) => {
  if (locals.user?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Không có quyền' }), { status: 403 });
  }
  
  try {
    const formData = await request.formData();
    const username = formData.get('username')?.toString();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const role = formData.get('role')?.toString() || 'editor';
    
    if (!username || !email || !password) {
      return new Response(JSON.stringify({ error: 'Vui lòng nhập đầy đủ thông tin' }), { status: 400 });
    }
    
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }), { status: 400 });
    }
    
    const db = getD1DB(platform);
    
    // Kiểm tra username đã tồn tại
    const existingUser = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Tên đăng nhập đã tồn tại' }), { status: 400 });
    }
    
    // Kiểm tra email đã tồn tại
    const existingEmail = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existingEmail) {
      return new Response(JSON.stringify({ error: 'Email đã được sử dụng' }), { status: 400 });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    
    await db.prepare(`
      INSERT INTO users (username, email, password_hash, role, created_at) 
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(username, email, password_hash, role).run();
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST users error:', error);
    return new Response(JSON.stringify({ error: 'Lỗi server: ' + error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};