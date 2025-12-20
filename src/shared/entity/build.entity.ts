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
  buildId: string;

  @Column({
    type: DataType.STRING,
    field: 'Project_id',
  })
  projectId: string;

  @Column({
    type: DataType.STRING,
    field: 'Build_name',
    allowNull: true,
  })
  buildName: string;

}
