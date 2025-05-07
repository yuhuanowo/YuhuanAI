/**
 * Redis到MongoDB同步脚本
 * 
 * 这个脚本定期将Redis中的聊天历史数据同步到MongoDB中
 * 可以作为一个独立的进程运行，或者作为一个计划任务执行
 */

const { MongoClient } = require('mongodb');
const Redis = require('@upstash/redis').Redis;
const { createClient } = require('redis');
const dotenv = require('dotenv');
const path = require('path');

// 加载.env.local文件中的环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 配置
const config = {
  // Redis配置
  useLocalRedis: process.env.USE_LOCAL_REDIS === 'true',
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  localRedisUrl: process.env.LOCAL_REDIS_URL || 'redis://localhost:6379',
  
  // MongoDB配置
  useMongoDB: process.env.USE_MONGODB === 'true',
  mongoDBUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  mongoDBName: process.env.MONGODB_DB_NAME || 'morphic',
  
  // 同步配置
  syncInterval: parseInt(process.env.SYNC_INTERVAL_MS || '60000'), // 默认每60秒同步一次
  chatVersion: 'v2', // 与lib/actions/chat.ts中的CHAT_VERSION保持一致
  
  // 数据优化配置
  optimizeData: process.env.OPTIMIZE_CHAT_DATA !== 'false', // 默认开启数据优化
  maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '500'), // 单条消息最大长度
  summaryLength: parseInt(process.env.SUMMARY_LENGTH || '200'), // 长消息摘要长度
  keepSystemMessages: process.env.KEEP_SYSTEM_MESSAGES !== 'false', // 是否保留系统消息
  keepMetadata: process.env.KEEP_METADATA !== 'false' // 是否保留元数据
};

// Redis客户端
let redisClient;
// MongoDB客户端
let mongoClient;
let db;

/**
 * 初始化Redis连接
 */
async function initRedis() {
  try {
    if (config.useLocalRedis) {
      console.log(`连接本地Redis: ${config.localRedisUrl}`);
      redisClient = createClient({ url: config.localRedisUrl });
      await redisClient.connect();
      console.log('成功连接到本地Redis');
    } else {
      console.log('连接Upstash Redis');
      if (!config.upstashRedisRestUrl || !config.upstashRedisRestToken) {
        throw new Error('Upstash Redis配置缺失，请检查环境变量');
      }
      redisClient = new Redis({
        url: config.upstashRedisRestUrl,
        token: config.upstashRedisRestToken
      });
      console.log('成功连接到Upstash Redis');
    }
  } catch (error) {
    console.error('Redis连接失败:', error);
    throw error;
  }
}

/**
 * 初始化MongoDB连接
 */
async function initMongoDB() {
  try {
    console.log(`连接MongoDB: ${config.mongoDBUri}`);
    mongoClient = new MongoClient(config.mongoDBUri);
    await mongoClient.connect();
    db = mongoClient.db(config.mongoDBName);
    console.log(`成功连接到MongoDB数据库: ${config.mongoDBName}`);
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    throw error;
  }
}

/**
 * 获取所有用户的聊天记录键
 */
async function getAllUserChatKeys() {
  try {
    // 使用模式匹配获取所有用户的聊天记录键
    const pattern = `user:${config.chatVersion}:chat:*`;
    
    if (config.useLocalRedis) {
      return await redisClient.keys(pattern);
    } else {
      // Upstash Redis不直接支持keys命令，这里需要使用scan
      // 注意: 这里的实现可能需要根据Upstash Redis的实际API调整
      const scan = await redisClient.scan(0, { match: pattern, count: 1000 });
      return scan[1] || [];
    }
  } catch (error) {
    console.error('获取用户聊天记录键失败:', error);
    return [];
  }
}

/**
 * 从Redis获取用户的所有聊天记录
 * @param {string} userKey - 用户聊天记录的键
 */
async function getUserChats(userKey) {
  try {
    let chatKeys;
    if (config.useLocalRedis) {
      chatKeys = await redisClient.zRange(userKey, 0, -1, { REV: true });
    } else {
      chatKeys = await redisClient.zrange(userKey, 0, -1, { rev: true });
    }

    if (!chatKeys || chatKeys.length === 0) {
      return [];
    }

    const chats = [];
    for (const chatKey of chatKeys) {
      let chat;
      if (config.useLocalRedis) {
        chat = await redisClient.hGetAll(chatKey);
      } else {
        chat = await redisClient.hgetall(chatKey);
      }

      if (chat && Object.keys(chat).length > 0) {
        // 解析消息字符串为JSON对象
        if (typeof chat.messages === 'string') {
          try {
            chat.messages = JSON.parse(chat.messages);
          } catch (error) {
            chat.messages = [];
          }
        }

        // 确保创建时间是Date对象
        if (chat.createdAt) {
          chat.createdAt = new Date(chat.createdAt);
        } else {
          chat.createdAt = new Date();
        }

        // 添加chatKey作为唯一标识符
        chat._redisKey = chatKey;
        chats.push(chat);
      }
    }

    return chats;
  } catch (error) {
    console.error(`获取用户聊天记录失败 (${userKey}):`, error);
    return [];
  }
}

