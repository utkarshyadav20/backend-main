import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Projects } from './projects.entity.js';

@Table({
  tableName: 'Result',
  timestamps: false,
})
export class Result extends Model<Result> {
  @PrimaryKey


  @PrimaryKey
  @ForeignKey(() => Projects)
  @Column({
    type: DataType.STRING,
    field: 'Project_id',
  })
  declare projectId: string;

  @PrimaryKey
  @Column({
    type: DataType.STRING,
    field: 'image_name',
    allowNull: true,
  })
  declare imageName: string;

  @Column({
      type: DataType.INTEGER,
      field: 'diff_percent',
      allowNull: true,
  })
  declare diffPercent: number;

  @Column({
      type: DataType.INTEGER,
      field: 'result_status',
      allowNull: true,
  })
  declare resultStatus: number;

  @Column({
    type: DataType.TEXT,
    field: 'heapmap_result',
    allowNull: true,
  })
  declare heapmapResult: string;

  @PrimaryKey
  @Column({
    type: DataType.STRING,
    field: 'Build_id',
    allowNull: true,
  })
  declare buildId: string;

  @BelongsTo(() => Projects)
  declare project: Projects;
}
