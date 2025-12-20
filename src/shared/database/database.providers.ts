import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { SEQUELIZE } from '../utils/constant/sequelize/sequelize-constant.js';
import databaseConfig from './database.config.js';
import { Projects, FigmaScreens, Result, Build, Screenshot } from '../entity/index.js';

export const databaseProviders = [
  {
    provide: SEQUELIZE,
    useFactory: async () => {
      const config = databaseConfig as SequelizeOptions;
      const sequelize = new Sequelize(config);
      sequelize.addModels([Projects, FigmaScreens, Result, Build, Screenshot]);
      try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
      return sequelize;
    },
  },
];
