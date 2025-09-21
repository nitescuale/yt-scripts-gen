import express from 'express';
import cors from 'cors';
import path from 'path';
import { promises as fs } from 'fs';
import ScriptGenerator from './scriptGenerator.js';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const scriptGenerator = new ScriptGenerator();

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// API Routes

// Generate a new script
app.post('/api/generate', async (req, res) => {
  try {
    const { title, enableResearch, targetWordCount, maxRetries } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    console.log(`🌐 Web request: Generating script for "${title}"`);

    const result = await scriptGenerator.generateScript(title, {
      enableResearch: enableResearch ?? true,
      outputDir: './examples',
      targetWordCount: targetWordCount || 1250,
      maxRetries: maxRetries || 2,
    });

    if (result.success) {
      // Read the generated script content
      const scriptContent = await fs.readFile(result.filePath, 'utf-8');

      res.json({
        success: true,
        script: scriptContent,
        wordCount: result.wordCount,
        filePath: result.filePath,
        researchSources: result.researchData?.searchResults?.length || 0,
      });
    } else {
      // Even if validation failed, if we have a script and file, return it as partial success
      if (result.script && result.filePath) {
        const scriptContent = await fs.readFile(result.filePath, 'utf-8');

        res.json({
          success: false, // Still mark as failed for UI purposes
          script: scriptContent,
          wordCount: result.wordCount || 0,
          filePath: result.filePath,
          researchSources: result.researchData?.searchResults?.length || 0,
          warning: result.error, // Show as warning instead of error
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          script: result.script || null,
          wordCount: result.wordCount || 0,
        });
      }
    }
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get list of all generated scripts
app.get('/api/scripts', async (req, res) => {
  try {
    const scripts = await scriptGenerator.listGeneratedScripts('./examples');

    const scriptsWithDetails = await Promise.all(
      scripts.map(async (filename) => {
        try {
          const filePath = path.join('./examples', filename);
          const content = await fs.readFile(filePath, 'utf-8');

          // Extract metadata from the file
          const lines = content.split('\n');
          const generatedLine = lines.find(line => line.includes('Generated on:'));
          const titleLine = lines.find(line => line.includes('Title:'));
          const wordCountLine = lines.find(line => line.includes('Word count:'));

          const generatedDate = generatedLine ?
            generatedLine.split('Generated on:')[1]?.trim() :
            'Unknown';

          const title = titleLine ?
            titleLine.split('Title:')[1]?.trim() :
            filename.replace('.txt', '');

          const wordCount = wordCountLine ?
            parseInt(wordCountLine.split('Word count:')[1]?.trim() || '0') :
            0;

          return {
            filename,
            title,
            generatedDate,
            wordCount,
            filePath,
          };
        } catch (error) {
          return {
            filename,
            title: filename.replace('.txt', ''),
            generatedDate: 'Unknown',
            wordCount: 0,
            filePath: path.join('./examples', filename),
          };
        }
      })
    );

    res.json(scriptsWithDetails);
  } catch (error) {
    console.error('Error listing scripts:', error);
    res.status(500).json({ error: 'Failed to list scripts' });
  }
});

// Get a specific script
app.get('/api/scripts/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('./examples', filename);

    const content = await scriptGenerator.getScriptContent(filePath);
    res.json({ content });
  } catch (error) {
    console.error('Error reading script:', error);
    res.status(404).json({ error: 'Script not found' });
  }
});

// Delete a script
app.delete('/api/scripts/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('./examples', filename);

    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

// Get environment status
app.get('/api/status', async (req, res) => {
  const envStatus = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GOOGLE_SEARCH_API_KEY: !!process.env.GOOGLE_SEARCH_API_KEY,
    GOOGLE_SEARCH_ENGINE_ID: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
    SERPER_API_KEY: !!process.env.SERPER_API_KEY,
  };

  const hasSearchAPI = envStatus.SERPER_API_KEY ||
                      (envStatus.GOOGLE_SEARCH_API_KEY && envStatus.GOOGLE_SEARCH_ENGINE_ID);

  res.json({
    environmentStatus: envStatus,
    hasClaudeAPI: envStatus.ANTHROPIC_API_KEY,
    hasSearchAPI,
    serverStatus: 'running',
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 YouTube Script Generator Web Interface');
  console.log('=' .repeat(50));
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${process.cwd()}`);
  console.log('✨ Ready to generate scripts!');
  console.log('=' .repeat(50));
});

export default app;