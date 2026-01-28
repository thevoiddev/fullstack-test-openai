import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const SpeechRecognitionImpl = window.SpeechRecognition ?? window.webkitSpeechRecognition
  const canUseSpeech = Boolean(SpeechRecognitionImpl)

  async function onSubmit() {
    const message = input.trim()
    if (!message || isLoading) return

    setIsLoading(true)
    setError(null)
    setAnswer(null)

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      const data = (await resp.json().catch(() => null)) as unknown

      if (!resp.ok) {
        const msg =
          typeof data === 'object' && data && 'error' in data && typeof (data as any).error === 'string'
            ? (data as any).error
            : `Request failed with status ${resp.status}`
        throw new Error(msg)
      }

      if (typeof data !== 'object' || !data || !('answer' in data) || typeof (data as any).answer !== 'string') {
        throw new Error('Invalid response from server')
      }

      setAnswer((data as any).answer)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSubmit()
    }
  }

  function onToggleMic() {
    if (!SpeechRecognitionImpl) return

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognitionImpl()
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'ru-RU'

    setIsListening(true)
    setError(null)

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i]?.[0]?.transcript ?? ''
      }
      if (transcript.trim().length > 0) {
        setInput(transcript.trim())
      }
    }

    recognition.onerror = (event) => {
      setError(event.message || event.error || 'Speech recognition error')
      recognitionRef.current = null
      setIsListening(false)
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
    }

    try {
      recognition.start()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cannot start speech recognition')
      setIsListening(false)
    }
  }

  return (
    <div className="page">
      <div className="content">
        <div className="hero">
          <div className="appIcon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3C7.03 3 3 6.58 3 11c0 2.39 1.18 4.54 3.07 6.02V21l3.1-1.72c.9.25 1.86.38 2.83.38 4.97 0 9-3.58 9-8s-4.03-8-9-8Z"
                fill="rgba(255,255,255,0.92)"
              />
            </svg>
          </div>

          <div className="kicker">Hi there!</div>
          <div className="headline">What would you like to know?</div>
          <div className="subhead">Use one of the most common prompts below</div>
          <div className="subhead">or ask your own question</div>

          {error && <div className="status error">{error}</div>}
          {answer !== null && <div className="status ok">{answer}</div>}
        </div>
      </div>

      <div className="composerWrap">
        <div className="composer">
          <button
            type="button"
            className={`micBtn ${!canUseSpeech ? 'disabled' : ''} ${isListening ? 'listening' : ''}`}
            onClick={onToggleMic}
            disabled={!canUseSpeech || isLoading}
            aria-pressed={isListening}
            aria-label="Voice input"
            title={canUseSpeech ? (isListening ? 'Stop recording' : 'Voice input') : 'Web Speech API is not supported'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
                fill="rgba(255,255,255,0.70)"
              />
              <path
                d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20a1 1 0 1 0 2 0v-2.08A7 7 0 0 0 19 11Z"
                fill="rgba(255,255,255,0.55)"
              />
            </svg>
          </button>

          <input
            className="composerInput"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask whatever you want"
            disabled={isLoading}
            autoComplete="off"
          />

          <button
            type="button"
            className="sendBtn"
            onClick={() => void onSubmit()}
            disabled={isLoading || input.trim().length === 0}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 5l8 7-8 7V5Z"
                fill="rgba(255,255,255,0.92)"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
