import type { QuizResult } from '@/types/quiz'

interface Props {
  result: QuizResult
  mode: 'full' | 'retry-wrong'
  onRetryWrong: () => void
  onRestartFull: () => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
