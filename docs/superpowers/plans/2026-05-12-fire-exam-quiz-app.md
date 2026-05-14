# 소방시설관리기사 기출문제 퀴즈 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소방관계법규 기출문제 이미지에서 추출한 실제 문제를 랜덤으로 출제하여, 1문제씩 풀기 → 정답 해설 → 10문제 완료 후 오답 재시험 및 전체 반복 학습이 가능한 웹앱을 만든다.

**Architecture:** Next.js(App Router) + TypeScript 단일 프로젝트. 문제 데이터는 기출 이미지에서 직접 추출해 `questions.ts`에 정적으로 저장하며, 외부 API 없이 클라이언트에서 랜덤 셔플로 출제한다. UI는 순수 Tailwind CSS(빨간 테마)로 구현한다.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS

---

## 기출문제 현황 (추출 완료)

기출 이미지 3회분 (`25.02`, `25.05`, `25.09`) 각 20문제씩, 총 60문제 정적 저장.
- **q001–q020**: 25.02 기출 #41–#60
- **q021–q040**: 25.05 기출 #41–#60
- **q041–q060**: 25.09 기출 #41–#60

형식 특징:
- **별(★) 난이도** 표시 (★, ★★, ★★★)
- **법령 조항 출처** (예: `소방시설법 시행령 별표 4`)
- **4지선다** 객관식
- **해설** (정답 근거 법령 포함)

---

## File Structure

```
exam/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 루트 레이아웃 (폰트, 메타)
│   │   ├── page.tsx                # 홈 → /quiz redirect
│   │   └── quiz/
│   │       └── page.tsx            # 퀴즈 메인 (세션 관리 + UI)
│   ├── components/
│   │   ├── QuizCard.tsx            # 문제 표시 카드 (번호, 별, 지문, 4지선다)
│   │   ├── AnswerFeedback.tsx      # 정답/오답 피드백 + 해설
│   │   ├── ProgressBar.tsx         # 진행률 바 (N/10)
│   │   ├── ResultSummary.tsx       # 10문제 완료 후 결과 화면
│   │   └── StartScreen.tsx         # 시작 화면
│   ├── lib/
│   │   ├── questions.ts            # 기출문제 60개 정적 데이터
│   │   └── sessionStore.ts         # 클라이언트 세션 상태 (useReducer)
│   └── types/
│       └── quiz.ts                 # 공유 타입 정의
├── .env.local                      # (현재 불필요, 향후 확장용)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Task 1: 프로젝트 초기화 ✅

**Files:**
- `package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`

- [x] **Step 1: Next.js 프로젝트 생성**

```bash
npx create-next-app@latest . --typescript --tailwind --app --import-alias "@/*" --yes
```

- [x] **Step 2: 개발 서버 확인**

```bash
npm run dev
# http://localhost:3000 접속 확인
```

- [x] **Step 3: Commit**

```bash
git init
git add .
git commit -m "chore: initialize Next.js project with Tailwind"
```

---

## Task 2: 타입 정의 ✅

**Files:**
- `src/types/quiz.ts`

- [x] **Step 1: 공유 타입 정의**

`src/types/quiz.ts`:
```typescript
export type Difficulty = 1 | 2 | 3

export interface Choice {
  id: 1 | 2 | 3 | 4
  text: string
}

