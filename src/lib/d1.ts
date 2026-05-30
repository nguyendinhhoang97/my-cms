// src/lib/d1.ts
let cachedDB: any = null;

export function getD1DB(platform: any) {
  // Trong môi trường production (Cloudflare)
  if (platform && platform.env && platform.env.DB) {
    return platform.env.DB;
  }
  
  // Trong môi trường development
  if (cachedDB) return cachedDB;
  
  // Tạo mock database cho dev (chỉ để tránh lỗi)
  cachedDB = {
    prepare: (sql: string) => ({
      bind: (...params: any[]) => ({
        all: async () => ({ results: [] }),
        first: async () => null,
        run: async () => ({ success: true })
      })
    })
  };
  
  return cachedDB;
}