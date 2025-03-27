import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { createAzure } from '@quail-ai/azure-ai-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

const azure = createAzure({
  endpoint: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_API_KEY,
});
const googleGenerativeAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        // For system 
        'title-model': googleGenerativeAI('gemma-3-27b-it'),
        
        //azure models
        'gpt-4o-mini': azure('gpt-4o-mini'),
        'gpt-4o': azure('gpt-4o'),
        'o3-mini': azure('o3-mini'),
        'o1': azure('o1'),
        'o1-mini': azure('o1-mini'),
        'DeepSeek-R1': azure('DeepSeek-R1'),
        'DeepSeek-V3': azure('DeepSeek-V3'),
        'Ministral-3B': azure('Ministral-3B'),
        'Ministral-small-3.1': azure('mistral-small-2503'),
        'Cohere-command-r-08': azure('Cohere-command-r-08-2024'),

        // groq models
        'deepseek-r1-distill-llama-70b': wrapLanguageModel({
          model: groq('deepseek-r1-distill-llama-70b'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'deepseek-r1-distill-qwen-32b': wrapLanguageModel({
          model: groq('deepseek-r1-distill-qwen-32b'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'qwen-qwq-32b': wrapLanguageModel({
          model: groq('qwen-qwq-32b'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        
        // Google Generative AI models
        'gemini-2.5-pro-exp-03-25': wrapLanguageModel({
          model: googleGenerativeAI('gemini-2.5-pro-exp-03-25'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'gemini-2.0-flash-exp-image-generation': googleGenerativeAI('gemini-2.0-flash-exp-image-generation'),
        'gemini-2.0-flash-thinking-exp-01-21': wrapLanguageModel({
          model: googleGenerativeAI('gemini-2.0-flash-thinking-exp-01-21'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'gemma-3-27b-it' :googleGenerativeAI('gemma-3-27b-it'),
        'artifact-model': azure('gpt-4o-mini'),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });
