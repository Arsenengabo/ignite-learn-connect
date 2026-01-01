import { z } from 'zod';

// Competition validation schema
export const CompetitionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(5000, "Description must be less than 5000 characters").optional().default(""),
  subject: z.string().max(100, "Subject must be less than 100 characters").optional().default(""),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  maxParticipants: z.number().int().min(1, "Must have at least 1 participant").max(100000, "Too many participants"),
  entryFee: z.number().min(0, "Entry fee cannot be negative").max(1000000, "Entry fee too high"),
  prizePool: z.number().min(0, "Prize pool cannot be negative").max(10000000, "Prize pool too high"),
  status: z.enum(["upcoming", "active", "completed"]).default("upcoming"),
});

export type CompetitionInput = z.infer<typeof CompetitionSchema>;

// Chat message validation schema
export const ChatMessageSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(10000, "Message must be less than 10,000 characters"),
  channelId: z.string().uuid("Invalid channel ID"),
  senderId: z.string().uuid("Invalid sender ID"),
});

export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;

// Course validation schema
export const CourseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(10000, "Description must be less than 10,000 characters").optional().default(""),
  subject: z.string().max(100, "Subject must be less than 100 characters").optional().default(""),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Please select a difficulty level" })
  }),
  durationWeeks: z.number().int().min(1, "Duration must be at least 1 week").max(52, "Duration must be less than 52 weeks"),
  price: z.number().min(0, "Price cannot be negative").max(100000, "Price too high"),
  isPublished: z.boolean().default(false),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
});

export type CourseInput = z.infer<typeof CourseSchema>;

// Course module validation schema
export const CourseModuleSchema = z.object({
  title: z.string().trim().min(1, "Module title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(5000, "Description must be less than 5,000 characters").optional().default(""),
  contentType: z.enum(["video", "document", "text"]),
  contentUrl: z.string().max(5000).optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  isPublished: z.boolean().default(false),
});

export type CourseModuleInput = z.infer<typeof CourseModuleSchema>;

// Quiz validation schema
export const QuizSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(5000, "Description must be less than 5,000 characters").optional().default(""),
  subject: z.string().max(100, "Subject must be less than 100 characters").optional().default(""),
  difficultyLevel: z.string().max(50).optional().default(""),
  timeLimit: z.number().int().min(1, "Time limit must be at least 1 minute").max(480, "Time limit must be less than 8 hours"),
  isPublished: z.boolean().default(false),
});

export type QuizInput = z.infer<typeof QuizSchema>;

// Quiz question validation schema
export const QuizQuestionSchema = z.object({
  questionText: z.string().trim().min(1, "Question is required").max(5000, "Question must be less than 5,000 characters"),
  questionType: z.enum(["multiple_choice", "open_ended"]),
  options: z.array(z.string().max(1000)).max(10).optional(),
  correctAnswer: z.string().max(5000, "Answer must be less than 5,000 characters"),
  explanation: z.string().max(5000, "Explanation must be less than 5,000 characters").optional().default(""),
  points: z.number().int().min(1, "Points must be at least 1").max(1000, "Points too high"),
});

export type QuizQuestionInput = z.infer<typeof QuizQuestionSchema>;

// Helper function to get first validation error message
export function getValidationError(error: z.ZodError): string {
  const firstError = error.errors[0];
  return firstError?.message || "Validation error";
}
