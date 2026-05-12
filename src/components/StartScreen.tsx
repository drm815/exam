interface Props {
  onStart: () => void
  loading: boolean
}

export default function StartScreen({ onStart, loading }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-8 text-center">
      <div className="text-6xl mb-4">🔥</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">소방시설관리기사</h1>
      <p className="text-gray-500 mb-2">소방관계법규 유사문제 풀기</p>
      <p className="text-sm text-gray-400 mb-8">기출문제 기반 AI 생성 문제 · 20문제</p>

      <button
        onClick={onStart}
        disabled={loading}
        className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl font-bold text-lg transition-colors"
      >
        {loading ? '문제 준비 중...' : '시작하기'}
      </button>
    </div>
  )
}
