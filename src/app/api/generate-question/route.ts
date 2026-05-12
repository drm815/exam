import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { generateSimilarQuestion } from '@/lib/generateQuestion'
import { SOURCE_QUESTIONS } from '@/lib/questions'

export async function POST(req: NextRequest) {
  try {
    const { sourceId } = await req.json()
    const source = SOURCE_QUESTIONS.find(q => q.id === sourceId)
    if (!source) {
      return NextResponse.json({ error: '원본 문제를 찾을 수 없습니다.' }, { status: 404 })
    }

    const generated = await generateSimilarQuestion(source)
    return NextResponse.json({ question: generated })
  } catch (error) {
    console.error('문제 생성 실패:', error)
    return NextResponse.json({ error: '문제 생성에 실패했습니다.' }, { status: 500 })
  }
}
