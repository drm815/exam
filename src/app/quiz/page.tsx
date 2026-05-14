'use client'

import { useReducer, useState } from 'react'
import { sessionReducer, initialSession, computeResult } from '@/lib/sessionStore'
import { PDF_QUESTIONS } from '@/lib/pdfQuestions'
import type { Question, SubjectId } from '@/types/quiz'
import ProgressBar from '@/components/ProgressBar'
import QuizCard from '@/components/QuizCard'
import AnswerFeedback from '@/components/AnswerFeedback'
import ResultSummary from '@/components/ResultSummary'

const QUIZ_COUNT_PER_SUBJECT = 20

const SUBJECTS: { id: SubjectId; name: string; short: string }[] = [
  { id: 1, name: '소방원론', short: '원론' },
  { id: 2, name: '소방전기일반', short: '전기일반' },
  { id: 3, name: '소방관계법규', short: '법규' },
  { id: 4, name: '소방전기시설', short: '전기시설' },
]

const ALL_SESSIONS = Array.from(
  new Set(PDF_QUESTIONS.map(q => q.source?.split(' ')[0] ?? ''))
).filter(Boolean).sort().reverse()

const STAR_QUESTIONS = PDF_QUESTIONS.filter(q => q.difficulty === 3)

function pickRandom(count: number, pool: Question[]): Question[] {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}

type FilterMode = 'subject' | 'session' | 'star'

// 과목별 순서 진행 시 각 과목의 문제 묶음
interface SubjectBlock {
  subjectId: SubjectId
  subjectName: string
  questions: Question[]
}

