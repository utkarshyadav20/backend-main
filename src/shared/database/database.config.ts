import * as dotenv from 'dotenv';
dotenv.config();

import { IDatabaseConfigAttributes } from './interfaces/dbConfig.interface';

const isSupabase =
  process.env.DATABASE_URL?.includes('supabase.com') ||
  process.env.DB_HOST?.includes('supabase.com');

export const databaseConfig: IDatabaseConfigAttributes = isSupabase
  ? {
      dialect: 'postgres',
      url: process.env.DATABASE_URL,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }
  : {
      dialect: 'postgres',
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT
        ? parseInt(process.env.DB_PORT, 10)
        : 5432,
    };

export default databaseConfig;
