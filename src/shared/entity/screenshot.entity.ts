import { BelongsTo, Column, DataType, ForeignKey, Model, Table, AutoIncrement, PrimaryKey } from 'sequelize-typescript';
import { Build } from './build.entity.js';

@Table({
  tableName: 'Screenshots',
  timestamps: false,
})
export class Screenshot extends Model<Screenshot> {


  @Column({
    type: DataType.STRING,
    field: 'Project_id',
  })
  declare projectId: string;

  @Column({
    type: DataType.STRING,
    field: 'Build_id',
    primaryKey: true,
  })
  declare buildId: string;

  @Column({
    type: DataType.TEXT,
    field: 'Screenshot',
  })
  declare screenshot: string;

  @Column({
    type: DataType.STRING,
    field: 'Image_name',
    primaryKey: true,
  })
  declare imageName: string;

}
