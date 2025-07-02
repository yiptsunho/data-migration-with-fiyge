import {CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model} from "sequelize"
import sequelize from "../database/mysql";


export interface TokenInterface extends Model<InferAttributes<TokenInterface>, InferCreationAttributes<TokenInterface>> {
    id: CreationOptional<number>;
    userId: number;
    realmId: number;
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expireDateTime: CreationOptional<Date>;
    refreshTokenExpireDateTime: CreationOptional<Date>;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}

const Token = sequelize.define<TokenInterface>("Token", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER
    },
    realmId: {
        type: DataTypes.INTEGER
    },
    accessToken: {
        type: DataTypes.STRING
    },
    refreshToken: {
        type: DataTypes.STRING
    },
    tokenType: {
        type: DataTypes.STRING
    },
    expireDateTime: {
        type: DataTypes.DATE
    },
    refreshTokenExpireDateTime: {
        type: DataTypes.DATE
    },
    createdAt: {
        type: DataTypes.DATE
    },
    updatedAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: "tokens",
    underscored: true
})

export default Token;