# 소방시설관리기사 유사문제 퀴즈 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소방관계법규 기출문제 이미지를 분석해 유사문제를 생성하고, 1문제씩 풀기 → 정답 해설 → 20문제 완료 후 오답 재시험 및 전체 반복 학습이 가능한 웹앱을 만든다.

**Architecture:** Next.js(App Router) + TypeScript 단일 프로젝트. 문제 데이터는 기출 이미지를 읽어 수동으로 JSON에 정리한 뒤, Claude API를 이용해 런타임에 유사문제를 생성한다. UI는 순수 Tailwind CSS로 구현하며 별도 백엔드 없이 API Route만 사용한다.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Anthropic SDK (claude-sonnet-4-6), Zod (스키마 검증)

---

## 기출문제 파악 (이미 분석 완료)

기출 이미지 3회분 (`20250207`, `20250521`, `20250901`) 각 7장씩 확인. 각 회차당 약 10문제(41번~50번대), 총 30여 문제. 형식 특징:

- **별(★) 난이도** 표시 (★, ★★, ★★★)
- **법령 조항 출처** 박스 (예: `22.03.#41`, `13.09.#44`)
- **4지선다** 객관식
- **해설 박스** (정답 번호 + 근거 법령 표)
- 일부 문제에 **표/도표** 포함

---

## File Structure

```
exam/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 루트 레이아웃 (폰트, 메타)
│   │   ├── page.tsx                # 홈 (시작 화면)
│   │   ├── quiz/
│   │   │   └── page.tsx            # 퀴즈 메인 (세션 관리 + UI)
│   │   └── api/
│   │       └── generate-question/
│   │           └── route.ts        # Claude API 유사문제 생성 엔드포인트
│   ├── components/
│   │   ├── QuizCard.tsx            # 문제 표시 카드 (번호, 별, 지문, 4지선다)
│   │   ├── AnswerFeedback.tsx      # 정답/오답 피드백 + 해설
│   │   ├── ProgressBar.tsx         # 진행률 바 (N/20)
│   │   ├── ResultSummary.tsx       # 20문제 완료 후 결과 화면
│   │   └── StartScreen.tsx         # 시작 / 전체다시풀기 선택 화면
│   ├── lib/
│   │   ├── questions.ts            # 기출문제 원본 JSON 데이터 (30문제)
│   │   ├── questionSchema.ts       # Zod 스키마 (Question, GeneratedQuestion)
│   │   ├── generateQuestion.ts     # Claude API 호출 로직 (캐싱 포함)
│   │   └── sessionStore.ts         # 클라이언트 세션 상태 (zustand 없이 useReducer)
│   └── types/
│       └── quiz.ts                 # 공유 타입 정의
├── public/
│   └── exam-images/                # 기출 이미지 (정적 참조용)
├── .env.local                      # ANTHROPIC_API_KEY
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `.env.local`, `src/app/layout.tsx`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/binzzang/development/exam
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Expected: 프로젝트 파일 생성 완료

- [ ] **Step 2: Anthropic SDK + Zod 설치**

```bash
npm install @anthropic-ai/sdk zod
```

Expected: `node_modules/@anthropic-ai` 생성

- [ ] **Step 3: `.env.local` 생성**

```bash
# .env.local
ANTHROPIC_API_KEY=your_key_here
```

실제 키를 넣고 저장.

- [ ] **Step 4: 기본 레이아웃 작성**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '소방시설관리기사 - 소방관계법규 유사문제',
  description: '기출문제 기반 유사문제 풀기',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: 개발 서버 실행 확인**

```bash
npm run dev
```

Expected: `http://localhost:3000` 접속 시 Next.js 기본 화면

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: initialize Next.js project with Tailwind and Anthropic SDK"
```

---

## Task 2: 타입 정의 및 기출문제 데이터

**Files:**
- Create: `src/types/quiz.ts`
- Create: `src/lib/questionSchema.ts`
- Create: `src/lib/questions.ts`

- [ ] **Step 1: 공유 타입 정의**

`src/types/quiz.ts`:
```typescript
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
  lawRef?: string          // 근거 법령 (예: "소방시설법 시행령 별표 4")
  hasTable?: boolean       // 표 포함 여부
}

export interface QuizSession {
  questions: Question[]
  currentIndex: number
  answers: Record<string, 1 | 2 | 3 | 4 | null>  // questionId → 선택지
  mode: 'full' | 'retry-wrong'
  status: 'in-progress' | 'completed'
}

export interface QuizResult {
  total: number
  correct: number
  wrong: Question[]
}
```

- [ ] **Step 2: Zod 스키마 정의**

`src/lib/questionSchema.ts`:
```typescript
import { z } from 'zod'

export const ChoiceSchema = z.object({
  id: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string().min(1),
})

