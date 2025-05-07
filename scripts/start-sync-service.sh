#!/bin/bash
# 启动Redis到MongoDB同步脚本

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查所需模块是否已安装
echo "检查所需依赖..."
NODE_MODULES=(mongodb @upstash/redis redis dotenv)
MISSING_MODULES=()

for MODULE in "${NODE_MODULES[@]}"; do
    if ! node -e "try { require('$MODULE'); } catch(e) { process.exit(1); }" &> /dev/null; then
        MISSING_MODULES+=("$MODULE")
    fi
done

# 安装缺失的模块
if [ ${#MISSING_MODULES[@]} -ne 0 ]; then
    echo "以下模块未安装: ${MISSING_MODULES[*]}"
    echo "正在安装..."
    npm install --no-save "${MISSING_MODULES[@]}"
fi

# 启动同步脚本
echo "启动Redis到MongoDB同步服务..."
node scripts/sync-redis-to-mongodb.js
