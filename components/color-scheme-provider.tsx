"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  COLOR_SCHEMES,
  COLOR_SCHEME_TOKEN_NAMES,
  DEFAULT_COLOR_SCHEME_ID,
  getColorSchemeById,
  isColorSchemeId,
  normalizeColorSchemeId,
  type ColorSchemeDefinition,
  type ColorSchemeId,
} from "@/lib/color-schemes"

const STORAGE_KEY = "devvault.colorSchemeId"

type SetColorSchemeOptions = {
  persist?: boolean
}

type ColorSchemeContextValue = {
  schemes: readonly ColorSchemeDefinition[]
  currentColorSchemeId: ColorSchemeId
  currentSchemeIndex: number
  isLoading: boolean
  isSaving: boolean
  setColorSchemeById: (
    schemeId: ColorSchemeId,
    options?: SetColorSchemeOptions
  ) => Promise<boolean>
  setColorSchemeByIndex: (
    index: number,
    options?: SetColorSchemeOptions
  ) => Promise<boolean>
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null)

type ColorSchemeApiResponse = {
  colorSchemeId?: string
}

function applyColorSchemeToDocument(schemeId: ColorSchemeId) {
  const scheme = getColorSchemeById(schemeId) ?? getColorSchemeById(DEFAULT_COLOR_SCHEME_ID)
  if (!scheme) {
    return
  }

  const root = document.documentElement
  root.dataset.colorScheme = scheme.id

  for (const tokenName of COLOR_SCHEME_TOKEN_NAMES) {
    root.style.setProperty(`--${tokenName}`, scheme.tokens[tokenName])
  }
}

function persistColorSchemeLocally(schemeId: ColorSchemeId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, schemeId)
  } catch {
    // Ignore storage failures and rely on DB persistence only.
  }
}

function readLocalColorSchemeId(): ColorSchemeId | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value || !isColorSchemeId(value)) {
      return null
    }

    return value
  } catch {
    return null
  }
}

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [currentColorSchemeId, setCurrentColorSchemeId] =
    useState<ColorSchemeId>(DEFAULT_COLOR_SCHEME_ID)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    const localColorSchemeId = readLocalColorSchemeId()
    if (localColorSchemeId) {
      setCurrentColorSchemeId(localColorSchemeId)
      applyColorSchemeToDocument(localColorSchemeId)
    } else {
      applyColorSchemeToDocument(DEFAULT_COLOR_SCHEME_ID)
    }

    void (async () => {
      try {
        const response = await fetch("/api/preferences/color-scheme", {
          cache: "no-store",
        })
        const payload = (await response
          .json()
          .catch(() => null)) as ColorSchemeApiResponse | null

        if (!response.ok || !payload?.colorSchemeId || !isColorSchemeId(payload.colorSchemeId)) {
          return
        }

        if (cancelled) {
          return
        }

        setCurrentColorSchemeId(payload.colorSchemeId)
        applyColorSchemeToDocument(payload.colorSchemeId)
        persistColorSchemeLocally(payload.colorSchemeId)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const setColorSchemeById = useCallback(
    async (
      requestedSchemeId: ColorSchemeId,
      options: SetColorSchemeOptions = { persist: true }
    ) => {
      const nextId = normalizeColorSchemeId(requestedSchemeId)
      setCurrentColorSchemeId(nextId)
      applyColorSchemeToDocument(nextId)
      persistColorSchemeLocally(nextId)

      if (options.persist === false) {
        return true
      }

      setIsSaving(true)
      try {
        const response = await fetch("/api/preferences/color-scheme", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            colorSchemeId: nextId,
          }),
        })

        const payload = (await response
          .json()
          .catch(() => null)) as ColorSchemeApiResponse | null

        if (!response.ok) {
          return false
        }

        if (payload?.colorSchemeId && isColorSchemeId(payload.colorSchemeId)) {
          const syncedId = payload.colorSchemeId
          if (syncedId !== nextId) {
            setCurrentColorSchemeId(syncedId)
            applyColorSchemeToDocument(syncedId)
            persistColorSchemeLocally(syncedId)
          }
        }

        return true
      } catch {
        return false
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  const setColorSchemeByIndex = useCallback(
    async (index: number, options?: SetColorSchemeOptions) => {
      const clamped = Math.min(Math.max(index, 0), COLOR_SCHEMES.length - 1)
      const scheme = COLOR_SCHEMES[clamped]
      return setColorSchemeById(scheme.id, options)
    },
    [setColorSchemeById]
  )

  const currentSchemeIndex = useMemo(() => {
    const index = COLOR_SCHEMES.findIndex((scheme) => scheme.id === currentColorSchemeId)
    return index >= 0 ? index : 0
  }, [currentColorSchemeId])

  const value = useMemo<ColorSchemeContextValue>(
    () => ({
      schemes: COLOR_SCHEMES,
      currentColorSchemeId,
      currentSchemeIndex,
      isLoading,
      isSaving,
      setColorSchemeById,
      setColorSchemeByIndex,
    }),
    [
      currentColorSchemeId,
      currentSchemeIndex,
      isLoading,
      isSaving,
      setColorSchemeById,
      setColorSchemeByIndex,
    ]
  )

  return (
    <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>
  )
}

export function useColorScheme() {
  const context = useContext(ColorSchemeContext)
  if (!context) {
    throw new Error("useColorScheme must be used inside ColorSchemeProvider.")
  }

  return context
}

