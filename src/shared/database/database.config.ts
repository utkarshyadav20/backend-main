import { IDatabaseConfigAttributes } from './interfaces/dbConfig.interface';

export const databaseConfig: IDatabaseConfigAttributes = {
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '8075',
  database: process.env.DB_NAME || 'compareUi',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  dialect: 'postgres',
};

export default databaseConfig;
