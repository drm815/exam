'use client'

import { useReducer, useState } from 'react'
import { sessionReducer, initialSession, computeResult } from '@/lib/sessionStore'
import { PDF_QUESTIONS } from '@/lib/pdfQuestions'
import type { Question, SubjectId } from '@/types/quiz'
import ProgressBar from '@/components/ProgressBar'
import QuizCard from '@/components/QuizCard'
import AnswerFeedback from '@/components/AnswerFeedback'
import ResultSummary from '@/components/ResultSummary'

const QUIZ_COUNT = 20

const SUBJECTS: { id: SubjectId; name: string; short: string }[] = [
  { id: 1, name: '소방원론', short: '원론' },
  { id: 2, name: '소방전기일반', short: '전기일반' },
  { id: 3, name: '소방관계법규', short: '법규' },
  { id: 4, name: '소방전기시설', short: '전기시설' },
]

// 사용 가능한 회차 목록 (데이터에서 추출) - format: "2024.03"
const ALL_SESSIONS = Array.from(new Set(PDF_QUESTIONS.map(q => q.source?.split(' ')[0] ?? ''))).filter(Boolean).sort().reverse()

function pickRandom(count: number, pool: Question[]): Question[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

type FilterMode = 'subject' | 'session'

export default function QuizPage() {
  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [started, setStarted] = useState(false)
  const [selectedId, setSelectedId] = useState<1 | 2 | 3 | 4 | null>(null)
  const [answered, setAnswered] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('subject')
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectId[]>([1, 2, 3, 4])
  const [selectedSessions, setSelectedSessions] = useState<string[]>([...ALL_SESSIONS])

  const currentQuestion = session.questions[session.currentIndex]
  const result = session.status === 'completed' ? computeResult(session) : null

  const getPool = (): Question[] => {
    if (filterMode === 'subject') {
      if (selectedSubjects.length === 0) return PDF_QUESTIONS
      return PDF_QUESTIONS.filter(q => q.subject && selectedSubjects.includes(q.subject as SubjectId))
    } else {
      if (selectedSessions.length === 0) return PDF_QUESTIONS
      return PDF_QUESTIONS.filter(q =>
        selectedSessions.some(s => q.source?.startsWith(s))
      )
    }
  }

  const startQuiz = (mode: 'full' | 'retry-wrong', questions: Question[]) => {
    dispatch({ type: 'START', questions, mode })
    setStarted(true)
    setSelectedId(null)
    setAnswered(false)
  }

  const handleStart = () => {
    const pool = getPool()
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

  const toggleSession = (sess: string) => {
    setSelectedSessions(prev =>
      prev.includes(sess) ? prev.filter(s => s !== sess) : [...prev, sess]
    )
  }

  const pool = getPool()
  const poolCount = pool.length

  // 회차 포맷: "2024.03" → "2024.03" (already in YYYY.MM format)
  const formatSession = (s: string) => s

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* 헤더 */}
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
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🔥</div>
              <p className="text-gray-500 text-sm">총 {PDF_QUESTIONS.length}문제</p>
            </div>

            {/* 필터 모드 탭 */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-4">
              {(['subject', 'session'] as FilterMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    filterMode === mode
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {mode === 'subject' ? '📚 과목별' : '📅 회차별'}
                </button>
              ))}
            </div>

            {/* 과목 선택 */}
            {filterMode === 'subject' && (
              <div className="mb-5">
                <div className="grid grid-cols-2 gap-2">
                  {SUBJECTS.map(subj => {
                    const count = PDF_QUESTIONS.filter(q => q.subject === subj.id).length
                    const on = selectedSubjects.includes(subj.id)
                    return (
                      <button
                        key={subj.id}
                        onClick={() => toggleSubject(subj.id)}
                        className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          on
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-gray-50 text-gray-400'
                        }`}
                      >
                        {subj.name}
                        <span className="ml-1 text-xs opacity-60">({count})</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 회차 선택 */}
            {filterMode === 'session' && (
              <div className="mb-5">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-gray-500">시험 회차 선택</span>
                  <button
                    onClick={() => setSelectedSessions(ALL_SESSIONS.length === selectedSessions.length ? [] : [...ALL_SESSIONS])}
                    className="text-xs text-red-500 hover:underline"
                  >
                    {ALL_SESSIONS.length === selectedSessions.length ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 max-h-52 overflow-y-auto pr-1">
                  {ALL_SESSIONS.map(sess => {
                    const count = PDF_QUESTIONS.filter(q => q.source?.startsWith(formatSession(sess))).length
                    const on = selectedSessions.includes(sess)
                    return (
                      <button
                        key={sess}
                        onClick={() => toggleSession(sess)}
                        className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                          on
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-gray-50 text-gray-400'
                        }`}
                      >
                        <div>{formatSession(sess)}</div>
                        <div className="opacity-60">({count})</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-center text-gray-400 mb-4">
              선택된 문제 {poolCount}개 중 {Math.min(QUIZ_COUNT, poolCount)}문제 랜덤 출제
            </p>

            <button
              onClick={handleStart}
              disabled={poolCount < 1}
              className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-xl font-bold text-lg transition-colors"
            >
              {poolCount < 1 ? '선택된 문제가 없습니다' : `시작하기`}
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
