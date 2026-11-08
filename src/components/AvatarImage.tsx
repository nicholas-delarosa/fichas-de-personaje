import { useMemo } from 'react'
import type { Avatar } from '../lib/types'
import { pixelAvatarUri } from '../lib/avatar'

export function avatarSrc(avatar: Avatar): string | null {
  if (avatar.mode === 'image') return avatar.url
  if (avatar.mode === 'pixel') return pixelAvatarUri(avatar.options)
  return null
}

export function AvatarImage({ avatar, name, className }: { avatar: Avatar; name: string; className?: string }) {
  const src = useMemo(() => avatarSrc(avatar), [avatar])
  if (!src) {
    return (
      <div className={`avatar-empty ${className ?? ''}`} aria-label="Sin avatar">
        {(name.trim()[0] ?? '?').toUpperCase()}
      </div>
    )
  }
  const pixelated = avatar.mode === 'pixel' || (avatar.mode === 'image' && avatar.pixelated)
  return (
    <img
      className={`${className ?? ''} ${pixelated ? 'pixelated' : ''}`}
      src={src}
      alt={name ? `Avatar de ${name}` : 'Avatar'}
      crossOrigin={avatar.mode === 'image' && !avatar.url.startsWith('data:') ? 'anonymous' : undefined}
      draggable={false}
    />
  )
}
