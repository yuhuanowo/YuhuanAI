@echo off
REM 启动Redis到MongoDB同步脚本

REM 切换到项目根目录
cd /d "%~dp0\.."

REM 检查node.js是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    exit /b 1
)

REM 检查所需模块
echo 检查所需依赖...
set NODE_MODULES=mongodb @upstash/redis redis dotenv

REM 安装模块
echo 确保安装所有需要的依赖...
call npm install --no-save %NODE_MODULES%

REM 启动同步脚本
echo 启动Redis到MongoDB同步服务...
node scripts/sync-redis-to-mongodb.js

pause
