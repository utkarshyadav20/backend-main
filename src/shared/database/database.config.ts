import * as dotenv from 'dotenv';
dotenv.config();

import { IDatabaseConfigAttributes } from './interfaces/dbConfig.interface';

export const databaseConfig: IDatabaseConfigAttributes = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  dialect: 'postgres',
  url: process.env.DATABASE_URL,
  dialectOptions:
    (process.env.DB_HOST && process.env.DB_HOST.includes('supabase.com')) ||
    (process.env.DATABASE_URL &&
      process.env.DATABASE_URL.includes('supabase.com'))
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : undefined,
};

export default databaseConfig;
