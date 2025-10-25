import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface UserState {
  id: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  isLoaded: boolean
}

const initialState: UserState = {
  id: null,
  email: null,
  firstName: null,
  lastName: null,
  imageUrl: null,
  isLoaded: false,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Omit<UserState, 'isLoaded'>>) => {
      state.id = action.payload.id
      state.email = action.payload.email
      state.firstName = action.payload.firstName
      state.lastName = action.payload.lastName
      state.imageUrl = action.payload.imageUrl
      state.isLoaded = true
    },
    clearUser: (state) => {
      state.id = null
      state.email = null
      state.firstName = null
      state.lastName = null
      state.imageUrl = null
      state.isLoaded = false
    },
  },
})

export const { setUser, clearUser } = userSlice.actions
export default userSlice.reducer
