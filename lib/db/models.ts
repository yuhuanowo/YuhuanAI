import mongoose from 'mongoose';
import { ArtifactKind } from '@/components/artifact';
import { v4 as uuidv4 } from 'uuid';

// 自定义的Schema选项，用于支持字符串ID
const schemaOptions = { 
  _id: false // 禁用默认的_id字段生成
};

const userSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 }, // 使用字符串类型ID
  email: { type: String, required: true, unique: true },
  password: { type: String },
}, schemaOptions);

const chatSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 }, // 使用字符串类型ID
  title: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true }, // 修改为字符串类型
  createdAt: { type: Date, required: true },
  visibility: { type: String, enum: ['public', 'private'], default: 'private' },
}, schemaOptions);

const messageSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 }, // 使用字符串类型ID
  chatId: { type: String, ref: 'Chat', required: true },
  role: { type: String, required: true },
  parts: { type: Array, required: true },
  attachments: { type: Array, required: true },
  createdAt: { type: Date, required: true },
}, schemaOptions);

const voteSchema = new mongoose.Schema({
  chatId: { type: String, ref: 'Chat', required: true },
  messageId: { type: String, ref: 'Message', required: true },
  isUpvoted: { type: Boolean, required: true },
});

const documentSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 }, // 使用字符串类型ID
  title: { type: String, required: true },
  content: String,
  kind: { 
    type: String, 
    enum: ['text', 'code', 'image', 'sheet'],
    default: 'text'
  },
  userId: { type: String, ref: 'User', required: true }, // 修改为字符串类型
  createdAt: { type: Date, required: true },
}, schemaOptions);

const suggestionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 }, // 使用字符串类型ID
  documentId: { type: String, ref: 'Document', required: true }, // 修改为字符串类型
  documentCreatedAt: { type: Date, required: true },
  originalText: { type: String, required: true },
  suggestedText: { type: String, required: true },
  description: String,
  isResolved: { type: Boolean, default: false },
  userId: { type: String, ref: 'User', required: true }, // 修改为字符串类型
  createdAt: { type: Date, required: true },
}, schemaOptions);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export const Vote = mongoose.models.Vote || mongoose.model('Vote', voteSchema);
export const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);
export const Suggestion = mongoose.models.Suggestion || mongoose.model('Suggestion', suggestionSchema);