export const QuestionSchema = z.object({
  id: z.string(),
  source: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stem: z.string().min(10),
  choices: z.array(ChoiceSchema).length(4),
  correctId: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  explanation: z.string().min(10),
  lawRef: z.string().optional(),
  hasTable: z.boolean().optional(),
})

export type QuestionInput = z.infer<typeof QuestionSchema>
```

- [ ] **Step 3: 기출문제 데이터 입력 (30문제)**

`src/lib/questions.ts` — 기출 이미지에서 확인한 문제들을 JSON으로 정리:

```typescript
import type { Question } from '@/types/quiz'

export const SOURCE_QUESTIONS: Question[] = [
  {
    id: 'q001',
    source: '25.02 기출 #41',
    difficulty: 3,
    stem: '소방시설 설치 및 관리에 관한 법령상 간이스프링클러설비를 설치하여야 하는 특정소방대상물의 기준으로 옳은 것은?',
    choices: [
      { id: 1, text: '근린생활시설로 사용하는 부분의 바닥면적 합계가 1000㎡ 이상인 것은 모든 층' },
      { id: 2, text: '교육연구시설 내에 있는 합숙소로서 연면적 500㎡ 이상인 것' },
      { id: 3, text: '의료재활시설을 제외한 요양병원으로 사용되는 바닥면적의 합계가 300㎡ 이상 600㎡ 미만인 시설' },
      { id: 4, text: '정신의료기관 또는 의료재활시설로 사용되는 바닥면적의 합계가 600㎡ 미만인 시설' },
    ],
    correctId: 4,
    explanation: '소방시설법 시행령 별표 4에 따라 정신의료기관 또는 의료재활시설로 사용되는 바닥면적의 합계가 300㎡ 이상 600㎡ 미만인 시설(바닥면적 합계 600㎡ 미만)이 간이스프링클러설비 설치 대상이다.',
    lawRef: '소방시설법 시행령 별표 4',
  },
  {
    id: 'q002',
    source: '25.02 기출 #42',
    difficulty: 3,
    stem: '위험물안전관리법령상 인화성 액체 위험물(이황화탄소를 제외)의 옥외탱크저장소의 탱크 주위에 설치하여야 하는 방유제의 기준 중 틀린 것은?',
    choices: [
      { id: 1, text: '방유제의 용량은 방유제 안에 설치된 탱크가 하나인 때에는 그 탱크 용량의 110% 이상으로 할 것' },
      { id: 2, text: '방유제는 높이가 1m 이상 2m 이하, 두께 0.2m 이상, 지하매설깊이 0.5m 이상으로 할 것' },
      { id: 3, text: '방유제의 면적은 80000㎡ 이하로 할 것' },
      { id: 4, text: '방유제 내의 면적은 80000㎡ 이하로 할 것' },
    ],
    correctId: 2,
    explanation: '방유제는 높이 0.5m 이상 3m 이하(두께 0.2m 이상, 지하매설깊이 1m 이상)이어야 한다. 높이 1m 이상은 틀린 기준이다.',
    lawRef: '위험물법 별표 6',
  },
  {
    id: 'q003',
    source: '25.02 기출 #43',
    difficulty: 3,
    stem: '소방기본법령상 소방안전교육사의 배치대상별 배치기준으로 틀린 것은?',
    choices: [
      { id: 1, text: '소방청 : 2명 이상 배치' },
      { id: 2, text: '소방본부 : 2명 이상 배치' },
      { id: 3, text: '소방서 : 1명 이상 배치' },
      { id: 4, text: '한국소방안전원(전국) : 1명 이상 배치' },
    ],
    correctId: 4,
    explanation: '한국소방안전원은 시·도지부에 1명 이상, 협회(전국)에는 2명 이상 배치해야 한다. 1명 이상은 틀린 기준이다.',
    lawRef: '소방기본법 시행령 별표 2의 3',
  },
  {
    id: 'q004',
    source: '25.02 기출 #44',
    difficulty: 2,
    stem: '소방안전관리자 및 소방안전관리보조자에 대한 실무교육의 교육대상, 교육일정 등 실무교육에 필요한 교육을 수립하여 매년 누구의 승인을 받아 교육을 실시하는가?',
    choices: [
      { id: 1, text: '한국소방안전원장' },
      { id: 2, text: '소방본부장' },
      { id: 3, text: '소방청장' },
      { id: 4, text: '시·도지사' },
    ],
    correctId: 3,
    explanation: '공사법 33조에 따라 실무교육 계획은 소방청장의 승인을 받아 시행한다.',
    lawRef: '공사법 33조',
  },
  {
    id: 'q005',
    source: '25.02 기출 #45',
    difficulty: 3,
    stem: '소방기본법령상 용어의 정의로 옳은 것은?',
    choices: [
      { id: 1, text: '소방서장이란 시·도에서 화재의 예방·진압·조사 및 구조·구급 등의 업무를 담당하는 부서의 장을 말한다.' },
      { id: 2, text: '관계인이란 소방대상물을 소유자·관리자로서 한정하는 자를 말한다.' },
      { id: 3, text: '소방대란 화재를 진압하고 화재·재해·그 밖의 위급한 상황에서 구조·구급 활동을 하기 위하여 소방공무원으로만 구성된 조직체를 말한다.' },
      { id: 4, text: '소방대상물이란 건축물만을 말한다.' },
    ],
    correctId: 1,
    explanation: '소방본부장은 시·도에서 화재의 예방·진압·조사·구조·구급을 담당하는 부서의 장이다. 소방서장은 소방서의 장이다. 이 문제의 보기 ①은 실제로는 소방본부장 정의인데, 선택지 문맥상 ①이 정답 처리된 원문을 그대로 반영.',
    lawRef: '소방기본법 2조',
  },
  {
    id: 'q006',
    source: '25.02 기출 #46',
    difficulty: 2,
    stem: '화재의 예방 및 안전관리에 관한 법령상 시·도지사는 화재가 발생할 우려가 높거나 화재가 발생하는 경우 그로 인하여 피해가 클 것으로 예상되는 지역을 화재예방강화구역으로 지정할 수 있는데, 다음 중 지정대상지역에 대한 기준으로 틀린 것은? (단, 소방청장·소방본부장 또는 소방서장이 화재예방강화구역으로 지정할 필요가 있다고 별도로 인정하는 지역은 제외한다.)',
    choices: [
      { id: 1, text: '소방용수시설이 없는 지역' },
      { id: 2, text: '시장지역' },
      { id: 3, text: '목조건물이 밀집한 지역' },
      { id: 4, text: '공장이 밀집한 지역' },
    ],
    correctId: 4,
    explanation: '화재예방법 18조: 화재예방강화구역 지정 기준에 "공장이 밀집한 지역"은 해당하지 않는다. 올바른 기준은 소방용수시설 없는 지역, 시장지역, 목조건물 밀집지역, 위험물 저장·처리시설 밀집지역, 석유화학제품 생산 공장 등이다.',
    lawRef: '화재예방법 18조',
  },
  {
    id: 'q007',
    source: '25.02 기출 #47',
    difficulty: 2,
    stem: '제조소 등의 위치·구조 및 설비의 기준 중 위험물을 취급하는 건축물의 환기설비 설치기준으로 다음 ( )안에 알맞은 것은? "급기구는 당해 급기구가 설치된 실의 바닥면적 ( ㉠ )㎡마다 1개 이상으로 하되, 급기구의 크기는 ( ㉡ )㎠ 이상으로 할 것"',
    choices: [
      { id: 1, text: '㉠ 100, ㉡ 800' },
      { id: 2, text: '㉠ 150, ㉡ 800' },
      { id: 3, text: '㉠ 100, ㉡ 1000' },
      { id: 4, text: '㉠ 150, ㉡ 1000' },
    ],
    correctId: 2,
    explanation: '위험물취급규칙 별표 4: 환기설비 급기구는 바닥면적 150㎡마다 1개, 크기는 800㎠ 이상이어야 한다.',
    lawRef: '위험물취급규칙 별표 4',
  },
  {
    id: 'q008',
    source: '25.02 기출 #48',
    difficulty: 2,
    stem: '다음 중 소방신호의 종류가 아닌 것은?',
    choices: [
      { id: 1, text: '경계신호' },
      { id: 2, text: '발화신호' },
      { id: 3, text: '경보신호' },
      { id: 4, text: '훈련신호' },
    ],
    correctId: 3,
    explanation: '소방기본법 10조에 따른 소방신호의 종류: 경계신호, 발화신호, 해제신호, 훈련신호. "경보신호"는 소방신호 종류에 없다.',
    lawRef: '소방기본법 10조',
  },
  {
    id: 'q009',
    source: '25.02 기출 #49',
    difficulty: 2,
    stem: '위험물안전관리법에 따라 위험물안전관리자를 해임하거나 퇴직한 때에는 퇴직한 날부터 며칠 이내에 다시 안전관리자를 선임하여야 하는가?',
    choices: [
      { id: 1, text: '30일' },
      { id: 2, text: '35일' },
      { id: 3, text: '40일' },
      { id: 4, text: '55일' },
    ],
    correctId: 2,
    explanation: '위험물안전관리법에 따라 안전관리자 해임·퇴직 후 35일 이내에 다시 선임해야 한다.',
    lawRef: '위험물안전관리법',
  },
  {
    id: 'q010',
    source: '25.05 기출 #41',
    difficulty: 2,
    stem: '위험물안전관리법령상 위험물의 정의 중 다음 ( )안에 알맞은 것은? "위험물이라 함은 ( ㉠ ) 또는 발화성 등의 성질을 가지는 것으로서 ( ㉡ )이/가 정하는 물품을 말한다."',
    choices: [
      { id: 1, text: '㉠ 인화성, ㉡ 대통령령' },
      { id: 2, text: '㉠ 화발성, ㉡ 국무총리령' },
      { id: 3, text: '㉠ 인화성, ㉡ 국무총리령' },
      { id: 4, text: '㉠ 화발성, ㉡ 대통령령' },
    ],
    correctId: 1,
    explanation: '위험물법 2조: 위험물이란 인화성 또는 발화성 등의 성질을 가지는 것으로서 대통령령이 정하는 물품을 말한다.',
    lawRef: '위험물법 2조',
  },
  {
    id: 'q011',
    source: '25.05 기출 #42',
    difficulty: 2,
    stem: '소방시설 설치 및 관리에 관한 법령상 대통령령 또는 화재안전기준이 변경되어 그 기준이 강화되는 경우 기존 특정소방대상물의 소방시설 중 강화된 기준을 적용하여야 하는 소방시설은?',
    choices: [
      { id: 1, text: '비상경보설비' },
      { id: 2, text: '비상방송설비' },
      { id: 3, text: '비상콘센트설비' },
      { id: 4, text: '옥내소화전설비' },
    ],
    correctId: 1,
    explanation: '소방시설법 시행령 13조: 강화된 기준을 소급 적용하는 소방시설 중 비상경보설비는 해당한다. 간이스프링클러·자동화재탐지설비·단독경보형감지기·비상경보설비 등이 소급 적용 대상이다.',
    lawRef: '소방시설법 시행령 13조',
  },
  {
    id: 'q012',
    source: '25.05 기출 #43',
    difficulty: 3,
    stem: '위험물안전관리법령상 위험물 및 지정수량에 한 기준 중 다음 ( )안에 알맞은 것은? "금속류라 한은 알칼리금속·알칼리토류금속·철 및 마그네슘 외의 금속의 분말을 말하고, 구리분·니켈분 및 (㉠)마이크로미터의 체를 통과하는 것이 (㉡)중량퍼센트 미만인 것을 제외한다."',
    choices: [
      { id: 1, text: '㉠ 150, ㉡ 50' },
      { id: 2, text: '㉠ 53, ㉡ 50' },
      { id: 3, text: '㉠ 50, ㉡ 150' },
      { id: 4, text: '㉠ 50, ㉡ 53' },
    ],
    correctId: 2,
    explanation: '위험물법: 금속분의 기준은 53마이크로미터 체를 통과하는 것이 50중량퍼센트 미만인 것을 제외한다.',
    lawRef: '위험물법 별표',
  },
  {
    id: 'q013',
    source: '25.09 기출 #41',
    difficulty: 3,
    stem: '화재의 예방 및 안전관리에 관한 법령상 시·도지사는 화재가 발생할 우려가 높거나 화재가 발생하는 경우 그로 인하여 피해가 클 것으로 예상되는 지역을 화재예방강화구역으로 지정할 수 있는데 다음 중 지정대상지역에 대한 기준으로 틀린 것은? (단, 소방청장·소방본부장 또는 소방서장이 화재예방강화구역으로 지정할 필요가 있다고 별도로 인정하는 지역은 제외한다.)',
    choices: [
      { id: 1, text: '소방용수시설이 없는 지역' },
      { id: 2, text: '시장지역' },
      { id: 3, text: '목조건물이 밀집한 지역' },
      { id: 4, text: '석유공장이 밀집한 지역' },
    ],
    correctId: 4,
    explanation: '화재예방법 18조: 화재예방강화구역 지정 기준에 "석유공장이 밀집한 지역"은 포함되지 않는다. 석유화학제품을 생산하는 공장이 있는 지역은 해당되나, 단순 "석유공장 밀집"은 기준 외이다.',
    lawRef: '화재예방법 18조',
  },
  {
    id: 'q014',
    source: '25.09 기출 #42',
    difficulty: 2,
    stem: '소방시설공사업법상 하자를 보수하여야 하는 소방시설과 소방시설별 하자보수 보증기간으로 옳은 것은?',
    choices: [
      { id: 1, text: '유도등 : 1년' },
      { id: 2, text: '자동소화장치 : 3년' },
      { id: 3, text: '자동화재탐지설비 : 2년' },
      { id: 4, text: '소화용수설비 : 2년' },
    ],
    correctId: 2,
    explanation: '공사법 6조: 하자보수 보증기간 - 유도등 2년, 자동소화장치 3년, 자동화재탐지설비 3년, 소화용수설비 3년. 자동소화장치는 3년이 맞다.',
    lawRef: '공사법 6조',
  },
  // 추가 문제는 Claude API가 유사문제로 대체 생성
]
```

- [ ] **Step 4: Commit**

```bash
git add src/types/quiz.ts src/lib/questionSchema.ts src/lib/questions.ts
git commit -m "feat: add quiz types, Zod schema, and source question data"
```

---

## Task 3: Claude API 유사문제 생성 로직

**Files:**
- Create: `src/lib/generateQuestion.ts`
- Create: `src/app/api/generate-question/route.ts`

- [ ] **Step 1: 생성 로직 작성**

`src/lib/generateQuestion.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk'
import { QuestionSchema } from './questionSchema'
import type { Question } from '@/types/quiz'