export default function QuizPage() {
  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [started, setStarted] = useState(false)
  const [selectedId, setSelectedId] = useState<1 | 2 | 3 | 4 | null>(null)
  const [answered, setAnswered] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('subject')
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectId[]>([1, 2, 3, 4])
  const [selectedSessions, setSelectedSessions] = useState<string[]>([...ALL_SESSIONS])

  // 과목별 순서 모드
  const [subjectBlocks, setSubjectBlocks] = useState<SubjectBlock[]>([])
  const [currentBlockIdx, setCurrentBlockIdx] = useState(0)
  const [blockResults, setBlockResults] = useState<{ name: string; correct: number; total: number }[]>([])
  const [showBlockResult, setShowBlockResult] = useState(false)

  const isSubjectOrderMode = filterMode === 'subject' && selectedSubjects.length > 1

  const currentQuestion = session.questions[session.currentIndex]
  const result = session.status === 'completed' ? computeResult(session) : null

  const getPool = (): Question[] => {
    if (filterMode === 'subject') {
      const subjects = selectedSubjects.length > 0 ? selectedSubjects : [1, 2, 3, 4] as SubjectId[]
      return PDF_QUESTIONS.filter(q => q.subject && subjects.includes(q.subject as SubjectId))
    } else if (filterMode === 'session') {
      if (selectedSessions.length === 0) return PDF_QUESTIONS
      return PDF_QUESTIONS.filter(q => selectedSessions.some(s => q.source?.startsWith(s)))
    } else {
      return STAR_QUESTIONS
    }
  }

  const startQuiz = (questions: Question[]) => {
    dispatch({ type: 'START', questions, mode: 'full' })
    setStarted(true)
    setSelectedId(null)
    setAnswered(false)
  }

  const startRetryWrong = (wrong: Question[]) => {
    dispatch({ type: 'START', questions: wrong, mode: 'retry-wrong' })
    setStarted(true)
    setSelectedId(null)
    setAnswered(false)
  }

  const handleStart = () => {
    if (filterMode === 'subject' && selectedSubjects.length > 1) {
      // 과목별 순서 모드: 블록 구성
      const orderedSubjects = ([1, 2, 3, 4] as SubjectId[]).filter(id => selectedSubjects.includes(id))
      const blocks: SubjectBlock[] = orderedSubjects.map(id => {
        const subj = SUBJECTS.find(s => s.id === id)!
        const pool = PDF_QUESTIONS.filter(q => q.subject === id)
        return {
          subjectId: id,
          subjectName: subj.name,
          questions: pickRandom(QUIZ_COUNT_PER_SUBJECT, pool),
        }
      })
      setSubjectBlocks(blocks)
      setCurrentBlockIdx(0)
      setBlockResults([])
      setShowBlockResult(false)
      startQuiz(blocks[0].questions)
    } else if (filterMode === 'subject' && selectedSubjects.length === 1) {
      const pool = PDF_QUESTIONS.filter(q => q.subject === selectedSubjects[0])
      startQuiz(pickRandom(QUIZ_COUNT_PER_SUBJECT, pool))
    } else if (filterMode === 'session') {
      const pool = getPool()
      startQuiz(pickRandom(QUIZ_COUNT_PER_SUBJECT * 4, pool))
    } else {
      // star mode
      startQuiz(pickRandom(QUIZ_COUNT_PER_SUBJECT * 4, STAR_QUESTIONS))
    }
  }

  const handleSelect = (id: 1 | 2 | 3 | 4) => {
    if (answered) return
    setSelectedId(id)
    dispatch({ type: 'ANSWER', questionId: currentQuestion.id, choiceId: id })
    setAnswered(true)
  }

  const handleNext = () => {
    const isLastInBlock = session.currentIndex === session.questions.length - 1

    if (isSubjectOrderMode && isLastInBlock) {
      // 현재 블록 끝 → 소결과 표시
      const blockResult = computeResult({
        ...session,
        answers: {
          ...session.answers,
          [currentQuestion.id]: selectedId!,
        },
      })
      setBlockResults(prev => [...prev, {
        name: subjectBlocks[currentBlockIdx].subjectName,
        correct: blockResult.correct,
        total: blockResult.total,
      }])
      setShowBlockResult(true)
      dispatch({ type: 'NEXT' })
      setSelectedId(null)
      setAnswered(false)
    } else {
      dispatch({ type: 'NEXT' })
      setSelectedId(null)
      setAnswered(false)
    }
  }

  const handleNextSubject = () => {
    const nextIdx = currentBlockIdx + 1
    if (nextIdx < subjectBlocks.length) {
      setCurrentBlockIdx(nextIdx)
      setShowBlockResult(false)
      startQuiz(subjectBlocks[nextIdx].questions)
    } else {
      // 모든 과목 완료 → 최종 결과
      setShowBlockResult(false)
    }
  }

  const handleRetryWrong = () => {
    if (!result) return
    setSubjectBlocks([])
    setBlockResults([])
    startRetryWrong(result.wrong)
  }

  const handleRestartFull = () => {
    setStarted(false)
    setSubjectBlocks([])
    setBlockResults([])
    setShowBlockResult(false)
    setCurrentBlockIdx(0)
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

  // 과목별 순서 모드에서 소결과 화면
  const isAllBlocksDone = subjectBlocks.length > 0 &&
    currentBlockIdx >= subjectBlocks.length - 1 &&
    session.status === 'completed'

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
              {(['subject', 'session', 'star'] as FilterMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    filterMode === mode
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {mode === 'subject' ? '📚 과목별' : mode === 'session' ? '📅 회차별' : '⭐ 중요문제'}
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
                {selectedSubjects.length > 1 && (
                  <p className="text-xs text-center text-blue-500 mt-2">
                    📌 과목별 순서로 각 20문제씩 출제됩니다
                  </p>
                )}
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
                    const count = PDF_QUESTIONS.filter(q => q.source?.startsWith(sess)).length
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
                        <div>{sess}</div>
                        <div className="opacity-60">({count})</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 중요문제(별표3개) 안내 */}
            {filterMode === 'star' && (
              <div className="mb-5 text-center">
                {STAR_QUESTIONS.length > 0 ? (
                  <>
                    <p className="text-4xl mb-2">⭐⭐⭐</p>
                    <p className="text-gray-700 font-semibold">중요문제 {STAR_QUESTIONS.length}개</p>
                    <p className="text-gray-400 text-sm mt-1">별표 3개 표시된 고빈도 출제 문제</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl mb-2">⭐</p>
                    <p className="text-gray-500 text-sm">중요문제 데이터 준비 중입니다</p>
                    <p className="text-gray-400 text-xs mt-1">곧 업데이트될 예정입니다</p>
                  </>
                )}
              </div>
            )}

            <p className="text-xs text-center text-gray-400 mb-4">
              {filterMode === 'subject' && selectedSubjects.length > 1
                ? `과목별 각 ${QUIZ_COUNT_PER_SUBJECT}문제 × ${selectedSubjects.length}과목 = 총 ${selectedSubjects.length * QUIZ_COUNT_PER_SUBJECT}문제`
                : filterMode === 'subject' && selectedSubjects.length === 1
                ? `선택 과목 ${QUIZ_COUNT_PER_SUBJECT}문제 랜덤 출제`
                : filterMode === 'star'
                ? STAR_QUESTIONS.length > 0 ? `${Math.min(QUIZ_COUNT_PER_SUBJECT * 4, STAR_QUESTIONS.length)}문제 출제` : '준비 중'
                : `선택된 문제 ${poolCount}개 중 ${Math.min(QUIZ_COUNT_PER_SUBJECT * 4, poolCount)}문제 랜덤 출제`}
            </p>

            <button
              onClick={handleStart}
              disabled={poolCount < 1 || (filterMode === 'star' && STAR_QUESTIONS.length === 0)}
              className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-xl font-bold text-lg transition-colors"
            >
              {filterMode === 'star' && STAR_QUESTIONS.length === 0
                ? '준비 중'
                : poolCount < 1
                ? '선택된 문제가 없습니다'
                : '시작하기'}
            </button>
          </div>
        )}

        {/* 과목별 소결과 화면 */}
        {started && showBlockResult && isSubjectOrderMode && (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <div className="text-4xl mb-3">
              {blockResults[blockResults.length - 1]?.correct / QUIZ_COUNT_PER_SUBJECT >= 0.8 ? '🎉' : '📚'}
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-1">
              {blockResults[blockResults.length - 1]?.name} 완료
            </h2>
            <p className="text-3xl font-bold text-red-600 mb-1">
              {blockResults[blockResults.length - 1]?.correct} / {QUIZ_COUNT_PER_SUBJECT}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              정답률 {Math.round((blockResults[blockResults.length - 1]?.correct / QUIZ_COUNT_PER_SUBJECT) * 100)}%
            </p>

            {/* 지금까지 결과 */}
            {blockResults.length > 1 && (
              <div className="bg-gray-50 rounded-xl p-3 mb-5 text-left">
                {blockResults.map((r, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{r.name}</span>
                    <span className={`font-semibold ${r.correct / r.total >= 0.8 ? 'text-green-600' : r.correct / r.total >= 0.6 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {r.correct}/{r.total}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isAllBlocksDone ? (
              // 모든 과목 완료 → 최종 결과로
              <button
                onClick={() => setShowBlockResult(false)}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
              >
                최종 결과 보기
              </button>
            ) : (
              <button
                onClick={handleNextSubject}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
              >
                다음 과목: {subjectBlocks[currentBlockIdx + 1]?.subjectName} →
              </button>
            )}
          </div>
        )}

        {/* 퀴즈 진행 */}
        {started && !showBlockResult && session.status === 'in-progress' && currentQuestion && (
          <>
            {/* 과목별 순서 모드: 현재 과목 표시 */}
            {isSubjectOrderMode && subjectBlocks.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-red-600">
                  {subjectBlocks[currentBlockIdx]?.subjectName}
                </span>
                <span className="text-xs text-gray-400">
                  {currentBlockIdx + 1}/{subjectBlocks.length} 과목
                </span>
              </div>
            )}
            <ProgressBar current={session.currentIndex + 1} total={session.questions.length} />
            {!isSubjectOrderMode && currentQuestion.subjectName && (
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
                isLastInBlock={isSubjectOrderMode && session.currentIndex === session.questions.length - 1 && !isAllBlocksDone}
                nextSubjectName={isSubjectOrderMode && !isAllBlocksDone ? subjectBlocks[currentBlockIdx + 1]?.subjectName : undefined}
              />
            )}
          </>
        )}

        {/* 결과 화면 (비과목순서 모드 또는 전체 완료) */}
        {!showBlockResult && session.status === 'completed' && result && (
          <ResultSummary
            result={result}
            mode={session.mode}
            subjectResults={isSubjectOrderMode ? blockResults : undefined}
            onRetryWrong={handleRetryWrong}
            onRestartFull={handleRestartFull}
          />
        )}
      </div>
    </main>
  )
}
