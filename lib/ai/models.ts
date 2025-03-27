export const DEFAULT_CHAT_MODEL: string = 'gpt-4o-mini';

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: '🌟 OpenAI 旗艦模型，提供卓越的思考與創作能力',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: '✨ 經濟實惠的 GPT-4o 版本，平衡速度與性能',
  },
  {
    id: 'o3-mini',
    name: 'O3 Mini',
    description: '🚀 輕量級 OpenAI 助手，反應迅速且高效',
  },
  {
    id: 'o1',
    name: 'O1',
    description: '🧠 OpenAI 的強大推理模型，擅長深度思考',
  },
  {
    id: 'o1-mini',
    name: 'O1 Mini',
    description: '💡 簡潔高效的推理體驗，適合日常使用',
  },
  {
    id: 'DeepSeek-R1',
    name: 'DeepSeek R1',
    description: '🔍 DeepSeek 專注解決複雜推理問題的頂尖模型',
  },
  {
    id: 'DeepSeek-V3',
    name: 'DeepSeek V3',
    description: '🔮 先進的多模態理解與生成能力，支援豐富媒體類型',
  },
  {
    id: 'Ministral-3B',
    name: 'Ministral 3B',
    description: '🌈 輕量高效的 Mistral 對話助手，3B參數規模',
  },
  {
    id: 'Ministral-small-3.1',
    name: 'Ministral Small 3.1',
    description: '🌱 2024年最新 Mistral 小型對話模型，優化效能',
  },
  {
    id: 'Cohere-command-r-08',
    name: 'Cohere Command R-08',
    description: '⚡ Cohere 精准執行複雜指令的企業級模型',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill Llama 70B',
    description: '🐪 基於 Llama 70B 提煉的推理模型，思考能力超群',
  },
  {
    id: 'deepseek-r1-distill-qwen-32b',
    name: 'DeepSeek R1 Distill Qwen 32B',
    description: '🔱 基於千問 32B 的精華版，中英雙語推理能力出色',
  },
  {
    id: 'qwen-qwq-32b',
    name: 'Qwen QWQ 32B',
    description: '🌊 阿里巴巴千問系列，優秀的創意生成與理解能力',
  },
  {
    id: 'gemini-2.5-pro-exp-03-25',
    name: 'Gemini 2.5 Pro',
    description: '💎 Google 最強大模型，展現卓越推理與創造力',
  },
  {
    id: 'gemini-2.0-flash-exp-image-generation',
    name: 'Gemini 2.0 Flash Image',
    description: '🎨 專業級 AI 圖像生成，創意表現無限可能',
  },
  {
    id: 'gemini-2.0-flash-thinking-exp-01-21',
    name: 'Gemini 2.0 Flash Thinking',
    description: '⚡ 高速推理與反應，能即時解決複雜問題',
  },
  {
    id: 'gemma-3-27b-it',
    name: 'Gemma 3 27B',
    description: '💫 Google 開源巨型模型，27B 參數規模性能出眾',
  },
];