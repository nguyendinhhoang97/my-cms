/**
 * POST /api/auth/register
 * Đăng ký tài khoản mới (role mặc định: author).
 */

import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { users } from '../../../../db/schema';
import {
	errorResponse,
	parseRequestBody,
	safeRedirect,
	successResponse,
	wantsJsonResponse,
} from '../../../lib/api';
import { BCRYPT_ROUNDS, MIN_PASSWORD_LENGTH } from '../../../lib/constants';
import { validateCsrfToken } from '../../../lib/csrf';
import { getDb } from '../../../lib/db';
import { findUserByEmail, findUserByUsername } from '../../../lib/auth';
import {
	isValidEmail,
	isValidUsername,
	normalizeEmail,
	normalizeUsername,
} from '../../../lib/security';
import { getSessionIdFromCookies } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
	const db = getDb();
	const body = await parseRequestBody(request);

	const csrfOk = await validateCsrfToken({
		db,
		cookies,
		sessionId: getSessionIdFromCookies(cookies),
		submittedToken: body.csrf_token,
	});

	if (!csrfOk) {
		return errorResponse('Token CSRF không hợp lệ.', 403);
	}

	const username = normalizeUsername(body.username ?? '');
	const email = normalizeEmail(body.email ?? '');
	const password = body.password ?? '';
	const passwordConfirm = body.password_confirm ?? '';

	if (!username || !email || !password) {
		return errorResponse('Vui lòng điền đầy đủ thông tin.', 400);
	}

	if (!isValidUsername(username)) {
		return errorResponse(
			'Username phải 3–32 ký tự, chỉ chữ thường, số và gạch dưới.',
			400,
		);
	}

	if (!isValidEmail(email)) {
		return errorResponse('Email không hợp lệ.', 400);
	}

	if (password.length < MIN_PASSWORD_LENGTH) {
		return errorResponse(`Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`, 400);
	}

	if (password !== passwordConfirm) {
		return errorResponse('Mật khẩu xác nhận không khớp.', 400);
	}

	if (await findUserByUsername(db, username)) {
		return errorResponse('Username đã được sử dụng.', 409);
	}

	if (await findUserByEmail(db, email)) {
		return errorResponse('Email đã được đăng ký.', 409);
	}

	const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

	await db.insert(users).values({
		username,
		email,
		passwordHash,
		role: 'author',
	});

	if (wantsJsonResponse(request)) {
		return successResponse({ message: 'Đăng ký thành công.' }, 201);
	}

	return safeRedirect('/login?registered=1');
};
