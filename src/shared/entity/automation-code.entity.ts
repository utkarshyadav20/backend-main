import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
    tableName: 'automation_code',
    timestamps: false,
})
export class AutomationCode extends Model<AutomationCode> {
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER,
        field: 'id',
    })
    declare id: number;

    @Column({
        type: DataType.STRING,
        field: 'Project_id',
        allowNull: false,
    })
    declare projectId: string;

    @Column({
        type: DataType.STRING,
        field: 'Build_id',
        allowNull: false,
    })
    declare buildId: string;

    @Column({
        type: DataType.JSON,
        field: 'Automation_code',
        allowNull: true,
    })
    declare automationCode: Record<string, string>;


    @Column({
        type: DataType.JSON,
        field: 'Variables',
        allowNull: true,
    })
    declare variables: Record<string, string>;

    @Column({
        type: DataType.JSON,
        field: 'Screen_order',
        allowNull: true,
    })
    declare screenOrder: string[];
}
