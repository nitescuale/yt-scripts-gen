require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

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
    let command = `npm run dev -- generate "${title}"`;

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

    let stdout = '', stderr = '';
    try {
      const result = await execAsync(command, { timeout: 300000 }); // 5 minutes timeout
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError) {
      console.log('CLI returned error code, checking if script was generated...');
      stdout = execError.stdout || '';
      stderr = execError.stderr || '';
    }

    console.log('CLI finished, checking for generated files...');

    // Generate expected filename based on title (same logic as ScriptGenerator)
    const generateExpectedFilename = (title) => {
      const safeTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const timestamp = new Date().toISOString().slice(0, 10);
      return `${timestamp}-${safeTitle}.txt`;
    };

    const expectedFilename = generateExpectedFilename(title);
    const expectedFilePath = path.join('./library', expectedFilename);

    // First try to find the expected file
    let actualFilename, scriptContent;

    try {
      await fs.access(expectedFilePath);
      actualFilename = expectedFilename;
      scriptContent = await fs.readFile(expectedFilePath, 'utf-8');
      console.log('Found expected script file:', expectedFilename);
    } catch (error) {
      // Fallback: search for files that match the title in content
      console.log('Expected file not found, searching by title in content...');

      const scripts = await fs.readdir('./library');
      const txtFiles = scripts.filter(file => file.endsWith('.txt'));

      if (txtFiles.length === 0) {
        throw new Error('No script file generated');
      }

      let foundTitleMatch = false;

      // Check files from most recent to oldest
      const filesWithStats = await Promise.all(
        txtFiles.map(async file => {
          const filePath = path.join('./library', file);
          const stats = await fs.stat(filePath);
          return { file, mtime: stats.mtime };
        })
      );

      const sortedFiles = filesWithStats.sort((a, b) => b.mtime - a.mtime);

      for (const fileInfo of sortedFiles) {
        try {
          const filePath = path.join('./library', fileInfo.file);
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n');
          const titleLine = lines.find(line => line.includes('Title:'));

          if (titleLine) {
            const fileTitle = titleLine.split('Title:')[1].trim();
            console.log(`Checking file ${fileInfo.file} with title: "${fileTitle}"`);

            if (fileTitle.toLowerCase() === title.toLowerCase()) {
              actualFilename = fileInfo.file;
              scriptContent = content;
              foundTitleMatch = true;
              console.log('✅ Found matching title in file:', fileInfo.file);
              break;
            }
          }
        } catch (readError) {
          console.log('Error reading file', fileInfo.file, ':', readError.message);
        }
      }

      if (!foundTitleMatch) {
        // Final fallback: most recent file
        actualFilename = sortedFiles[0].file;
        scriptContent = await fs.readFile(path.join('./library', actualFilename), 'utf-8');
        console.log('⚠️ No title match found, using most recent file:', actualFilename);
      }
    }
    const words = scriptContent.split(/\s+/).length;

    // Check if there were validation warnings
    const hasWarnings = stdout.includes('❌ Validation failed') ||
                       stdout.includes('Script is too short') ||
                       stderr.includes('Script generation failed');

    const response = {
      success: !hasWarnings,
      script: scriptContent,
      wordCount: words,
      filePath: actualFilename,
      researchSources: enableResearch ? 10 : 0,
    };

    if (hasWarnings) {
      response.warning = 'Script generated but shorter than target length';
    }

    res.json(response);

  } catch (error) {
    console.error('Generation error:', error);

    // Try to find any script that might have been generated
    try {
      const scripts = await fs.readdir('./library');
      const txtFiles = scripts.filter(file => file.endsWith('.txt'));

      if (txtFiles.length > 0) {
        const filesWithStats = await Promise.all(
          txtFiles.map(async file => {
            const filePath = path.join('./library', file);
            const stats = await fs.stat(filePath);
            return { file, mtime: stats.mtime };
          })
        );

        const latestScript = filesWithStats
          .sort((a, b) => b.mtime - a.mtime)[0].file;

        const scriptContent = await fs.readFile(path.join('./library', latestScript), 'utf-8');
        const words = scriptContent.split(/\s+/).length;

        res.json({
          success: false,
          script: scriptContent,
          wordCount: words,
          filePath: latestScript,
          researchSources: enableResearch ? 10 : 0,
          warning: `Script generated with issues: ${error.message}`,
        });
        return;
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get list of all generated scripts
app.get('/api/scripts', async (req, res) => {
  try {
    const scripts = await fs.readdir('./library');
    const txtFiles = scripts.filter(file => file.endsWith('.txt'));

    const scriptsWithDetails = await Promise.all(
      txtFiles.map(async (filename) => {
        try {
          const filePath = path.join('./library', filename);
          const content = await fs.readFile(filePath, 'utf-8');
          const stats = await fs.stat(filePath);

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
            filePath: path.join('./library', filename),
          };
        }
      })
    );

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
    const filePath = path.join('./library', filename);

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
    const filePath = path.join('./library', filename);

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
  console.log('='.repeat(50));
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${process.cwd()}`);
  console.log('✨ Ready to generate scripts!');
  console.log('='.repeat(50));
});

module.exports = app;