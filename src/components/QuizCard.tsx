import type { Question } from '@/types/quiz'

interface Props {
  question: Question
  selectedId: 1 | 2 | 3 | 4 | null
  onSelect: (id: 1 | 2 | 3 | 4) => void
  answered: boolean
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export default function QuizCard({ question, selectedId, onSelect, answered }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">{question.source}</span>
        <span className="text-yellow-500 text-sm">{stars(question.difficulty)}</span>
      </div>
      <p className="text-gray-800 font-medium leading-relaxed mb-6">{question.stem}</p>
      <div className="space-y-3">
        {question.choices.map(choice => {
          const isSelected = selectedId === choice.id
          const isCorrect = question.correctId === choice.id
          let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm '
          if (!answered) {
            cls += isSelected
              ? 'border-red-400 bg-red-50 text-red-700'
              : 'border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700'
          } else {
            if (isCorrect) cls += 'border-green-500 bg-green-50 text-green-800 font-semibold'
            else if (isSelected) cls += 'border-red-400 bg-red-50 text-red-700 line-through'
            else cls += 'border-gray-200 text-gray-400'
          }
          return (
            <button
              key={choice.id}
              className={cls}
              onClick={() => !answered && onSelect(choice.id)}
              disabled={answered}
            >
              <span className="mr-2 font-bold">{choice.id}.</span>{choice.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
