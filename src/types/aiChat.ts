/**
 * 中医问诊 -> 开方 两段式工作流 类型定义
 */

export interface InquiryOption {
  label: string
  value: string
}

export interface MockInquiry {
  type: 'inquiry'
  text: string
  options: InquiryOption[]
}

export interface RecipeItem {
  name: string
  tags: string[]
  ingredients: string[]
  steps: string[]
  is_folded?: boolean
}

export interface AcupointItem {
  name: string
  location: string
  method: string
}

export interface MockPrescription {
  type: 'prescription'
  diagnosis_result: string
  summary: string
  recipes: RecipeItem[]
  acupoints: AcupointItem[]
  lifestyle: string[]
}

export type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'assistant'; type: 'inquiry'; text: string; options: InquiryOption[] }
  | {
      role: 'assistant'
      type: 'prescription'
      diagnosis_result: string
      summary: string
      recipes: RecipeItem[]
      acupoints: AcupointItem[]
      lifestyle: string[]
      pendingTag?: string
    }
