/**
 * Calculator tool
 */

export const calculatorTool = {
  id: 'calculator',
  name: 'Calculator',
  description: 'Perform mathematical calculations',
  execute: async (args: { expression: string }) => {
    try {
      // Note: In production, use a safe math evaluator
      return eval(args.expression)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Calculation error: ${message}`)
    }
  },
}
