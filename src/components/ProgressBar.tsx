interface Props {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: Props) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>진행률</span>
        <span>{current} / {total} 문제</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-red-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
