import type { AvatarStyle, UserProfile } from '@repo/types'
import { AVATAR_STYLES } from '@repo/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'
import { createLazyFileRoute } from '@tanstack/react-router'
import { AlertTriangle, Dices } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react' // useCallback kept for `set` (patch helper)
import { toast } from 'sonner'
import { OptionsForm } from '@/components/avatar/OptionsForm'
import { authClient, useSession } from '@/lib/authClient'
import { buildDiceBearUrl } from '@/lib/avatar/buildDiceBearUrl'
import { AVATAR_STYLE_LABELS } from '@/lib/avatar/constants'
import { isAvatarStyle } from '@/lib/avatar/helpers'
import { useAvatarPreview, useStyleSchema } from '@/lib/avatar/hooks'
import { isErrorWithMessage } from '@/lib/errorUtils'
import { m } from '@/paraglide/messages'

export const Route = createLazyFileRoute('/settings/profile')({
  component: ProfileSettingsPage,
})

// -- Types --

type ProfileFormState = {
  firstName: string
  lastName: string
  fullName: string
  fullNameCustomized: boolean
  avatarStyle: AvatarStyle
  avatarSeed: string
  avatarOptions: Record<string, unknown>
  saving: boolean
  loaded: boolean
}

type ProfileActions = {
  setFirstName: (v: string) => void
  setLastName: (v: string) => void
  setFullName: (v: string) => void
  setFullNameCustomized: (v: boolean) => void
  setAvatarStyle: (v: AvatarStyle) => void
  setAvatarSeed: (v: string) => void
  setAvatarOptions: (
    v: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)
  ) => void
  setSaving: (v: boolean) => void
}

type ProfileData = {
  state: ProfileFormState
  actions: ProfileActions
}

const initialProfileForm: ProfileFormState = {
  firstName: '',
  lastName: '',
  fullName: '',
  fullNameCustomized: false,
  avatarStyle: 'lorelei',
  avatarSeed: '',
  avatarOptions: {},
  saving: false,
  loaded: false,
}

// -- Helpers --

function parseProfileResponse(
  data: UserProfile,
  fallbackName: string,
  fallbackId: string
): Partial<ProfileFormState> {
  return {
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    fullName: data.fullName ?? fallbackName,
    fullNameCustomized: data.fullNameCustomized ?? false,
    avatarStyle: data.avatarStyle && isAvatarStyle(data.avatarStyle) ? data.avatarStyle : 'lorelei',
    avatarSeed: data.avatarSeed ?? fallbackId,
    avatarOptions:
      data.avatarOptions && typeof data.avatarOptions === 'object' ? data.avatarOptions : {},
  }
}

async function fetchProfile(fallbackName: string, fallbackId: string) {
  const res = await fetch('/api/users/me', { credentials: 'include' })
  if (!res.ok) throw new Error('fetch failed')
  const data = (await res.json()) as UserProfile
  return parseProfileResponse(data, fallbackName, fallbackId)
}

// -- Custom hook --

function useProfileData(user: { id: string; name: string | null } | undefined): ProfileData {
  const [formState, setFormState] = useState(initialProfileForm)
  const set = useCallback(
    (patch: Partial<ProfileFormState>) => setFormState((prev) => ({ ...prev, ...patch })),
    []
  )

  useEffect(() => {
    if (!user) return
    fetchProfile(user.name ?? '', user.id)
      .then((p) => set({ ...p, loaded: true }))
      .catch(() => set({ fullName: user.name ?? '', avatarSeed: user.id, loaded: true }))
  }, [user, set])

  useEffect(() => {
    if (!formState.loaded || formState.fullNameCustomized) return
    const computed = [formState.firstName, formState.lastName].filter(Boolean).join(' ')
    if (computed) set({ fullName: computed })
  }, [formState.firstName, formState.lastName, formState.fullNameCustomized, formState.loaded, set])

  return {
    state: formState,
    actions: {
      setFirstName: (v: string) => set({ firstName: v }),
      setLastName: (v: string) => set({ lastName: v }),
      setFullName: (v: string) => set({ fullName: v }),
      setFullNameCustomized: (v: boolean) => set({ fullNameCustomized: v }),
      setAvatarStyle: (v: AvatarStyle) => set({ avatarStyle: v }),
      setAvatarSeed: (v: string) => set({ avatarSeed: v }),
      setAvatarOptions: (
        v: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)
      ) =>
        setFormState((prev) => ({
          ...prev,
          avatarOptions: typeof v === 'function' ? v(prev.avatarOptions) : v,
        })),
      setSaving: (v: boolean) => set({ saving: v }),
    },
  }
}

// -- Sub-components --

