import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({
  tableName: 'Builds',
  timestamps: false,
})
export class Build extends Model<Build> {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    field: 'Build_id',
  })
  declare buildId: string;

  @Column({
    type: DataType.STRING,
    field: 'Project_id',
  })
  declare projectId: string;

  @Column({
    type: DataType.STRING,
    field: 'Build_name',
    allowNull: true,
  })
  declare buildName: string;

  @Column({
    type: DataType.DATE,
    field: 'last_compared',
    allowNull: true,
  })
  declare lastCompared: Date;

  @Column({
    type: DataType.BOOLEAN,
    field: 'comparison_running',
    allowNull: true,
    defaultValue: false,
  })
  declare comparisonRunning: boolean;
}
