import { config } from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

config({
  path: '.env',
});

// 定义迁移记录的模式
const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  appliedAt: { type: Date, default: Date.now }
});

const runMigrate = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  try {
    console.log('⏳ Running migrations...');
    const start = Date.now();
    
    // 连接到数据库
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'yuhuanai'
    });
    
    // 创建迁移模型
    const MigrationModel = mongoose.model('_Migration', migrationSchema);
    
    // 读取迁移文件并按顺序执行
    const migrationsFolder = './lib/db/migrations';
    const migrationFiles = fs.readdirSync(migrationsFolder)
      .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
      .sort();
    
    for (const migrationFile of migrationFiles) {
      const migrationName = path.parse(migrationFile).name;
      
      // 检查迁移是否已应用
      const applied = await MigrationModel.findOne({ name: migrationName });
      if (applied) {
        console.log(`Migration ${migrationName} already applied, skipping`);
        continue;
      }
      
      // 执行迁移
      console.log(`Applying migration: ${migrationName}`);
      const migration = require(path.join(process.cwd(), migrationsFolder, migrationFile));
      
      // 传递 mongoose 实例给迁移脚本
      await migration.up(mongoose);
      
      // 记录已应用的迁移
      await MigrationModel.create({ name: migrationName });
    }
    
    const end = Date.now();
    console.log('✅ Migrations completed in', end - start, 'ms');
  } finally {
    await mongoose.disconnect();
  }
  
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});