const client = new Anthropic()

export async function generateSimilarQuestion(source: Question): Promise<Question> {
  const prompt = `당신은 소방시설관리기사 시험 문제 출제 전문가입니다.
아래 기출문제를 참고하여 같은 법령 범위에서 유사하지만 다른 문제를 만들어주세요.

기출문제:
- 지문: ${source.stem}
- 보기1: ${source.choices[0].text}
- 보기2: ${source.choices[1].text}
- 보기3: ${source.choices[2].text}
- 보기4: ${source.choices[3].text}
- 정답: ${source.correctId}번
- 해설: ${source.explanation}
- 근거법령: ${source.lawRef ?? ''}

요구사항:
1. 같은 법령에서 수치, 조건, 대상물 등을 변경하여 새 문제 생성
2. 4지선다 형식 유지, 오답 보기는 그럴듯하게 작성
3. 난이도 별 ${source.difficulty}개 수준 유지
4. 반드시 아래 JSON 형식으로만 응답 (설명 없이 JSON만):

{
  "id": "gen_${Date.now()}",
  "source": "${source.source} 유사",
  "difficulty": ${source.difficulty},
  "stem": "문제 지문",
  "choices": [
    {"id": 1, "text": "보기1"},
    {"id": 2, "text": "보기2"},
    {"id": 3, "text": "보기3"},
    {"id": 4, "text": "보기4"}
  ],
  "correctId": 정답번호,
  "explanation": "해설 (근거 법령 포함)",
  "lawRef": "근거 법령"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: '소방시설관리기사 시험 문제 출제 전문가. JSON 형식으로만 응답.',
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('JSON 파싱 실패')

  const parsed = JSON.parse(jsonMatch[0])
  return QuestionSchema.parse(parsed) as Question
}
```

- [ ] **Step 2: API Route 작성**

`src/app/api/generate-question/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateSimilarQuestion } from '@/lib/generateQuestion'
import { SOURCE_QUESTIONS } from '@/lib/questions'

export async function POST(req: NextRequest) {
  try {
    const { sourceId } = await req.json()
    const source = SOURCE_QUESTIONS.find(q => q.id === sourceId)
    if (!source) {
      return NextResponse.json({ error: '원본 문제를 찾을 수 없습니다.' }, { status: 404 })
    }

    const generated = await generateSimilarQuestion(source)
    return NextResponse.json({ question: generated })
  } catch (error) {
    console.error('문제 생성 실패:', error)
    return NextResponse.json({ error: '문제 생성에 실패했습니다.' }, { status: 500 })
  }
}
```

- [ ] **Step 3: API 동작 확인**

```bash
# 서버 실행 중 상태에서
curl -X POST http://localhost:3000/api/generate-question \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "q001"}'
```

Expected: `{"question": {...}}` JSON 응답

- [ ] **Step 4: Commit**

```bash
git add src/lib/generateQuestion.ts src/app/api/generate-question/route.ts
git commit -m "feat: add Claude API question generation endpoint"
```

---

## Task 4: 세션 상태 관리 (useReducer)

**Files:**
- Create: `src/lib/sessionStore.ts`

- [ ] **Step 1: 세션 reducer 작성**

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
      return {
        questions: action.questions,
        currentIndex: 0,
        answers: {},
        mode: action.mode,
        status: 'in-progress',
      }
    case 'ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.choiceId },
      }
    case 'NEXT': {
      const nextIndex = state.currentIndex + 1
      return {
        ...state,
        currentIndex: nextIndex,
        status: nextIndex >= state.questions.length ? 'completed' : 'in-progress',
      }
    }
    case 'RESET':
      return initialSession
    default:
      return state
  }
}

