import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}) => {
  const [isBlack, setIsBlack] = useState(true)
  const buttonRef = useRef(null)

  useEffect(() => {
    // Force black theme on initial load
    const savedTheme = localStorage.getItem('theme')
    const initialTheme = savedTheme || 'black'

    document.documentElement.setAttribute('data-theme', initialTheme)
    setIsBlack(initialTheme === 'black')

    if (!savedTheme) {
      localStorage.setItem('theme', 'black')
    }

    const updateTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsBlack(theme === 'black')
    }

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    return () => observer.disconnect();
  }, [])

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return

    const nextTheme = isBlack ? 'grey' : 'black'

    if (!document.startViewTransition) {
      setIsBlack(!isBlack)
      document.documentElement.setAttribute('data-theme', nextTheme)
      localStorage.setItem('theme', nextTheme)
      return
    }

    await document.startViewTransition(() => {
      flushSync(() => {
        setIsBlack(!isBlack)
        document.documentElement.setAttribute('data-theme', nextTheme)
        localStorage.setItem('theme', nextTheme)
      })
    }).ready

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )
  }, [isBlack, duration])

  return (
    <button ref={buttonRef} onClick={toggleTheme} className={cn(className)} {...props}>
      {isBlack ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
