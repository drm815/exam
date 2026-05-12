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

  const handleStart = () => {
    startQuiz('full', pickRandom(QUIZ_COUNT, SOURCE_QUESTIONS))
  }

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
    startQuiz('retry-wrong', result.wrong)
  }

  const handleRestartFull = () => {
    startQuiz('full', pickRandom(QUIZ_COUNT, SOURCE_QUESTIONS))
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
