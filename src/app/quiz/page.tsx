'use client'

import { useReducer, useState } from 'react'
import { sessionReducer, initialSession, computeResult } from '@/lib/sessionStore'
import { PDF_QUESTIONS } from '@/lib/pdfQuestions'
import type { Question, SubjectId } from '@/types/quiz'
import ProgressBar from '@/components/ProgressBar'
import QuizCard from '@/components/QuizCard'
import AnswerFeedback from '@/components/AnswerFeedback'
import ResultSummary from '@/components/ResultSummary'

const QUIZ_COUNT = 10

const SUBJECTS: { id: SubjectId; name: string; color: string }[] = [
  { id: 1, name: '소방원론', color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 2, name: '소방전기일반', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 3, name: '소방관계법규', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 4, name: '소방전기시설', color: 'bg-purple-100 text-purple-700 border-purple-300' },
]

function pickRandom(count: number, pool: Question[]): Question[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export default function QuizPage() {
  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [started, setStarted] = useState(false)
  const [selectedId, setSelectedId] = useState<1 | 2 | 3 | 4 | null>(null)
  const [answered, setAnswered] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectId[]>([1, 2, 3, 4])

  const currentQuestion = session.questions[session.currentIndex]
  const result = session.status === 'completed' ? computeResult(session) : null

  const getPool = (subjects: SubjectId[]) => {
    if (subjects.length === 0) return PDF_QUESTIONS
    return PDF_QUESTIONS.filter(q => q.subject && subjects.includes(q.subject as SubjectId))
  }

  const startQuiz = (mode: 'full' | 'retry-wrong', questions: Question[]) => {
    dispatch({ type: 'START', questions, mode })
    setStarted(true)
    setSelectedId(null)
    setAnswered(false)
  }

  const handleStart = () => {
    const pool = getPool(selectedSubjects)
    startQuiz('full', pickRandom(QUIZ_COUNT, pool))
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
    setStarted(false)
    dispatch({ type: 'RESET' })
  }

  const toggleSubject = (id: SubjectId) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const poolCount = getPool(selectedSubjects).length

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-red-600">소방설비기사</h1>
          <p className="text-sm text-gray-500 mt-1">전기분야 기출문제 (2019~2025)</p>
          {session.mode === 'retry-wrong' && started && (
            <span className="inline-block mt-2 text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">오답 재시험 모드</span>
          )}
        </div>

        {/* 시작 화면 */}
        {!started && session.status !== 'completed' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🔥</div>
              <p className="text-gray-600 text-sm">총 {PDF_QUESTIONS.length}문제 | 랜덤 {QUIZ_COUNT}문제 출제</p>
            </div>

            {/* 과목 선택 */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">📚 과목 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {SUBJECTS.map(subj => {
                  const count = PDF_QUESTIONS.filter(q => q.subject === subj.id).length
                  const selected = selectedSubjects.includes(subj.id)
                  return (
                    <button
                      key={subj.id}
                      onClick={() => toggleSubject(subj.id)}
                      className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        selected
                          ? subj.color
                          : 'bg-gray-50 text-gray-400 border-gray-200'
                      }`}
                    >
                      <span>{subj.name}</span>
                      <span className="ml-1 text-xs opacity-70">({count})</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                선택된 문제 풀: {poolCount}개
              </p>
            </div>

            <button
              onClick={handleStart}
              disabled={poolCount < 1 || selectedSubjects.length === 0}
              className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl font-bold text-lg transition-colors"
            >
              {selectedSubjects.length === 0 ? '과목을 선택해주세요' : `시작하기 (${Math.min(QUIZ_COUNT, poolCount)}문제)`}
            </button>
          </div>
        )}

        {/* 퀴즈 진행 */}
        {started && session.status === 'in-progress' && currentQuestion && (
          <>
            <ProgressBar current={session.currentIndex + 1} total={session.questions.length} />
            {currentQuestion.subjectName && (
              <p className="text-xs text-center text-gray-400 mb-2">{currentQuestion.subjectName}</p>
            )}
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

        {/* 결과 화면 */}
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
