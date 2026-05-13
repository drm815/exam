import type { Question } from '@/types/quiz'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const data = require('./pdfQuestions.json')

// 소방설비기사(전기분야) 기출문제 - 2025.09 기출 (과목별 20문제 × 4과목)
export const PDF_QUESTIONS: Question[] = data as Question[]
