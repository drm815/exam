import type { QuizResult } from '@/types/quiz'

interface SubjectResult {
  name: string
  correct: number
  total: number
}

interface Props {
  result: QuizResult
  mode: 'full' | 'retry-wrong'
  subjectResults?: SubjectResult[]
  onRetryWrong: () => void
  onRestartFull: () => void
}

export default function ResultSummary({ result, mode, subjectResults, onRetryWrong, onRestartFull }: Props) {
  const pct = Math.round((result.correct / result.total) * 100)
  const grade = pct >= 80 ? '합격권' : pct >= 60 ? '보통' : '추가 학습 필요'

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 text-center">
      <div className="text-5xl mb-2">{pct >= 80 ? '🏆' : pct >= 60 ? '📚' : '💪'}</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">{result.correct} / {result.total}점</h2>
      <p className="text-gray-500 mb-1">정답률 {pct}%</p>
      <p className={`font-semibold mb-4 ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
        {grade}
      </p>

      {/* 과목별 결과 */}
      {subjectResults && subjectResults.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
          <p className="text-sm font-semibold text-gray-600 mb-2">과목별 결과</p>
          {subjectResults.map((r, i) => {
            const spct = Math.round((r.correct / r.total) * 100)
            return (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{r.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${spct >= 80 ? 'bg-green-400' : spct >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${spct}%` }}
                    />
                  </div>
                  <span className={`text-sm font-semibold w-12 text-right ${spct >= 80 ? 'text-green-600' : spct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {r.correct}/{r.total}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {result.wrong.length > 0 && (
        <div className="text-left mb-5 bg-red-50 rounded-xl p-4">
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
          {mode === 'retry-wrong' ? '처음으로 돌아가기' : '전체 다시 풀기 (새 유사문제)'}
        </button>
      </div>
    </div>
  )
}