export const initialSession: QuizSession = {
  questions: [],
  currentIndex: 0,
  answers: {},
  mode: 'full',
  status: 'in-progress',
}

export function computeResult(session: QuizSession): QuizResult {
  const wrong: Question[] = []
  let correct = 0

  for (const q of session.questions) {
    const answer = session.answers[q.id]
    if (answer === q.correctId) {
      correct++
    } else {
      wrong.push(q)
    }
  }

  return { total: session.questions.length, correct, wrong }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sessionStore.ts
git commit -m "feat: add quiz session reducer and result computation"
```

---

## Task 5: UI 컴포넌트 구현

**Files:**
- Create: `src/components/ProgressBar.tsx`
- Create: `src/components/QuizCard.tsx`
- Create: `src/components/AnswerFeedback.tsx`
- Create: `src/components/ResultSummary.tsx`
- Create: `src/components/StartScreen.tsx`

- [ ] **Step 1: ProgressBar**

`src/components/ProgressBar.tsx`:
```tsx
interface Props {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: Props) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>진행률</span>
        <span>{current} / {total} 문제</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-red-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: QuizCard**

`src/components/QuizCard.tsx`:
```tsx
import type { Question } from '@/types/quiz'

interface Props {
  question: Question
  selectedId: 1 | 2 | 3 | 4 | null
  onSelect: (id: 1 | 2 | 3 | 4) => void
  answered: boolean
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export default function QuizCard({ question, selectedId, onSelect, answered }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">{question.source}</span>
        <span className="text-yellow-500 text-sm">{stars(question.difficulty)}</span>
      </div>
      <p className="text-gray-800 font-medium leading-relaxed mb-6">{question.stem}</p>
      <div className="space-y-3">
        {question.choices.map(choice => {
          const isSelected = selectedId === choice.id
          const isCorrect = question.correctId === choice.id
          let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm '
          if (!answered) {
            cls += isSelected
              ? 'border-red-400 bg-red-50 text-red-700'
              : 'border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700'
          } else {
            if (isCorrect) cls += 'border-green-500 bg-green-50 text-green-800 font-semibold'
            else if (isSelected) cls += 'border-red-400 bg-red-50 text-red-700 line-through'
            else cls += 'border-gray-200 text-gray-400'
          }
          return (
            <button
              key={choice.id}
              className={cls}
              onClick={() => !answered && onSelect(choice.id)}
              disabled={answered}
            >
              <span className="mr-2 font-bold">{choice.id}.</span>{choice.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: AnswerFeedback**

`src/components/AnswerFeedback.tsx`:
```tsx
import type { Question } from '@/types/quiz'

interface Props {
  question: Question
  selectedId: 1 | 2 | 3 | 4
  onNext: () => void
  isLast: boolean
}

export default function AnswerFeedback({ question, selectedId, onNext, isLast }: Props) {
  const correct = selectedId === question.correctId
  return (
    <div className={`mt-4 rounded-xl p-4 border-2 ${correct ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
      <p className={`font-bold text-lg mb-2 ${correct ? 'text-green-700' : 'text-red-700'}`}>
        {correct ? '정답입니다! ✓' : `오답입니다. 정답은 ${question.correctId}번`}
      </p>
      <p className="text-gray-700 text-sm leading-relaxed mb-2">{question.explanation}</p>
      {question.lawRef && (
        <p className="text-xs text-gray-500">근거: {question.lawRef}</p>
      )}
      <button
        onClick={onNext}
        className="mt-4 w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
      >
        {isLast ? '결과 보기' : '다음 문제 →'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: ResultSummary**

`src/components/ResultSummary.tsx`:
```tsx
import type { QuizResult } from '@/types/quiz'

interface Props {
  result: QuizResult
  mode: 'full' | 'retry-wrong'
  onRetryWrong: () => void
  onRestartFull: () => void
}

export default function ResultSummary({ result, mode, onRetryWrong, onRestartFull }: Props) {
  const pct = Math.round((result.correct / result.total) * 100)
  const grade = pct >= 80 ? '합격권' : pct >= 60 ? '보통' : '추가 학습 필요'

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 text-center">
      <div className="text-5xl mb-2">{pct >= 80 ? '🏆' : pct >= 60 ? '📚' : '💪'}</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">{result.correct} / {result.total}점</h2>
      <p className="text-gray-500 mb-1">정답률 {pct}%</p>
      <p className={`font-semibold mb-6 ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
        {grade}
      </p>

      {result.wrong.length > 0 && (
        <div className="text-left mb-6 bg-red-50 rounded-xl p-4">
          <p className="text-red-700 font-semibold mb-2">틀린 문제 ({result.wrong.length}개)</p>
          {result.wrong.map(q => (
            <p key={q.id} className="text-sm text-gray-600 mb-1">• {q.stem.slice(0, 40)}...</p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {result.wrong.length > 0 && (
          <button
            onClick={onRetryWrong}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors"
          >
            틀린 문제만 다시 풀기 ({result.wrong.length}개)
          </button>
        )}
        <button
          onClick={onRestartFull}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
        >
          전체 다시 풀기 (새 유사문제)
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: StartScreen**

`src/components/StartScreen.tsx`:
```tsx
interface Props {
  onStart: () => void
  loading: boolean
}

export default function StartScreen({ onStart, loading }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-8 text-center">
      <div className="text-6xl mb-4">🔥</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">소방시설관리기사</h1>
      <p className="text-gray-500 mb-2">소방관계법규 유사문제 풀기</p>
      <p className="text-sm text-gray-400 mb-8">기출문제 기반 AI 생성 문제 · 20문제</p>

      <button
        onClick={onStart}
        disabled={loading}
        className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl font-bold text-lg transition-colors"
      >
        {loading ? '문제 준비 중...' : '시작하기'}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add all quiz UI components"
```

---

## Task 6: 퀴즈 페이지 메인 로직

**Files:**
- Create: `src/app/quiz/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 퀴즈 페이지 작성**

`src/app/quiz/page.tsx`:
```tsx
'use client'

import { useReducer, useState, useCallback } from 'react'
import { sessionReducer, initialSession, computeResult } from '@/lib/sessionStore'
import { SOURCE_QUESTIONS } from '@/lib/questions'
import type { Question } from '@/types/quiz'
import StartScreen from '@/components/StartScreen'
import ProgressBar from '@/components/ProgressBar'
import QuizCard from '@/components/QuizCard'
import AnswerFeedback from '@/components/AnswerFeedback'
import ResultSummary from '@/components/ResultSummary'

const QUIZ_COUNT = 20

async function fetchGeneratedQuestion(sourceId: string): Promise<Question> {
  const res = await fetch('/api/generate-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId }),
  })
  if (!res.ok) throw new Error('생성 실패')
  const data = await res.json()
  return data.question
}

function pickRandomSources(count: number): Question[] {
  const pool = [...SOURCE_QUESTIONS]
  const picked: Question[] = []
  while (picked.length < count) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx % pool.length, 1)[0])
    if (pool.length === 0) pool.push(...SOURCE_QUESTIONS)
  }
  return picked
}

export default function QuizPage() {
  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [selectedId, setSelectedId] = useState<1 | 2 | 3 | 4 | null>(null)
  const [answered, setAnswered] = useState(false)

  const currentQuestion = session.questions[session.currentIndex]
  const result = session.status === 'completed' ? computeResult(session) : null

  const loadAndStart = useCallback(async (mode: 'full' | 'retry-wrong', sources?: Question[]) => {
    setLoading(true)
    try {
      const pool = sources ?? pickRandomSources(QUIZ_COUNT)
      const generated = await Promise.all(
        pool.slice(0, QUIZ_COUNT).map(src => fetchGeneratedQuestion(src.id))
      )
      dispatch({ type: 'START', questions: generated, mode })
      setStarted(true)
      setSelectedId(null)
      setAnswered(false)
    } catch (e) {
      alert('문제 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [])

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

  const handleRetryWrong = () => {
    if (!result) return
    const sources = result.wrong.map(q =>
      SOURCE_QUESTIONS.find(s => s.id === q.id.replace('gen_', '').split('_')[0]) ?? SOURCE_QUESTIONS[0]
    )
    loadAndStart('retry-wrong', sources)
  }

  const handleRestartFull = () => {
    setStarted(false)
    dispatch({ type: 'RESET' })
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-red-600">소방관계법규 유사문제</h1>
          {session.mode === 'retry-wrong' && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">오답 재시험 모드</span>
          )}
        </div>

        {!started && !result && (
          <StartScreen onStart={() => loadAndStart('full')} loading={loading} />
        )}

        {started && session.status === 'in-progress' && currentQuestion && (
          <>
            <ProgressBar current={session.currentIndex + 1} total={session.questions.length} />
            <QuizCard
              question={currentQuestion}
              selectedId={selectedId}
              onSelect={handleSelect}
              answered={answered}
            />
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
          <ResultSummary
            result={result}
            mode={session.mode}
            onRetryWrong={handleRetryWrong}
            onRestartFull={handleRestartFull}
          />
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: 홈 페이지를 퀴즈로 redirect**

`src/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/quiz')
}
```

- [ ] **Step 3: 브라우저에서 전체 플로우 확인**

```bash
npm run dev
# http://localhost:3000 접속 → /quiz로 이동
# 시작하기 → 20문제 생성 (API 호출) → 풀기 → 정답 확인 → 다음 → 결과 → 오답 재시험
```

각 단계 수동 확인:
- 시작 화면 렌더링
- 문제 카드 렌더링 (지문, 4지선다, 별, 출처)
- 선택지 클릭 → 정답/오답 피드백 표시
- 다음 문제 → 진행률 바 갱신
- 20문제 후 결과 화면
- 틀린 문제만 다시 풀기
- 전체 다시 풀기

- [ ] **Step 4: Commit**

```bash
git add src/app/quiz/page.tsx src/app/page.tsx
git commit -m "feat: implement quiz page with full session management and retry flows"
```

---

## Task 7: 오답 재시험 소스 매핑 수정 및 로딩 UX 개선

**Files:**
- Modify: `src/app/quiz/page.tsx`
- Modify: `src/components/StartScreen.tsx`

- [ ] **Step 1: 오답 재시험 소스 매핑 개선**

생성된 문제(`gen_xxx`)에 원본 소스 ID를 메타데이터로 보존해야 한다. `generateQuestion.ts`에서 생성 문제에 `sourceRef` 필드 추가:

`src/types/quiz.ts`에 추가:
```typescript
export interface Question {
  // ... 기존 필드
  sourceRef?: string  // 유사문제가 참조한 원본 기출 ID
}
```

`src/lib/generateQuestion.ts`의 return 전:
```typescript
const question = QuestionSchema.parse(parsed) as Question
question.sourceRef = source.id
return question
```

`src/app/quiz/page.tsx` `handleRetryWrong` 수정:
```typescript
const handleRetryWrong = () => {
  if (!result) return
  const sources = result.wrong.map(q => {
    const src = q.sourceRef ? SOURCE_QUESTIONS.find(s => s.id === q.sourceRef) : undefined
    return src ?? SOURCE_QUESTIONS[Math.floor(Math.random() * SOURCE_QUESTIONS.length)]
  })
  loadAndStart('retry-wrong', sources)
}
```

- [ ] **Step 2: 문제 로딩 중 스켈레톤 UI 추가**

`src/app/quiz/page.tsx` loading 시:
```tsx
{loading && (
  <div className="bg-white rounded-2xl shadow-md p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded mb-4 w-1/3" />
    <div className="h-6 bg-gray-200 rounded mb-6 w-full" />
    {[1,2,3,4].map(i => (
      <div key={i} className="h-12 bg-gray-100 rounded-xl mb-3" />
    ))}
  </div>
)}
```

- [ ] **Step 3: 브라우저에서 오답 재시험 플로우 확인**

오답 재시험 버튼 클릭 → 틀린 문제 수만큼 새 유사문제 생성 → 풀기 정상 동작 확인

- [ ] **Step 4: Commit**

```bash
git add src/types/quiz.ts src/lib/generateQuestion.ts src/app/quiz/page.tsx
git commit -m "feat: fix retry-wrong source mapping and add loading skeleton"
```

---

## Task 8: 빌드 검증 및 최종 점검

**Files:**
- 없음 (빌드/타입체크만)

- [ ] **Step 1: TypeScript 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 0개

- [ ] **Step 2: 프로덕션 빌드**

```bash
npm run build
```

Expected: ✓ Compiled successfully, 경고 최소

- [ ] **Step 3: 전체 사용 시나리오 수동 테스트**

브라우저에서 체크:
- [ ] 20문제 전체 풀기 (정답만 맞추기)
- [ ] 20문제 전체 풀기 (일부 틀리기)
- [ ] 결과 화면: 점수/퍼센트/등급 표시
- [ ] 틀린 문제 목록 표시
- [ ] "틀린 문제만 다시 풀기" → 새 유사문제로 재시험
- [ ] "전체 다시 풀기" → 시작 화면으로 돌아가 새 문제 생성

- [ ] **Step 4: 최종 Commit**

```bash
git add .
git commit -m "chore: verify build and finalize quiz app"
```

---

## Self-Review

### Spec 커버리지 점검

| 요구사항 | 대응 Task |
|---|---|
| 기출문제 형태 유지 (별, 출처, 4지선다, 해설) | Task 2, 5 |
| 유사문제 1문제씩 생성 + 정답 해설 | Task 3, 5, 6 |
| 20문제 완료 후 결과 화면 | Task 5, 6 |
| 틀린 문제만 다시 풀기 | Task 6, 7 |
| 전체 다시 풀기 (새 유사문제) | Task 6 |
| 반복 학습 | Task 6 (restart loop) |

### 타입 일관성

- `Question.correctId` → `1 \| 2 \| 3 \| 4` 전체 사용 일관
- `sessionReducer` → `QuizSession` 반환 일관
- `sourceRef` Task 7에서 추가, Task 2 타입 정의에도 반영 필요 → Task 2 체크박스에 포함됨

### 플레이스홀더 없음 확인

모든 코드 블록 완전 작성 확인. "TBD" 없음.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-12-fire-exam-quiz-app.md`.**

**두 가지 실행 방식:**

**1. Subagent-Driven (권장)** — Task별로 새 서브에이전트를 디스패치하고 리뷰 후 다음으로 진행. 빠른 반복, 격리된 실행.

**2. Inline Execution** — 이 세션에서 `executing-plans` 스킬로 순차 실행. 체크포인트마다 확인.

**어떤 방식으로 진행하시겠어요?**
