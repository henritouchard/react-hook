import {
  useEffect,
  useCallback,
  useState,
  useRef,
  Dispatch,
  SetStateAction,
} from 'react'
import {
  requestTimeout,
  clearRequestTimeout,
  RequestTimeoutHandle,
} from '@essentials/request-timeout'

export const useThrottleCallback = <CallbackArgs extends any[]>(
  callback: (...args: CallbackArgs) => any,
  fps = 30,
  leading = false
): ((...args: CallbackArgs) => void) => {
  const nextTimeout = useRef<RequestTimeoutHandle | null>(null),
    tailTimeout = useRef<RequestTimeoutHandle | null>(null),
    calledLeading = useRef<boolean>(false),
    wait = 1000 / fps

  // cleans up pending timeouts when the function changes
  useEffect(
    () => (): void => {
      if (nextTimeout.current !== null) {
        clearRequestTimeout(nextTimeout.current)
        nextTimeout.current = null
      }

      if (tailTimeout.current !== null) {
        clearRequestTimeout(tailTimeout.current)
        tailTimeout.current = null
      }

      calledLeading.current = false
    },
    [callback, fps]
  )

  return useCallback(
    function(...args) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      if (nextTimeout.current === null) {
        const next = (): void => {
          nextTimeout.current = null
          tailTimeout.current === null && (calledLeading.current = false)
          callback.apply(self, args)
        }

        if (leading && !calledLeading.current) {
          // leading
          next()
          calledLeading.current = true
        } else {
          // head
          nextTimeout.current = requestTimeout(next, wait)
        }
      } else {
        // tail
        tailTimeout.current !== null && clearRequestTimeout(tailTimeout.current)
        tailTimeout.current = requestTimeout((): void => {
          tailTimeout.current = null
          calledLeading.current = false
          nextTimeout.current === null && callback.apply(self, args)
        }, wait)
      }
    },
    [callback, fps]
  )
}

export const useThrottle = <State>(
  initialState: State | (() => State),
  fps?: number,
  leading?: boolean
): [State, Dispatch<SetStateAction<State>>] => {
  const [state, setState] = useState<State>(initialState)
  return [state, useThrottleCallback(setState, fps, leading)]
}

export default useThrottle
