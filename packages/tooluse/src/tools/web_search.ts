/**
 * Web Search tool (stub)
 */

export const webSearchTool = {
  id: 'web_search',
  name: 'Web Search',
  description: 'Search the web for information',
  execute: async (args: { query: string; numResults?: number }) => {
    // TODO: Implement actual web search
    return {
      results: [
        {
          title: `Search result for: ${args.query}`,
          url: 'https://example.com',
          snippet: 'This is a stub search result.',
        },
      ],
    }
  },
}
