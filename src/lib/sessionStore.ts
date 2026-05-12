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
