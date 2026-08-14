import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'kairo_pragmatic_planner_jwt_secret_key_2026',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'AV-B8WJ52h3P-e5G0lJ1l4Yv_w2lG8X1x1F6B1G6A3M',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@pragmaticplanner.app',
  },
};
