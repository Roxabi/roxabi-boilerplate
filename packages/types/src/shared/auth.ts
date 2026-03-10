export type User = {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image: string | null
  role: Role | null
  banned: boolean | null
  banReason: string | null
  createdAt: Date
  updatedAt: Date
}

export type Role = 'user' | 'superadmin'
