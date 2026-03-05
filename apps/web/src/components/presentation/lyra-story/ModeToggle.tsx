import { Button } from '@repo/ui'
import { useNavigate } from '@tanstack/react-router'
import { BookOpen, Sword } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'

export function ModeToggle() {
  const { isRpg } = useLyraMode()
  const navigate = useNavigate()

  const toggle = () => {
    navigate({
      to: '/talks/lyra-story',
      search: { mode: isRpg ? 'story' : 'mmorpg' },
      replace: true,
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={m.talk_ls_mode_toggle()}
      className="h-8 w-8"
    >
      {isRpg ? <BookOpen className="h-4 w-4" /> : <Sword className="h-4 w-4" />}
    </Button>
  )
}
