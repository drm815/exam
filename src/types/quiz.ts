export type Difficulty = 1 | 2 | 3  // 별 1~3개

export interface Choice {
  id: 1 | 2 | 3 | 4
  text: string
}

export type SubjectId = 1 | 2 | 3 | 4  // 1:소방원론 2:소방전기일반 3:소방관계법규 4:소방전기시설

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
  sourceRef?: string       // 과목명 | 회차 정보
  subject?: SubjectId      // 과목 번호
  subjectName?: string     // 과목명
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
