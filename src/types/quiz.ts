export type Difficulty = 1 | 2 | 3  // 별 1~3개

export interface Choice {
  id: 1 | 2 | 3 | 4
  text: string
}

export interface Question {
  id: string               // 예: "q001"
  source: string           // 예: "25.02 기출 #41"
  difficulty: Difficulty
  stem: string             // 문제 지문
  choices: Choice[]        // 4개
  correctId: 1 | 2 | 3 | 4
  explanation: string      // 해설 (법령 조항 포함)
  lawRef?: string          // 근거 법령
  hasTable?: boolean
  sourceRef?: string       // 유사문제가 참조한 원본 기출 ID (Task 7에서 사용)
}

export interface QuizSession {
  questions: Question[]
  currentIndex: number
  answers: Record<string, 1 | 2 | 3 | 4 | null>
  mode: 'full' | 'retry-wrong'
  status: 'in-progress' | 'completed'
}

export interface QuizResult {
  total: number
  correct: number
  wrong: Question[]
}
