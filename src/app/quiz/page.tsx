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
  const [loadingCount, setLoadingCount] = useState(0)
  const [started, setStarted] = useState(false)
  const [selectedId, setSelectedId] = useState<1 | 2 | 3 | 4 | null>(null)
  const [answered, setAnswered] = useState(false)

  const currentQuestion = session.questions[session.currentIndex]
  const result = session.status === 'completed' ? computeResult(session) : null

  const loadAndStart = useCallback(async (mode: 'full' | 'retry-wrong', sources?: Question[]) => {
    setLoading(true)
    setLoadingCount(0)
    try {
      const pool = sources ?? pickRandomSources(QUIZ_COUNT)
      const generated: Question[] = []
      for (const src of pool.slice(0, QUIZ_COUNT)) {
        generated.push(await fetchGeneratedQuestion(src.id))
        setLoadingCount(generated.length)
      }
      dispatch({ type: 'START', questions: generated, mode })
      setStarted(true)
      setSelectedId(null)
      setAnswered(false)
    } catch (err) {
      console.error('[QuizPage] 문제 생성 오류:', err)
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
    const sources = result.wrong.map(q => {
      const src = q.sourceRef ? SOURCE_QUESTIONS.find(s => s.id === q.sourceRef) : undefined
      return src ?? SOURCE_QUESTIONS[Math.floor(Math.random() * SOURCE_QUESTIONS.length)]
    })
    loadAndStart('retry-wrong', sources)
  }

  const handleRestartFull = () => {
    loadAndStart('full')
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

        {loading && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-center text-gray-500 text-sm mb-4">
              문제 생성 중... {loadingCount} / {QUIZ_COUNT}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div
                className="bg-red-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(loadingCount / QUIZ_COUNT) * 100}%` }}
              />
            </div>
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {!loading && !started && session.status !== 'completed' && (
          <StartScreen onStart={() => loadAndStart('full')} loading={loading} />
        )}

        {!loading && started && session.status === 'in-progress' && currentQuestion && (
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

        {!loading && session.status === 'completed' && result && (
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
