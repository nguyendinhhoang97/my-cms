// src/pages/api/admin/users/[id].ts
import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { getD1DB } from '../../../../lib/d1';

export const DELETE: APIRoute = async ({ params, locals, platform }) => {
  if (locals.user?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Không có quyền' }), { status: 403 });
  }
  
  const id = parseInt(params.id);
  
  if (id === locals.user.id) {
    return new Response(JSON.stringify({ error: 'Không thể xóa chính mình' }), { status: 400 });
  }
  
  try {
    const db = getD1DB(platform);
    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ params, request, locals, platform }) => {
  if (locals.user?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Không có quyền' }), { status: 403 });
  }
  
  const id = parseInt(params.id);
  
  try {
    const formData = await request.formData();
    const role = formData.get('role')?.toString();
    const password = formData.get('password')?.toString();
    
    const db = getD1DB(platform);
    
    if (password && password.length >= 6) {
      const password_hash = await bcrypt.hash(password, 10);
      await db.prepare('UPDATE users SET role = ?, password_hash = ? WHERE id = ?')
        .bind(role, password_hash, id)
        .run();
    } else if (role) {
      await db.prepare('UPDATE users SET role = ? WHERE id = ?')
        .bind(role, id)
        .run();
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('PUT error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};