# YouTube Script Generator

An AI-powered tool that generates comprehensive, engaging YouTube video scripts based on Claude SDK. The application creates 5-10 minute scripts in the style of informative slideshow presentations, with optional web research integration.

## Features

- 🤖 **AI-Powered Generation**: Uses Claude's advanced language model for script creation
- 🔍 **Web Research Integration**: Automatically researches topics for accurate, up-to-date content
- 📊 **Quality Validation**: Ensures scripts meet word count and structure requirements
- 💾 **Automatic Saving**: Scripts saved with metadata and timestamps
- 🎯 **Optimized Prompts**: Based on analysis of successful YouTube video scripts
- 🖥️ **CLI Interface**: Easy-to-use command-line interface

## Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` with your API keys:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Choose one search API
SERPER_API_KEY=your_serper_api_key_here
# OR
GOOGLE_SEARCH_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

## Usage

### Web Interface (Recommended)

Start the web server:
```bash
npm run web
```

Then open your browser and go to: **http://localhost:3000**

The web interface provides:
- ✨ **Intuitive form** for script generation with all options
- 📚 **Scripts library** with preview and management
- 🔍 **Real-time status** indicator for API configuration
- 💾 **Easy download/copy** functionality for scripts
- 🗑️ **Delete scripts** directly from the interface
- 📱 **Responsive design** that works on mobile and desktop

### Command Line Interface

Generate a script:
```bash
npm run dev generate "Every way to lose weight explained"
```

Options:
- `-o, --output <dir>`: Output directory (default: `./examples`)
- `--no-research`: Skip web research phase
- `-w, --words <count>`: Target word count (default: 1250)
- `-r, --retries <count>`: Max generation retries (default: 2)

List generated scripts:
```bash
npm run dev list
```

View a script:
```bash
npm run dev show 2024-01-15-every-way-to-lose-weight-explained.txt
```

Check setup:
```bash
npm run dev setup
```

## API Keys Setup

### Anthropic API (Required)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account and get your API key
3. Add it to your `.env` file as `ANTHROPIC_API_KEY`

### Search APIs (Optional)

Choose one of these for web research:

#### Serper API (Recommended)
1. Go to [Serper.dev](https://serper.dev/)
2. Sign up and get your API key
3. Add as `SERPER_API_KEY` in `.env`

#### Google Custom Search API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Custom Search API
3. Create credentials and get API key
4. Create a Custom Search Engine and get the ID
5. Add both to `.env` as `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID`

## Script Style

The generated scripts follow these characteristics:

- **Comprehensive Coverage**: Complete exploration of the topic
- **Engaging Structure**: Hook opening → systematic breakdown → rich examples → conclusion
- **Informative Tone**: Educational but accessible language
- **Real Examples**: Specific case studies and concrete details
- **Progressive Build**: Increasing complexity/intensity throughout
- **Viewer Retention**: Designed to maintain attention for 5-10 minutes

## Examples

The application works well with titles like:

- "Every US Government Secrecy Level Explained"
- "Every DEFCON Level Explained"
- "Every Special Operations Force Explained"
- "Every way to lose weight explained"
- "Every programming language explained"
- "Every type of renewable energy explained"

## Project Structure

```
yt-scripts-gen/
├── src/
│   ├── index.ts              # CLI interface
│   ├── scriptGenerator.ts    # Main orchestration logic
│   ├── claudeService.ts      # Claude API integration
│   ├── researchService.ts    # Web search functionality
│   └── promptSystem.ts       # Optimized prompts
├── examples/                 # Generated scripts
├── config/                   # Configuration files
└── README.md
```

## Development

Build the project:
```bash
npm run build
```

Run in development mode:
```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License - see package.json for details