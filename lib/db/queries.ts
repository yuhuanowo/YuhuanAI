import 'server-only';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import dbConnect from './connection';
import { User, Chat, Message, Vote, Document, Suggestion } from './models';
import { ArtifactKind } from '@/components/artifact';

// 定义MongoDB的消息类型，避免使用旧的PostgreSQL类型
interface MongoDBMessage {
  _id: string;
  chatId: string;
  role: string;
  parts: any[];
  attachments: any[];
  createdAt: Date;
}

// 转换函数：将DBMessage格式转换为MongoDB格式
function convertToMongoMessage(msg: any): any {
  return {
    _id: msg.id, // 使用传入的id作为_id
    chatId: msg.chatId,
    role: msg.role,
    parts: msg.parts,
    attachments: msg.attachments || [],
    createdAt: msg.createdAt,
  };
}

// 转换函数：将MongoDB文档转换回应用期望的格式
function convertFromMongoDoc(doc: any): any {
  if (!doc) return null;
  // 将文档转换为普通对象
  const obj = doc.toObject ? doc.toObject() : doc;
  
  // 将_id映射回id
  const { _id, ...rest } = obj;
  return {
    id: _id,
    ...rest
  };
}

// 转换函数：将MongoDB文档数组转换为应用期望的格式
function convertFromMongoDocs(docs: any[]): any[] {
  return docs.map(convertFromMongoDoc);
}

export async function getUser(email: string) {
  await dbConnect();
  const users = await User.find({ email });
  return convertFromMongoDocs(users);
}

export async function createUser(email: string, password: string) {
  await dbConnect();
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);
  const user = await User.create({ email, password: hash });
  return convertFromMongoDoc(user);
}

export async function saveChat({ id, userId, title }: { id: string; userId: string; title: string; }) {
  await dbConnect();
  const chat = await Chat.create({
    _id: id,
    userId,
    title,
    createdAt: new Date()
  });
  return convertFromMongoDoc(chat);
}

export async function deleteChatById({ id }: { id: string }) {
  await dbConnect();
  await Vote.deleteMany({ chatId: id });
  await Message.deleteMany({ chatId: id });
  const result = await Chat.findByIdAndDelete(id);
  return convertFromMongoDoc(result);
}

export async function getChatsByUserId({ id }: { id: string }) {
  await dbConnect();
  const chats = await Chat.find({ userId: id }).sort({ createdAt: -1 });
  return convertFromMongoDocs(chats);
}

export async function getChatById({ id }: { id: string }) {
  await dbConnect();
  const chat = await Chat.findById(id);
  return convertFromMongoDoc(chat);
}

export async function saveMessages({ messages }: { messages: Array<any> }) {
  await dbConnect();
  const mongoMessages = messages.map(convertToMongoMessage);
  const savedMessages = await Message.insertMany(mongoMessages);
  return convertFromMongoDocs(savedMessages);
}

export async function getMessagesByChatId({ id }: { id: string }) {
  await dbConnect();
  const messages = await Message.find({ chatId: id }).sort({ createdAt: 1 });
  return convertFromMongoDocs(messages);
}

export async function getMessageById({ id }: { id: string }) {
  await dbConnect();
  const messages = await Message.find({ _id: id });
  return convertFromMongoDocs(messages);
}

export async function voteMessage({ chatId, messageId, type }: { chatId: string; messageId: string; type: 'up' | 'down'; }) {
  await dbConnect();
  const existingVote = await Vote.findOne({ messageId });
  
  if (existingVote) {
    const updatedVote = await Vote.findOneAndUpdate(
      { messageId, chatId },
      { isUpvoted: type === 'up' },
      { new: true }
    );
    return convertFromMongoDoc(updatedVote);
  }
  
  const newVote = await Vote.create({
    chatId,
    messageId,
    isUpvoted: type === 'up'
  });
  return convertFromMongoDoc(newVote);
}

export async function getVotesByChatId({ id }: { id: string }) {
  await dbConnect();
  const votes = await Vote.find({ chatId: id });
  return convertFromMongoDocs(votes);
}

export async function saveDocument({ id, title, kind, content, userId }: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  await dbConnect();
  const document = await Document.create({
    _id: id,
    title,
    kind,
    content,
    userId,
    createdAt: new Date()
  });
  return convertFromMongoDoc(document);
}

export async function getDocumentsById({ id }: { id: string }) {
  await dbConnect();
  const documents = await Document.find({ _id: id }).sort({ createdAt: 1 });
  return convertFromMongoDocs(documents);
}

export async function getDocumentById({ id }: { id: string }) {
  await dbConnect();
  const document = await Document.findOne({ _id: id }).sort({ createdAt: -1 });
  return convertFromMongoDoc(document);
}

export async function deleteDocumentsByIdAfterTimestamp({ id, timestamp }: { id: string; timestamp: Date }) {
  await dbConnect();
  await Suggestion.deleteMany({
    documentId: id,
    documentCreatedAt: { $gt: timestamp }
  });
  const result = await Document.deleteMany({
    _id: id,
    createdAt: { $gt: timestamp }
  });
  return result;
}

export async function deleteMessagesByChatIdAfterTimestamp({ chatId, timestamp }: { chatId: string; timestamp: Date }) {
  await dbConnect();
  const messagesToDelete = await Message.find({
    chatId,
    createdAt: { $gte: timestamp }
  });

  const messageIds = messagesToDelete.map(msg => msg._id);

  if (messageIds.length > 0) {
    await Vote.deleteMany({
      chatId,
      messageId: { $in: messageIds }
    });

    return await Message.deleteMany({
      chatId,
      _id: { $in: messageIds }
    });
  }
  return { deletedCount: 0 };
}

export async function saveSuggestions({ suggestions }: { suggestions: Array<any> }) {
  await dbConnect();
  // 确保每个suggestion对象都有正确的结构
  const mongoSuggestions = suggestions.map(suggestion => {
    // 如果suggestion有id字段，将其映射到_id
    if (suggestion.id) {
      const { id, ...rest } = suggestion;
      return { _id: id, ...rest };
    }
    return suggestion;
  });
  
  const savedSuggestions = await Suggestion.insertMany(mongoSuggestions);
  return convertFromMongoDocs(savedSuggestions);
}

export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
  await dbConnect();
  const suggestions = await Suggestion.find({ documentId });
  return convertFromMongoDocs(suggestions);
}

export async function updateChatVisiblityById({ chatId, visibility }: { chatId: string; visibility: 'private' | 'public' }) {
  await dbConnect();
  const chat = await Chat.findByIdAndUpdate(chatId, { visibility }, { new: true });
  return convertFromMongoDoc(chat);
}
