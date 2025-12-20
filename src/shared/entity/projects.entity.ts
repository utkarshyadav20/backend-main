import { AutoIncrement, Column, DataType, HasMany, HasOne, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { FigmaScreens } from './figma-screens.entity.js';
import { Result } from './result.entity.js';

@Table({
  tableName: 'Projects',
  timestamps: false, // User didn't request timestamps, assuming strictly legacy/provided schema
})
export class Projects extends Model<Projects> {
  @PrimaryKey
  @Column({
    type: DataType.STRING,
    field: 'Project_id',
  })
  projectId: string;

  @Column({
    type: DataType.STRING,
    field: 'Project_Name',
  })
  projectName: string;

  @Column({
    type: DataType.STRING,
    field: 'Project_type',
  })
  projectType: string;

  @HasMany(() => FigmaScreens, { foreignKey: 'projectId' })
  figmaScreens: FigmaScreens[];

  @HasOne(() => Result, { foreignKey: 'projectId' })
  screenshots: Result;
}
