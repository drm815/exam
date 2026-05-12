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