export interface Question {
  id: string               // 예: "q001"
  source: string           // 예: "25.02 기출 #41"
  difficulty: Difficulty
  stem: string
  choices: Choice[]
  correctId: 1 | 2 | 3 | 4
  explanation: string
  lawRef?: string
  hasTable?: boolean
  sourceRef?: string       // 오답 재시험용 원본 ID 참조
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
```

- [x] **Step 2: Commit**

```bash
git add src/types/quiz.ts
git commit -m "feat: add quiz type definitions"
```

---

## Task 3: 기출문제 데이터 ✅

**Files:**
- `src/lib/questions.ts`

- [x] **Step 1: 기출문제 60개 입력**

`src/lib/questions.ts`에 25.02·25.05·25.09 기출 각 20문제 (q001–q060) 정적 저장.
각 문제: `id`, `source`, `difficulty`, `stem`, `choices[4]`, `correctId`, `explanation`, `lawRef`.

- [x] **Step 2: Commit**

```bash
git add src/lib/questions.ts
git commit -m "feat: add 60 actual exam questions from 3 exam sets"
```

---

## Task 4: 세션 상태 관리 ✅

**Files:**
- `src/lib/sessionStore.ts`

- [x] **Step 1: 세션 reducer 작성**

`src/lib/sessionStore.ts`:
```typescript
import type { Question, QuizSession, QuizResult } from '@/types/quiz'

type Action =
  | { type: 'START'; questions: Question[]; mode: 'full' | 'retry-wrong' }
  | { type: 'ANSWER'; questionId: string; choiceId: 1 | 2 | 3 | 4 }
  | { type: 'NEXT' }
  | { type: 'RESET' }

export function sessionReducer(state: QuizSession, action: Action): QuizSession {
  switch (action.type) {
    case 'START':
      return { questions: action.questions, currentIndex: 0, answers: {}, mode: action.mode, status: 'in-progress' }
    case 'ANSWER':
      return { ...state, answers: { ...state.answers, [action.questionId]: action.choiceId } }
    case 'NEXT': {
      const nextIndex = state.currentIndex + 1
      return { ...state, currentIndex: nextIndex, status: nextIndex >= state.questions.length ? 'completed' : 'in-progress' }
    }
    case 'RESET':
      return initialSession
    default:
      return state
  }
}

export const initialSession: QuizSession = {
  questions: [], currentIndex: 0, answers: {}, mode: 'full', status: 'in-progress',
}

export function computeResult(session: QuizSession): QuizResult {
  const wrong: Question[] = []
  let correct = 0
  for (const q of session.questions) {
    if (session.answers[q.id] === q.correctId) correct++
    else wrong.push(q)
  }
  return { total: session.questions.length, correct, wrong }
}
```

- [x] **Step 2: Commit**

```bash
git add src/lib/sessionStore.ts
git commit -m "feat: add quiz session reducer and result computation"
```

---

## Task 5: UI 컴포넌트 ✅

**Files:**
- `src/components/ProgressBar.tsx`
- `src/components/QuizCard.tsx`
- `src/components/AnswerFeedback.tsx`
- `src/components/ResultSummary.tsx`
- `src/components/StartScreen.tsx`

- [x] **Step 1: ProgressBar** — 진행률 바 (N/total), 빨간 fill

- [x] **Step 2: QuizCard** — 문제 출처·별·지문·4지선다. 답 제출 후 정답=초록, 오답=빨간 하이라이트

- [x] **Step 3: AnswerFeedback** — 정답/오답 판정 + 해설 + 근거법령 + 다음 문제 버튼

- [x] **Step 4: ResultSummary** — 점수·정답률·등급(합격권≥80%/보통≥60%/추가학습필요), 틀린 문제 목록, 오답 재시험·전체 다시 풀기 버튼

- [x] **Step 5: StartScreen** — 시작 버튼

- [x] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add all quiz UI components"
```

---

## Task 6: 퀴즈 페이지 메인 로직 ✅

**Files:**
- `src/app/quiz/page.tsx`
- `src/app/page.tsx`

- [x] **Step 1: 퀴즈 페이지 작성**

`src/app/quiz/page.tsx`:
```tsx
'use client'

import { useReducer, useState } from 'react'
import { sessionReducer, initialSession, computeResult } from '@/lib/sessionStore'
import { SOURCE_QUESTIONS } from '@/lib/questions'
import type { Question } from '@/types/quiz'
import StartScreen from '@/components/StartScreen'
import ProgressBar from '@/components/ProgressBar'
import QuizCard from '@/components/QuizCard'
import AnswerFeedback from '@/components/AnswerFeedback'
import ResultSummary from '@/components/ResultSummary'

const QUIZ_COUNT = 10

function pickRandom(count: number, pool: Question[]): Question[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export default function QuizPage() {
  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [started, setStarted] = useState(false)
  const [selectedId, setSelectedId] = useState<1 | 2 | 3 | 4 | null>(null)
  const [answered, setAnswered] = useState(false)

  const currentQuestion = session.questions[session.currentIndex]
  const result = session.status === 'completed' ? computeResult(session) : null

  const startQuiz = (mode: 'full' | 'retry-wrong', questions: Question[]) => {
    dispatch({ type: 'START', questions, mode })
    setStarted(true)
    setSelectedId(null)
    setAnswered(false)
  }

  const handleStart = () => startQuiz('full', pickRandom(QUIZ_COUNT, SOURCE_QUESTIONS))
  const handleRetryWrong = () => { if (result) startQuiz('retry-wrong', result.wrong) }
  const handleRestartFull = () => startQuiz('full', pickRandom(QUIZ_COUNT, SOURCE_QUESTIONS))

  const handleSelect = (id: 1 | 2 | 3 | 4) => {
    if (answered) return
    setSelectedId(id)
    dispatch({ type: 'ANSWER', questionId: currentQuestion.id, choiceId: id })
    setAnswered(true)
  }

  const handleNext = () => {
    dispatch({ type: 'NEXT' })
    setSelectedId(null)
    setAnswered(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-red-600">소방관계법규 기출문제</h1>
          {session.mode === 'retry-wrong' && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">오답 재시험 모드</span>
          )}
        </div>

        {!started && session.status !== 'completed' && (
          <StartScreen onStart={handleStart} loading={false} />
        )}

        {started && session.status === 'in-progress' && currentQuestion && (
          <>
            <ProgressBar current={session.currentIndex + 1} total={session.questions.length} />
            <QuizCard question={currentQuestion} selectedId={selectedId} onSelect={handleSelect} answered={answered} />
            {answered && selectedId && (
              <AnswerFeedback
                question={currentQuestion}
                selectedId={selectedId}
                onNext={handleNext}
                isLast={session.currentIndex === session.questions.length - 1}
              />
            )}
          </>
        )}

        {session.status === 'completed' && result && (
          <ResultSummary result={result} mode={session.mode} onRetryWrong={handleRetryWrong} onRestartFull={handleRestartFull} />
        )}
      </div>
    </main>
  )
}
```

- [x] **Step 2: 홈 페이지 redirect**

`src/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
export default function Home() { redirect('/quiz') }
```

- [x] **Step 3: 브라우저에서 전체 플로우 확인**

```bash
npm run dev
# http://localhost:3000 → /quiz 자동 이동
```

수동 확인 체크:
- [x] 시작 화면 → 즉시 문제 출제 (로딩 없음)
- [x] 문제 카드 (지문, 4지선다, 별, 출처)
- [x] 선택지 클릭 → 정답/오답 피드백
- [x] 다음 문제 → 진행률 바 갱신
- [x] 10문제 후 결과 화면
- [x] 오답 재시험
- [x] 전체 다시 풀기 (새 랜덤 10문제)

- [x] **Step 4: Commit**

```bash
git add src/app/quiz/page.tsx src/app/page.tsx
git commit -m "feat: serve actual exam questions directly without AI generation"
```

---

## Task 7: 빌드 검증 ✅

- [x] **Step 1: TypeScript 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 0개

- [x] **Step 2: 프로덕션 빌드**

```bash
npm run build
```

Expected: ✓ Compiled successfully

- [x] **Step 3: Vercel 배포**

GitHub push → Vercel 자동 배포
배포 URL: https://exam-opal-kappa.vercel.app/quiz

- [x] **Step 4: 최종 Commit & Push**

```bash
git push origin main
```

---

## 구현 완료 현황

| 요구사항 | 상태 | 비고 |
|---|---|---|
| 기출문제 60개 정적 저장 | ✅ | 25.02·25.05·25.09 각 20문제 |
| 랜덤 10문제 출제 (로딩 없음) | ✅ | API 없이 즉시 출제 |
| 1문제씩 + 정답 해설 | ✅ | |
| 10문제 완료 후 결과 화면 | ✅ | 점수·정답률·등급 |
| 틀린 문제만 다시 풀기 | ✅ | |
| 전체 다시 풀기 (새 랜덤) | ✅ | |
| Vercel 배포 | ✅ | exam-opal-kappa.vercel.app |

## 향후 확장 가능 항목

- 과목별 필터 (소방기본법 / 소방시설법 / 위험물법 등)
- 회차별 선택 출제 (25.02만, 25.05만 등)
- 문제 수 조절 (10문제 / 20문제)
- 오답 노트 저장 (localStorage)
- 난이도별 필터
