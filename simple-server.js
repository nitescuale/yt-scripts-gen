import express from 'express';
import cors from 'cors';
import path from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Generate a new script using CLI
app.post('/api/generate', async (req, res) => {
  try {
    const { title, enableResearch, targetWordCount, maxRetries } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    console.log(`🌐 Web request: Generating script for "${title}"`);

    // Build the CLI command
    let command = `npm run dev generate "${title}"`;

    if (!enableResearch) {
      command += ' --no-research';
    }

    if (targetWordCount && targetWordCount !== 1250) {
      command += ` --words ${targetWordCount}`;
    }

    if (maxRetries && maxRetries !== 2) {
      command += ` --retries ${maxRetries}`;
    }

    console.log('Executing command:', command);

    let stdout, stderr;
    try {
      const result = await execAsync(command);
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError) {
      // CLI peut retourner un code d'erreur même si le script est généré
      console.log('CLI returned error code, but script might be generated:', execError.message);
      stdout = execError.stdout || '';
      stderr = execError.stderr || '';
    }

    console.log('CLI stdout:', stdout);
    if (stderr) console.log('CLI stderr:', stderr);

    // Find the generated file (most recent one)
    const scripts = await fs.readdir('./examples');
    const txtFiles = scripts.filter(file => file.endsWith('.txt'));

    if (txtFiles.length === 0) {
      throw new Error('No script file generated');
    }

    // Get file with most recent modification time
    const filesWithStats = await Promise.all(
      txtFiles.map(async file => {
        const filePath = path.join('./examples', file);
        const stats = await fs.stat(filePath);
        return { file, mtime: stats.mtime };
      })
    );

    const latestScript = filesWithStats
      .sort((a, b) => b.mtime - a.mtime)[0].file;

    const scriptContent = await fs.readFile(path.join('./examples', latestScript), 'utf-8');

    // Count words
    const words = scriptContent.split(/\s+/).length;

    // Check if this looks like a validation warning from the CLI output
    const isValidationWarning = stdout.includes('❌ Validation failed') ||
                               stdout.includes('Script is too short') ||
                               stderr.includes('Script generation failed');

    res.json({
      success: !isValidationWarning,
      script: scriptContent,
      wordCount: words,
      filePath: latestScript,
      researchSources: enableResearch ? 10 : 0,
      warning: isValidationWarning ? 'Script generated but shorter than target length' : undefined,
    });

  } catch (error) {
    console.error('Generation error:', error);

    // Check if a script was still generated despite the error
    try {
      const scripts = await fs.readdir('./examples');
      const latestScript = scripts
        .filter(file => file.endsWith('.txt'))
        .sort()
        .pop();

      if (latestScript) {
        const scriptContent = await fs.readFile(path.join('./examples', latestScript), 'utf-8');
        const words = scriptContent.split(/\s+/).length;

        res.json({
          success: false,
          script: scriptContent,
          wordCount: words,
          filePath: latestScript,
          researchSources: enableResearch ? 10 : 0,
          warning: `Script generated but with issues: ${error.message}`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: `Generation failed: ${error.message}`,
      });
    }
  }
});

// Get list of all generated scripts
app.get('/api/scripts', async (req, res) => {
  try {
    const scripts = await fs.readdir('./examples');
    const txtFiles = scripts.filter(file => file.endsWith('.txt'));

    const scriptsWithDetails = await Promise.all(
      txtFiles.map(async (filename) => {
        try {
          const filePath = path.join('./examples', filename);
          const content = await fs.readFile(filePath, 'utf-8');
          const stats = await fs.stat(filePath);

          // Extract metadata from the file
          const lines = content.split('\n');
          const titleLine = lines.find(line => line.includes('Title:'));
          const wordCountLine = lines.find(line => line.includes('Word count:'));

          const title = titleLine ?
            titleLine.split('Title:')[1]?.trim() :
            filename.replace('.txt', '');

          const wordCount = wordCountLine ?
            parseInt(wordCountLine.split('Word count:')[1]?.trim() || '0') :
            content.split(/\s+/).length;

          return {
            filename,
            title,
            generatedDate: stats.mtime.toISOString(),
            wordCount,
            filePath,
          };
        } catch (error) {
          return {
            filename,
            title: filename.replace('.txt', ''),
            generatedDate: new Date().toISOString(),
            wordCount: 0,
            filePath: path.join('./examples', filename),
          };
        }
      })
    );

    // Sort by date, newest first
    scriptsWithDetails.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));

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

    const content = await fs.readFile(filePath, 'utf-8');
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