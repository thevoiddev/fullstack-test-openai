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

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
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
    <div className="app">
      <div className="card">
        <div className="header">
          <div className="title">Chat</div>
          <div className="subtitle">Введите сообщение и отправьте на сервер</div>
        </div>

        <div className="controls">
          <textarea
            className="input w-full"
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Напишите сообщение..."
            disabled={isLoading}
          />

          <div className="actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setInput('')
                setAnswer(null)
                setError(null)
              }}
              disabled={isLoading}
            >
              Очистить
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => void onSubmit()}
              disabled={isLoading || input.trim().length === 0}
            >
              {isLoading ? 'Отправка…' : 'Отправить'}
            </button>

            <button
              type="button"
              className={`btn icon ${!canUseSpeech ? 'disabled' : ''} ${isListening ? 'listening' : ''}`}
              onClick={onToggleMic}
              disabled={!canUseSpeech || isLoading}
              aria-pressed={isListening}
              aria-label="Голосовой ввод"
              title={canUseSpeech ? (isListening ? 'Остановить запись' : 'Голосовой ввод') : 'Web Speech API не поддерживается'}
            >
              <span className="mic">🎤</span>
            </button>
          </div>

          {error && <div className="alert error">{error}</div>}
          {answer !== null && <div className="alert ok">{answer}</div>}
        </div>

        <div className="hint">Enter — отправить, Shift+Enter — новая строка</div>
      </div>
    </div>
  )
}

export default App
