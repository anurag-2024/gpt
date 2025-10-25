'use client'
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAppDispatch } from './hooks'
import { setUser, clearUser } from './slices/userSlice'

export function UserSync() {
  const { user, isLoaded } = useUser()
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        dispatch(setUser({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || null,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        }))
      } else {
        dispatch(clearUser())
      }
    }
  }, [user, isLoaded, dispatch])

  return null
}
