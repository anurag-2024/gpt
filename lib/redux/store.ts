import { configureStore } from '@reduxjs/toolkit'
import conversationsReducer from './slices/conversationsSlice'
import userReducer from './slices/userSlice'

export const makeStore = () => {
  return configureStore({
    reducer: {
      conversations: conversationsReducer,
      user: userReducer,
    },
  })
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
