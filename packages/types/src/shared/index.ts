// All domain types are currently shared (both apps/api and apps/web consume them).
// Slice 6 (#507) will add a lint rule to enforce import boundaries — at that point,
// types with single-consumer usage can be moved to ../api/ or ../ui/.

export * from './account'
export * from './admin'
export * from './apiKeys'
export * from './audit' // Slice 6 candidate: review if SENSITIVE_FIELDS becomes api-only
export * from './auth'
export * from './avatar' // Slice 6 candidate: review if DICEBEAR constants lose api consumer
export * from './consent' // Slice 6 candidate: ConsentState/ConsentActions may be ui-only
export * from './errors'
export * from './httpError' // was api.ts — HTTP error shapes (not the @repo/types/api sub-path)
export * from './pagination'
export * from './profile'
export * from './rbac'
