import Anthropic from '@anthropic-ai/sdk'
import { QuestionSchema } from './questionSchema'
import type { Question } from '@/types/quiz'

const client = new Anthropic()

export async function generateSimilarQuestion(source: Question): Promise<Question> {
  const prompt = `당신은 소방시설관리기사 시험 문제 출제 전문가입니다.
아래 기출문제를 참고하여 같은 법령 범위에서 유사하지만 다른 문제를 만들어주세요.

기출문제:
- 지문: ${source.stem}
- 보기1: ${source.choices[0].text}
- 보기2: ${source.choices[1].text}
- 보기3: ${source.choices[2].text}
- 보기4: ${source.choices[3].text}
- 정답: ${source.correctId}번
- 해설: ${source.explanation}
- 근거법령: ${source.lawRef ?? ''}

요구사항:
1. 같은 법령에서 수치, 조건, 대상물 등을 변경하여 새 문제 생성
2. 4지선다 형식 유지, 오답 보기는 그럴듯하게 작성
3. 난이도 ${source.difficulty} 수준 유지
4. 반드시 아래 JSON 형식으로만 응답 (설명 없이 JSON만):

{
  "id": "placeholder_id",
  "source": "${source.source} 유사",
  "difficulty": ${source.difficulty},
  "stem": "문제 지문",
  "choices": [
    {"id": 1, "text": "보기1"},
    {"id": 2, "text": "보기2"},
    {"id": 3, "text": "보기3"},
    {"id": 4, "text": "보기4"}
  ],
  "correctId": 정답번호,
  "explanation": "해설 (근거 법령 포함)",
  "lawRef": "근거 법령"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: '소방시설관리기사 시험 문제 출제 전문가. JSON 형식으로만 응답.',
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('JSON 파싱 실패')

  const parsed = JSON.parse(jsonMatch[0])
  parsed.id = `gen_${source.id}_${Date.now()}`
  const question = QuestionSchema.parse(parsed) as Question
  question.sourceRef = source.id
  return question
}
