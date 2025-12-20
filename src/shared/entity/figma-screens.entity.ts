import { AutoIncrement, BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Projects } from './projects.entity.js';

@Table({
  tableName: 'Figma_screens',
  timestamps: false,
})
export class FigmaScreens extends Model<FigmaScreens> {
  @AutoIncrement
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @ForeignKey(() => Projects)
  @Column({
    type: DataType.STRING,
    field: 'Project_id',
  })
  declare projectId: string;

  @Column({
    type: DataType.STRING,
    field: 'Node_Id',
  })
  declare nodeId: string;

  @Column({
    type: DataType.STRING,
    field: 'Figma_url',
  })
  declare figmaUrl: string;

  @Column({
    type: DataType.STRING,
    field: 'Screen_Name',
  })
   declare screenName: string;

  @Column({
    type: DataType.BLOB('long'),
    field: 'Extracted_image',
    allowNull: true,
  })
   declare extractedImage: any;

  @Column({
    type: DataType.STRING,
    field: 'Project_type',
  })
  declare projectType: string;

  @BelongsTo(() => Projects)
  project: Projects;
}
