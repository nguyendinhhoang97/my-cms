/**
 * Hằng số dùng chung cho authentication.
 */

/** Tên cookie chứa session id (httpOnly) */
export const SESSION_COOKIE_NAME = 'cms_session';

/** Cookie CSRF cho khách chưa đăng nhập (httpOnly) */
export const CSRF_COOKIE_NAME = 'cms_csrf';

/** Thời hạn session: 7 ngày */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Số lần đăng nhập sai tối đa trước khi khóa */
export const MAX_LOGIN_ATTEMPTS = 5;

/** Thời gian khóa sau khi vượt ngưỡng: 15 phút */
export const LOGIN_LOCK_DURATION_SECONDS = 15 * 60;

/** Chi phí bcrypt (cân bằng bảo mật / hiệu năng trên Workers) */
export const BCRYPT_ROUNDS = 10;

/** Độ dài tối thiểu mật khẩu */
export const MIN_PASSWORD_LENGTH = 8;
