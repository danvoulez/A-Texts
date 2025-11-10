/**
 * Tool Router
 */

export interface Tool {
  id: string
  name: string
  description: string
  execute: (args: any) => Promise<any>
}

export class ToolRouter {
  private tools: Map<string, Tool> = new Map()
  
  register(tool: Tool): void {
    this.tools.set(tool.id, tool)
  }
  
  async execute(toolId: string, args: any): Promise<any> {
    const tool = this.tools.get(toolId)
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`)
    }
    
    return await tool.execute(args)
  }
  
  list(): Tool[] {
    return Array.from(this.tools.values())
  }
}
