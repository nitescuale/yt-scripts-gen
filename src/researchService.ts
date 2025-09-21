import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export interface ResearchData {
  searchResults: SearchResult[];
  compiledInfo: string;
}

class ResearchService {
  private googleApiKey: string | undefined;
  private googleSearchEngineId: string | undefined;
  private serperApiKey: string | undefined;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.serperApiKey = process.env.SERPER_API_KEY;
  }

  async searchWithGoogle(query: string, numResults: number = 10): Promise<SearchResult[]> {
    if (!this.googleApiKey || !this.googleSearchEngineId) {
      throw new Error('Google Search API credentials not configured');
    }

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleApiKey,
          cx: this.googleSearchEngineId,
          q: query,
          num: numResults,
        },
      });

      return response.data.items?.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      })) || [];
    } catch (error) {
      console.error('Google Search API error:', error);
      return [];
    }
  }

  async searchWithSerper(query: string, numResults: number = 10): Promise<SearchResult[]> {
    if (!this.serperApiKey) {
      throw new Error('Serper API key not configured');
    }

    try {
      const response = await axios.post(
        'https://google.serper.dev/search',
        {
          q: query,
          num: numResults,
        },
        {
          headers: {
            'X-API-KEY': this.serperApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.organic?.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      })) || [];
    } catch (error) {
      console.error('Serper API error:', error);
      return [];
    }
  }

  async performResearch(topic: string): Promise<ResearchData> {
    console.log(`🔍 Researching: ${topic}`);

    const searchQueries = this.generateSearchQueries(topic);
    const allResults: SearchResult[] = [];

    for (const query of searchQueries) {
      console.log(`  Searching: ${query}`);
      let results: SearchResult[] = [];

      try {
        if (this.serperApiKey) {
          results = await this.searchWithSerper(query, 10);
        } else if (this.googleApiKey && this.googleSearchEngineId) {
          results = await this.searchWithGoogle(query, 10);
        } else {
          console.warn('No search API configured, using mock data');
          results = this.getMockResults(query);
        }

        allResults.push(...results);

        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
      }
    }

    const compiledInfo = this.compileResearchInfo(allResults, topic);

    return {
      searchResults: allResults,
      compiledInfo,
    };
  }

  private generateSearchQueries(topic: string): string[] {
    // Optimized for maximum quality with minimal API usage (3 queries max)
    // Strategy: Target high-quality universal sources that cover all aspects

    const queries = [];

    // Query 1: Main topic with Wikipedia preference (comprehensive overview)
    queries.push(`${topic} site:wikipedia.org OR ${topic} explained`);

    // Query 2: Technical details and examples from quality sources
    queries.push(`${topic} examples facts site:britannica.com OR ${topic} how it works`);

    // Query 3: Specific to topic type for detailed breakdown
    if (topic.toLowerCase().includes('every') || topic.toLowerCase().includes('all')) {
      const cleanTopic = topic.replace(/every|all/gi, '').trim();
      queries.push(`types of ${cleanTopic} categories list site:edu OR ${cleanTopic} classification`);
    } else {
      queries.push(`${topic} latest developments research site:edu OR ${topic} modern applications`);
    }

    return queries;
  }

  private compileResearchInfo(results: SearchResult[], topic: string): string {
    if (results.length === 0) {
      return `Research topic: ${topic}\n\nNo search results available. Please ensure search API is properly configured.`;
    }

    let compiled = `Research topic: ${topic}\n\n`;
    compiled += `Compiled from ${results.length} search results:\n\n`;

    const sections = {
      'Key Information': [] as string[],
      'Definitions and Explanations': [] as string[],
      'Examples and Case Studies': [] as string[],
      'Technical Details': [] as string[],
      'Recent Developments': [] as string[],
    };

    results.forEach((result, index) => {
      const snippet = result.snippet || '';

      if (snippet.toLowerCase().includes('definition') ||
          snippet.toLowerCase().includes('what is') ||
          snippet.toLowerCase().includes('means')) {
        sections['Definitions and Explanations'].push(`${index + 1}. ${result.title}: ${snippet}`);
      } else if (snippet.toLowerCase().includes('example') ||
                 snippet.toLowerCase().includes('case study') ||
                 snippet.toLowerCase().includes('instance')) {
        sections['Examples and Case Studies'].push(`${index + 1}. ${result.title}: ${snippet}`);
      } else if (snippet.toLowerCase().includes('how') ||
                 snippet.toLowerCase().includes('process') ||
                 snippet.toLowerCase().includes('mechanism')) {
        sections['Technical Details'].push(`${index + 1}. ${result.title}: ${snippet}`);
      } else if (snippet.toLowerCase().includes('recent') ||
                 snippet.toLowerCase().includes('latest') ||
                 snippet.toLowerCase().includes('new')) {
        sections['Recent Developments'].push(`${index + 1}. ${result.title}: ${snippet}`);
      } else {
        sections['Key Information'].push(`${index + 1}. ${result.title}: ${snippet}`);
      }
    });

    Object.entries(sections).forEach(([sectionName, items]) => {
      if (items.length > 0) {
        compiled += `## ${sectionName}\n`;
        items.forEach(item => {
          compiled += `${item}\n\n`;
        });
      }
    });

    return compiled;
  }

  private getMockResults(query: string): SearchResult[] {
    return [
      {
        title: `Mock Result for: ${query}`,
        link: 'https://example.com',
        snippet: `This is a mock search result for "${query}". In a real implementation, this would contain actual search results from the web.`,
      },
    ];
  }
}

export default ResearchService;