/**
 * 筛选聊天记录中的重要信息
 * @param {Object} chat - 聊天记录对象
 * @returns {Object} 只包含重要信息的聊天记录对象
 */
function filterImportantData(chat) {
  // 如果没有消息或消息不是数组，返回简化对象
  if (!chat.messages || !Array.isArray(chat.messages)) {
    return {
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      userId: chat.userId,
      messages: []
    };
  }
  
  // 处理消息列表，只保留核心内容
  const cleanMessages = chat.messages.map(msg => {
    const cleanMsg = {
      role: msg.role,
    };
    
    // 根据消息类型处理内容
    if (msg.role === 'user') {
      // 用户消息保持原样
      cleanMsg.content = msg.content;
    } else if (msg.role === 'assistant') {
      // 助手消息处理
      if (msg.content) {
        // 如果消息过长，进行裁剪
        if (msg.content.length > config.maxMessageLength) {
          cleanMsg.content = msg.content.substring(0, config.summaryLength) + 
                           `... [简化内容，原长度: ${msg.content.length}字符]`;
        } else {
          cleanMsg.content = msg.content;
        }
      }
      
      // 保留功能调用和工具调用信息（如果有）
      if (msg.function_call) cleanMsg.function_call = msg.function_call;
      if (msg.tool_calls) cleanMsg.tool_calls = msg.tool_calls;
    } else if (msg.role === 'system') {
      // 系统消息只在需要时保留
      if (config.keepSystemMessages) {
        cleanMsg.content = msg.content;
      } else {
        return null; // 返回null以便后续过滤
      }
    }
    
    return cleanMsg;
  }).filter(Boolean); // 过滤掉null值
  
  // 创建简洁的聊天对象
  const cleanChat = {
    id: chat.id,
    title: chat.title || '无标题对话',
    createdAt: chat.createdAt,
    lastModified: chat.updatedAt || chat.createdAt,
    userId: chat.userId,
    messages: cleanMessages,
    messageCount: cleanMessages.length,
    lastSyncedAt: new Date()
  };
  
  // 添加模型信息（如果有）
  if (chat.model) cleanChat.model = chat.model;
  
  return cleanChat;
}

/**
 * 将聊天记录保存到MongoDB
 * @param {Array} chats - 聊天记录数组
 * @param {string} userId - 用户ID
 */
async function saveChatsToMongoDB(chats, userId) {
  if (!chats || chats.length === 0) {
    return;
  }

  try {
    const collection = db.collection('chats');
    
    for (const chat of chats) {
      // 筛选重要数据
      const cleanChat = filterImportantData(chat);
      const filter = { id: cleanChat.id, userId };
      
      // 添加用于检索的索引字段
      cleanChat.userIdAndDate = `${userId}-${new Date(cleanChat.createdAt).toISOString().split('T')[0]}`;
      
      // 使用upsert操作：如果记录存在则更新，不存在则插入
      await collection.updateOne(
        filter,
        { $set: cleanChat },
        { upsert: true }
      );
    }
    
    console.log(`成功将 ${chats.length} 条聊天记录(已简化格式)同步至MongoDB (用户: ${userId})`);
  } catch (error) {
    console.error(`保存聊天记录到MongoDB失败 (用户: ${userId}):`, error);
  }
}

/**
 * 执行Redis到MongoDB的同步
 */
