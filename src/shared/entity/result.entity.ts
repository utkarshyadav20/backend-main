import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Projects } from './projects.entity.js';

export enum ResultStatus {
  PASS = 'pass',
  FAIL = 'fail',
  ERROR = 'error',
  IN_PROGRESS = 'inProgress',
  ON_HOLD = 'On Hold',
}

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
    type: DataType.STRING,
    field: 'result_status',
    allowNull: true,
  })
  declare resultStatus: ResultStatus;

  @Column({
    type: DataType.TEXT,
    field: 'heapmap_result',
    allowNull: true,
  })
  declare heapmapResult: string;

  @Column({
    type: DataType.JSONB,
    field: 'coordinates',
    allowNull: true,
  })
  declare coordinates: any;

  @Column({
    type: DataType.DATE,
    field: 'timestamp',
    allowNull: true,
  })
  declare timestamp: Date;

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