function ProfileInfoSection({
  state,
  actions,
}: {
  state: ProfileFormState
  actions: ProfileActions
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.profile_title()}</CardTitle>
        <CardDescription>{m.profile_description()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{m.profile_first_name()}</Label>
            <Input
              id="firstName"
              value={state.firstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                actions.setFirstName(e.target.value)
              }
              placeholder={m.profile_first_name()}
              disabled={state.saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{m.profile_last_name()}</Label>
            <Input
              id="lastName"
              value={state.lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                actions.setLastName(e.target.value)
              }
              placeholder={m.profile_last_name()}
              disabled={state.saving}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">{m.profile_display_name()}</Label>
          <Input
            id="fullName"
            value={state.fullName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              actions.setFullName(e.target.value)
              actions.setFullNameCustomized(true)
            }}
            placeholder={m.profile_display_name()}
            disabled={state.saving}
            required
          />
          {state.fullNameCustomized && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => actions.setFullNameCustomized(false)}
            >
              {m.profile_sync_name()}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AvatarCustomizationSection({
  state,
  actions,
  userId,
}: {
  state: ProfileFormState
  actions: ProfileActions
  userId: string
}) {
  const effectiveSeed = state.avatarSeed || userId || 'default'
  const avatarPreview = useAvatarPreview(state.avatarStyle, effectiveSeed, state.avatarOptions)
  const styleSchema = useStyleSchema(state.avatarStyle)
  const cdnUrl = buildDiceBearUrl(state.avatarStyle, effectiveSeed, state.avatarOptions)
  const urlTooLong = cdnUrl.length > 2000

  function handleRandomize() {
    actions.setAvatarSeed(crypto.randomUUID())
    actions.setAvatarOptions({})
  }

  function handleStyleChange(v: string) {
    if (isAvatarStyle(v)) {
      actions.setAvatarStyle(v)
      actions.setAvatarOptions({})
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.avatar_title()}</CardTitle>
        <CardDescription>{m.avatar_description()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-3">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={m.avatar_preview_alt()}
                className="size-24 rounded-full border"
              />
            ) : (
              <div className="size-24 animate-pulse rounded-full bg-muted" />
            )}
            <Button type="button" variant="outline" size="sm" onClick={handleRandomize}>
              <Dices className="mr-2 size-4" />
              {m.avatar_randomize()}
            </Button>
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="avatarStyle">{m.avatar_style_label()}</Label>
              <Select value={state.avatarStyle} onValueChange={handleStyleChange}>
                <SelectTrigger id="avatarStyle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVATAR_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      {AVATAR_STYLE_LABELS[style]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatarSeed">{m.avatar_seed_label()}</Label>
              <Input
                id="avatarSeed"
                value={state.avatarSeed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  actions.setAvatarSeed(e.target.value)
                }
                placeholder={userId}
                disabled={state.saving}
              />
              <p className="text-xs text-muted-foreground">{m.avatar_seed_hint()}</p>
            </div>
          </div>
        </div>

        {styleSchema && (
          <OptionsForm
            schema={styleSchema}
            options={state.avatarOptions}
            onChange={(name: string, value: unknown) =>
              actions.setAvatarOptions((prev) => ({ ...prev, [name]: value }))
            }
          />
        )}

        {urlTooLong && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{m.avatar_url_length_warning()}</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {cdnUrl.length} / 2000
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// -- Main page component --

function ProfileSettingsPage() {
  const { data: session } = useSession()
  const user = session?.user
  const { state, actions } = useProfileData(user)

  const effectiveSeed = state.avatarSeed || user?.id || 'default'
  const cdnUrl = buildDiceBearUrl(state.avatarStyle, effectiveSeed, state.avatarOptions)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    actions.setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: state.firstName || undefined,
          lastName: state.lastName || undefined,
          fullName: state.fullName,
          avatarSeed: state.avatarSeed || undefined,
          avatarStyle: state.avatarStyle,
          avatarOptions: state.avatarOptions,
          image: cdnUrl,
        }),
      })

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null)
        toast.error(isErrorWithMessage(data) ? data.message : m.avatar_save_error())
        return
      }

      try {
        await authClient.updateUser({ image: cdnUrl })
      } catch {
        // Session update failed — avatar will update on next page load
      }
      toast.success(m.avatar_save_success())
    } catch {
      toast.error(m.avatar_save_error())
    } finally {
      actions.setSaving(false)
    }
  }

  if (!user) return null

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <ProfileInfoSection state={state} actions={actions} />
      <AvatarCustomizationSection state={state} actions={actions} userId={user.id} />
      <Button type="submit" disabled={state.saving}>
        {state.saving ? m.profile_saving() : m.profile_save()}
      </Button>
    </form>
  )
}