async function syncRedisToMongoDB() {
  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 开始同步: Redis -> MongoDB`);
    
    // 获取所有用户的聊天记录键
    const userKeys = await getAllUserChatKeys();
    console.log(`发现 ${userKeys.length} 个用户的聊天记录`);
    
    // 统计信息
    let stats = {
      totalUsers: userKeys.length,
      totalChats: 0,
      totalMessages: 0,
      processedUsers: 0,
      skippedChats: 0,
      errorUsers: 0
    };
    
    // 遍历每个用户，获取并同步其聊天记录
    for (const userKey of userKeys) {
      try {
        // 从用户键中提取userId (格式: user:v2:chat:userId)
        const userId = userKey.split(':').pop();
        
        // 获取用户的所有聊天记录
        const chats = await getUserChats(userKey);
        
        if (chats.length > 0) {
          // 统计消息总数
          const messageCount = chats.reduce((sum, chat) => {
            return sum + (Array.isArray(chat.messages) ? chat.messages.length : 0);
          }, 0);
          
          // 记录原始大小
          const originalSize = JSON.stringify(chats).length;
          
          // 将聊天记录保存到MongoDB
          await saveChatsToMongoDB(chats, userId);
          
          // 更新统计信息
          stats.totalChats += chats.length;
          stats.totalMessages += messageCount;
          stats.processedUsers++;
          
          // 计算优化后的大小
          if (config.optimizeData) {
            const optimizedChats = chats.map(chat => filterImportantData(chat));
            const optimizedSize = JSON.stringify(optimizedChats).length;
            const savingsPercent = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
            
            console.log(`用户 ${userId}: ${chats.length} 条聊天, ${messageCount} 条消息, 节省空间: ${savingsPercent}%`);
          } else {
            console.log(`用户 ${userId}: ${chats.length} 条聊天, ${messageCount} 条消息`);
          }
        } else {
          stats.skippedChats++;
        }
      } catch (error) {
        console.error(`处理用户聊天记录时出错:`, error);
        stats.errorUsers++;
      }
    }
    
    // 计算总耗时
    const duration = (Date.now() - startTime) / 1000;
    
    // 输出详细的统计信息
    console.log(`\n===== 同步完成 =====`);
    console.log(`总用户数: ${stats.totalUsers} 个`);
    console.log(`成功处理: ${stats.processedUsers} 个用户`);
    console.log(`总聊天数: ${stats.totalChats} 条`);
    console.log(`总消息数: ${stats.totalMessages} 条`);
    console.log(`跳过空聊天: ${stats.skippedChats} 个`);
    console.log(`出错用户: ${stats.errorUsers} 个`);
    console.log(`处理耗时: ${duration.toFixed(2)} 秒`);
    console.log(`优化模式: ${config.optimizeData ? '开启' : '关闭'}`);
    console.log(`===================\n`);
  } catch (error) {
    console.error('同步过程中出现错误:', error);
  }
}

/**
 * 关闭连接
 */
async function closeConnections() {
  try {
    if (redisClient) {
      if (config.useLocalRedis) {
        await redisClient.quit();
      }
      console.log('已关闭Redis连接');
    }
    
    if (mongoClient) {
      await mongoClient.close();
      console.log('已关闭MongoDB连接');
    }
  } catch (error) {
    console.error('关闭连接时出错:', error);
  }
}

/**
 * 打印配置信息
 */
function printConfiguration() {
  console.log('\n===== Redis->MongoDB 同步服务配置 =====');
  console.log(`Redis类型: ${config.useLocalRedis ? '本地Redis' : 'Upstash Redis'}`);
  if (config.useLocalRedis) {
    console.log(`Redis URL: ${config.localRedisUrl}`);
  }
  console.log(`MongoDB数据库: ${config.mongoDBName}`);
  console.log(`同步间隔: ${config.syncInterval / 1000}秒`);
  console.log(`数据优化: ${config.optimizeData ? '开启' : '关闭'}`);
  if (config.optimizeData) {
    console.log(`- 消息长度限制: ${config.maxMessageLength} 字符`);
    console.log(`- 摘要长度: ${config.summaryLength} 字符`);
    console.log(`- 保留系统消息: ${config.keepSystemMessages ? '是' : '否'}`);
    console.log(`- 保留元数据: ${config.keepMetadata ? '是' : '否'}`);
  }
  console.log('======================================\n');
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log(`\n[${new Date().toISOString()}] Redis->MongoDB 同步服务正在启动...`);
    
    // 检查MongoDB配置
    if (!config.useMongoDB) {
      console.error('错误: MongoDB未启用，请在.env.local中设置USE_MONGODB=true');
      console.log('提示: 在.env.local文件中添加以下配置:');
      console.log('USE_MONGODB=true');
      console.log('MONGODB_URI=mongodb://用户名:密码@主机:端口/数据库名');
      console.log('MONGODB_DB_NAME=morphic');
      process.exit(1);
    }
    
    // 打印当前配置
    printConfiguration();
    
    // 初始化连接
    await initRedis();
    await initMongoDB();
    
    // 立即执行一次同步
    await syncRedisToMongoDB();
    
    // 定期执行同步
    const interval = setInterval(syncRedisToMongoDB, config.syncInterval);
    
    // 处理进程退出信号
    process.on('SIGINT', async () => {
      clearInterval(interval);
      console.log('\n收到中断信号，正在关闭连接...');
      await closeConnections();
      console.log('同步服务已安全停止。');
      process.exit(0);
    });
    
    // 处理未捕获的异常
    process.on('uncaughtException', async (error) => {
      console.error('\n发生未捕获的异常:', error);
      console.log('正在尝试关闭连接...');
      await closeConnections();
      process.exit(1);
    });
    
    console.log(`同步服务已成功启动，每 ${config.syncInterval / 1000} 秒同步一次`);
    console.log('按 Ctrl+C 停止服务\n');
  } catch (error) {
    console.error('启动同步服务失败:', error);
    await closeConnections();
    process.exit(1);
  }
}

// 启动程序
main();
