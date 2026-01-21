import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({
  tableName: 'ModelResult',
  timestamps: false,
})
export class ModelResult extends Model<ModelResult> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    field: 'Project_id',
    allowNull: true,
  })
  declare projectId: string;

  @Column({
    type: DataType.STRING,
    field: 'image_name',
    allowNull: true,
  })
  declare imageName: string;

  @Column({
    type: DataType.STRING,
    field: 'Build_id',
    allowNull: true,
  })
  declare buildId: string;

  @Column({
    type: DataType.STRING,
    field: 'project_type',
    allowNull: true,
  })
  declare projectType: string;
  @Column({
    type: DataType.TEXT,
    field: 'summary',
    allowNull: true,
  })
  declare summary: string;



  @Column({
    type: DataType.JSONB,
    field: 'coords_vs_text',
    allowNull: true,
  })
  declare coordsVsText: any;
}
