import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { SEQUELIZE } from '../utils/constant/sequelize/sequelize-constant.js';
import databaseConfig from './database.config.js';
import { IDatabaseConfigAttributes } from './interfaces/dbConfig.interface.js';
import { Projects, FigmaScreens, Result, Build, Screenshot, ModelResult } from '../entity/index.js';

export const databaseProviders = [
  {
    provide: SEQUELIZE,
    useFactory: async () => {
      const config = databaseConfig as IDatabaseConfigAttributes;
      const sequelize = config.url
        ? new Sequelize(config.url, config as SequelizeOptions)
        : new Sequelize(config as SequelizeOptions);
      sequelize.addModels([Projects, FigmaScreens, Result, Build, Screenshot, ModelResult]);
      try {
        await sequelize.authenticate();
        // await sequelize.sync({ alter: false });
        console.log('Database connection has been established successfully.');
      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
      return sequelize;
    },
  },
];
