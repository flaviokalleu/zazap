import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sessions',
      key: 'id',
    },
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'contacts',
      key: 'id',
    },
    comment: 'ID do contato vinculado ao ticket'
  },
  queueId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'queues',
      key: 'id',
    },
    comment: 'ID da fila vinculada ao ticket'
  },
  assignedUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    comment: 'ID do usuário responsável pelo ticket'
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  unreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'open',
  },
  chatStatus: {
    type: DataTypes.ENUM('waiting', 'accepted', 'resolved', 'closed'),
    defaultValue: 'waiting',
    allowNull: false,
    comment: 'Status do chat: aguardando, aceito, resolvido ou fechado'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal',
    allowNull: false,
    comment: 'Prioridade do ticket'
  },
  isBot: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Se o ticket está sendo atendido por bot'
  },
}, {
  tableName: 'tickets',
  timestamps: true,
});

export default Ticket;
