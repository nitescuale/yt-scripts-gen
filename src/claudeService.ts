import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  } | undefined;
}

class ClaudeService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateContent(
    prompt: string,
    systemPrompt?: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    } = {}
  ): Promise<ClaudeResponse> {
    const {
      maxTokens = 4000,
      temperature = 0.7,
      model = 'claude-3-haiku-20240307'
    } = options;

    try {
      console.log('🤖 Generating content with Claude...');

      const messages: Anthropic.Messages.MessageParam[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      const messageParams: any = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages,
      };

      if (systemPrompt) {
        messageParams.system = systemPrompt;
      }

      const response = await this.client.messages.create(messageParams);

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      return {
        content,
        usage: response.usage ? {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Claude API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateResearch(prompt: string): Promise<ClaudeResponse> {
    return this.generateContent(prompt, undefined, {
      maxTokens: 2000,
      temperature: 0.3, // Lower temperature for research accuracy
    });
  }

  async generateScript(prompt: string): Promise<ClaudeResponse> {
    return this.generateContent(prompt, undefined, {
      maxTokens: 4000,
      temperature: 0.7, // Higher temperature for creative writing
    });
  }

  async validateScript(script: string, targetWordCount: number = 1250): Promise<{
    isValid: boolean;
    wordCount: number;
    feedback: string;
  }> {
    const wordCount = script.split(/\s+/).length;
    const minWords = targetWordCount * 0.7; // 70% of target
    const maxWords = targetWordCount * 1.3; // 130% of target

    if (wordCount < minWords) {
      return {
        isValid: false,
        wordCount,
        feedback: `Script is too short (${wordCount} words). Target: ${targetWordCount} words (±30%).`,
      };
    }

    if (wordCount > maxWords) {
      return {
        isValid: false,
        wordCount,
        feedback: `Script is too long (${wordCount} words). Target: ${targetWordCount} words (±30%).`,
      };
    }

    // Additional quality checks
    const lines = script.split('\n').filter(line => line.trim());
    const hasIntroduction = lines.some(line =>
      line.toLowerCase().includes('welcome') ||
      line.toLowerCase().includes('today') ||
      line.toLowerCase().includes('let\'s')
    );

    const hasConclusion = lines.some(line =>
      line.toLowerCase().includes('thanks') ||
      line.toLowerCase().includes('subscribe') ||
      line.toLowerCase().includes('comment')
    );

    if (!hasIntroduction || !hasConclusion) {
      return {
        isValid: false,
        wordCount,
        feedback: 'Script appears to be missing proper introduction or conclusion.',
      };
    }

    return {
      isValid: true,
      wordCount,
      feedback: `Script validation passed. Word count: ${wordCount} words.`,
    };
  }
}

export default ClaudeService;