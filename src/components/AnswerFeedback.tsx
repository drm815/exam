import type { Question } from '@/types/quiz'

interface Props {
  question: Question
  selectedId: 1 | 2 | 3 | 4
  onNext: () => void
  isLast: boolean
  isLastInBlock?: boolean       // 과목 블록의 마지막 문제
  nextSubjectName?: string      // 다음 과목 이름
}

export default function AnswerFeedback({ question, selectedId, onNext, isLast, isLastInBlock, nextSubjectName }: Props) {
  const correct = selectedId === question.correctId
  const correctChoice = question.choices.find(c => c.id === question.correctId)

  const buttonLabel = () => {
    if (isLastInBlock && nextSubjectName) return `${nextSubjectName} 결과 보기`
    if (isLast) return '결과 보기'
    return '다음 문제 →'
  }

  return (
    <div className={`mt-4 rounded-xl p-4 border-2 ${correct ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
      <p className={`font-bold text-lg mb-2 ${correct ? 'text-green-700' : 'text-red-700'}`}>
        {correct ? '✓ 정답입니다!' : '✗ 오답입니다'}
      </p>

      {!correct && correctChoice && (
        <div className="mb-3 bg-green-50 border border-green-300 rounded-lg px-3 py-2">
          <span className="text-xs text-green-600 font-semibold">정답 </span>
          <span className="text-sm text-green-800 font-semibold">{question.correctId}번. {correctChoice.text}</span>
        </div>
      )}

      {question.explanation && (
        <div className="mb-3 bg-white rounded-lg px-3 py-2 border border-gray-200">
          <p className="text-xs text-gray-500 font-semibold mb-1">📋 해설</p>
          <p className="text-gray-700 text-sm leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {question.lawRef && (
        <p className="text-xs text-gray-400 mb-2">📌 {question.lawRef}</p>
      )}

      <button
        onClick={onNext}
        className="mt-2 w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
      >
        {buttonLabel()}
      </button>
    </div>
  )
}
