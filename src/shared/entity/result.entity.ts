import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Projects } from './projects.entity.js';

@Table({
  tableName: 'Result',
  timestamps: false,
})
export class Result extends Model<Result> {
  @PrimaryKey
  @ForeignKey(() => Projects)
  @Column({
    type: DataType.STRING,
    field: 'Project_id',
  })
  projectId: string;

  @Column({
    type: DataType.STRING,
    field: 'image_name',
    allowNull: true,
  })
  imageName: string;

  @Column({
      type: DataType.INTEGER,
      field: 'diff_percent',
      allowNull: true,
  })
  diffPercent: number;

  @Column({
      type: DataType.INTEGER,
      field: 'result_status',
      allowNull: true,
  })
  resultStatus: number;

  @Column({
      type: DataType.BLOB,
      field: 'heapmap_result',
      allowNull: true,
  })
  heapmapResult: any

  @Column({
    type: DataType.STRING,
    field: 'Build_id',
    allowNull: true,
  })
  buildId: string;

  @BelongsTo(() => Projects)
  project: Projects;
}
