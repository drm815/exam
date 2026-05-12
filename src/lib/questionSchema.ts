import { z } from 'zod'

export const ChoiceSchema = z.object({
  id: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string().min(1),
})

export const QuestionSchema = z.object({
  id: z.string(),
  source: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stem: z.string().min(10),
  choices: z.array(ChoiceSchema).length(4),
  correctId: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  explanation: z.string().min(10),
  lawRef: z.string().optional(),
  hasTable: z.boolean().optional(),
  sourceRef: z.string().optional(),
})

export type QuestionInput = z.infer<typeof QuestionSchema>
