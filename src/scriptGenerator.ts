import ResearchService from './researchService.js';
import type { ResearchData } from './researchService.js';
import ClaudeService from './claudeService.js';
import { formatScriptPrompt, formatResearchPrompt } from './promptSystem.js';
import { promises as fs } from 'fs';
import path from 'path';

export interface GenerationResult {
  success: boolean;
  script?: string;
  filePath?: string;
  wordCount?: number;
  error?: string;
  researchData?: ResearchData | undefined;
}

export interface GenerationOptions {
  enableResearch?: boolean;
  outputDir?: string;
  maxRetries?: number;
  targetWordCount?: number;
}

class ScriptGenerator {
  private researchService: ResearchService;
  private claudeService: ClaudeService;

  constructor() {
    this.researchService = new ResearchService();
    this.claudeService = new ClaudeService();
  }

  async generateScript(
    title: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const {
      enableResearch = true,
      outputDir = './library',
      maxRetries = 2,
      targetWordCount = 1250,
    } = options;

    console.log(`🎬 Starting script generation for: "${title}"`);

    try {
      let researchData: ResearchData | undefined;

      // Step 1: Research (if enabled)
      if (enableResearch) {
        console.log('📚 Phase 1: Research');
        researchData = await this.researchService.performResearch(title);
        console.log(`✅ Research completed: ${researchData.searchResults.length} sources found`);
      } else {
        console.log('⏭️  Skipping research phase');
      }

      // Step 2: Generate script
      console.log('✍️  Phase 2: Script Generation');
      let script: string;
      let attempt = 0;

      while (attempt < maxRetries) {
        attempt++;
        console.log(`  Attempt ${attempt}/${maxRetries}`);

        try {
          if (researchData) {
            const prompt = formatScriptPrompt(title, researchData.compiledInfo);
            const response = await this.claudeService.generateScript(prompt);
            script = response.content;
          } else {
            // Fallback: generate without research
            const basicPrompt = formatScriptPrompt(title, 'No research data available. Generate script based on general knowledge.');
            const response = await this.claudeService.generateScript(basicPrompt);
            script = response.content;
          }

          // Step 3: Validate script
          console.log('🔍 Phase 3: Validation');
          const validation = await this.claudeService.validateScript(script, targetWordCount);

          if (validation.isValid) {
            console.log(`✅ ${validation.feedback}`);

            // Step 4: Save script
            const filePath = await this.saveScript(title, script, outputDir);
            console.log(`💾 Script saved to: ${filePath}`);

            return {
              success: true,
              script,
              filePath,
              wordCount: validation.wordCount,
              researchData,
            };
          } else {
            console.log(`❌ Validation failed: ${validation.feedback}`);

            if (attempt < maxRetries) {
              console.log('🔄 Retrying with adjusted parameters...');
              // You could adjust the prompt here based on validation feedback
            } else {
              // Save even if validation failed, but mark as unsuccessful
              const filePath = await this.saveScript(title, script, outputDir);
              console.log(`⚠️  Script saved despite validation issues: ${filePath}`);

              return {
                success: false,
                script,
                filePath,
                wordCount: validation.wordCount,
                error: validation.feedback,
                researchData,
              };
            }
          }
        } catch (error) {
          console.error(`❌ Generation attempt ${attempt} failed:`, error);

          if (attempt >= maxRetries) {
            throw error;
          }
        }
      }

      throw new Error('Max retries exceeded');

    } catch (error) {
      console.error('🚨 Script generation failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        researchData,
      };
    }
  }

  private async saveScript(
    title: string,
    script: string,
    outputDir: string
  ): Promise<string> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename from title
    const filename = this.generateFilename(title);
    const filePath = path.join(outputDir, filename);

    // Add metadata header
    const timestamp = new Date().toISOString();
    const metadata = `// Generated on: ${timestamp}\n// Title: ${title}\n// Word count: ${script.split(/\s+/).length}\n\n`;

    const fullContent = metadata + script;

    await fs.writeFile(filePath, fullContent, 'utf-8');

    return filePath;
  }

  private generateFilename(title: string): string {
    // Convert title to safe filename
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    return `${timestamp}-${safeTitle}.txt`;
  }

  async listGeneratedScripts(outputDir: string = './library'): Promise<string[]> {
    try {
      const files = await fs.readdir(outputDir);
      return files.filter(file => file.endsWith('.txt')).sort().reverse();
    } catch (error) {
      return [];
    }
  }

  async getScriptContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read script file: ${filePath}`);
    }
  }
}

export default ScriptGenerator;