#!/usr/bin/env node

import { Command } from 'commander';
import ScriptGenerator from './scriptGenerator.js';
import { promises as fs } from 'fs';
import path from 'path';

const program = new Command();

program
  .name('yt-scripts-gen')
  .description('YouTube Script Generator - Create engaging video scripts from titles')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a YouTube script from a title')
  .argument('<title>', 'The title of the YouTube video')
  .option('-o, --output <dir>', 'Output directory for generated scripts', './library')
  .option('--no-research', 'Skip web research phase')
  .option('-w, --words <count>', 'Target word count for the script', '1250')
  .option('-r, --retries <count>', 'Maximum number of generation retries', '2')
  .action(async (title: string, options) => {
    const generator = new ScriptGenerator();

    console.log('🎬 YouTube Script Generator');
    console.log('=' .repeat(50));

    const result = await generator.generateScript(title, {
      enableResearch: options.research !== false,
      outputDir: options.output,
      targetWordCount: parseInt(options.words),
      maxRetries: parseInt(options.retries),
    });

    console.log('=' .repeat(50));

    if (result.success) {
      console.log('🎉 Script generation completed successfully!');
      console.log(`📁 File: ${result.filePath}`);
      console.log(`📊 Word count: ${result.wordCount} words`);

      if (result.researchData) {
        console.log(`🔍 Research sources: ${result.researchData.searchResults.length}`);
      }
    } else {
      console.log('❌ Script generation failed');
      if (result.error) {
        console.log(`💥 Error: ${result.error}`);
      }
      if (result.filePath) {
        console.log(`📁 Partial result saved to: ${result.filePath}`);
      }
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List generated scripts')
  .option('-o, --output <dir>', 'Output directory to check', './library')
  .action(async (options) => {
    const generator = new ScriptGenerator();
    const scripts = await generator.listGeneratedScripts(options.output);

    if (scripts.length === 0) {
      console.log('📭 No scripts found in the output directory.');
      return;
    }

    console.log('📚 Generated Scripts:');
    console.log('=' .repeat(50));

    scripts.forEach((script, index) => {
      console.log(`${index + 1}. ${script}`);
    });
  });

program
  .command('show')
  .description('Display a generated script')
  .argument('<filename>', 'The filename of the script to display')
  .option('-o, --output <dir>', 'Output directory', './library')
  .action(async (filename: string, options) => {
    const generator = new ScriptGenerator();
    const filePath = path.join(options.output, filename);

    try {
      const content = await generator.getScriptContent(filePath);
      console.log('📜 Script Content:');
      console.log('=' .repeat(50));
      console.log(content);
    } catch (error) {
      console.error('❌ Error reading script:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Setup environment variables')
  .action(async () => {
    console.log('🔧 Environment Setup');
    console.log('=' .repeat(50));
    console.log('');
    console.log('Required environment variables:');
    console.log('');
    console.log('1. ANTHROPIC_API_KEY (Required)');
    console.log('   Get your API key from: https://console.anthropic.com/');
    console.log('');
    console.log('2. Search API (Optional, choose one):');
    console.log('   a) Google Custom Search:');
    console.log('      - GOOGLE_SEARCH_API_KEY');
    console.log('      - GOOGLE_SEARCH_ENGINE_ID');
    console.log('   b) Serper API:');
    console.log('      - SERPER_API_KEY');
    console.log('');
    console.log('Create a .env file in the project root with these variables.');
    console.log('See .env.example for the template.');
    console.log('');

    // Check current environment
    const envStatus = {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      GOOGLE_SEARCH_API_KEY: !!process.env.GOOGLE_SEARCH_API_KEY,
      GOOGLE_SEARCH_ENGINE_ID: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
      SERPER_API_KEY: !!process.env.SERPER_API_KEY,
    };

    console.log('Current status:');
    Object.entries(envStatus).forEach(([key, isSet]) => {
      console.log(`  ${key}: ${isSet ? '✅ Set' : '❌ Not set'}`);
    });

    const hasSearchAPI = envStatus.SERPER_API_KEY ||
                        (envStatus.GOOGLE_SEARCH_API_KEY && envStatus.GOOGLE_SEARCH_ENGINE_ID);

    if (!envStatus.ANTHROPIC_API_KEY) {
      console.log('');
      console.log('⚠️  ANTHROPIC_API_KEY is required for the application to work.');
    }

    if (!hasSearchAPI) {
      console.log('');
      console.log('ℹ️  No search API configured. The app will work but without web research.');
    }
  });

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

// Parse command line arguments
program.parse();