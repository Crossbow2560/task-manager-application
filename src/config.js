module.exports = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/taskmanager',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  accessTtl: process.env.ACCESS_TTL || '15m',
  refreshTtl: process.env.REFRESH_TTL || '7d',
  dbPoolMax: Number(process.env.DB_POOL_MAX || 50),
  bcryptCost: Number(process.env.BCRYPT_COST || 10),
};
