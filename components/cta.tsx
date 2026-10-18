'use client'

import { useState } from 'react'
import { recordConversion } from '@/app/practica/actions'

export function Cta({
  label,
  isPreview = false,
}: {
  label: string
  isPreview?: boolean
}) {
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'ok' | 'already' | 'error'
  >('idle')

  const handleClick = async () => {
    if (isPreview) {
      setStatus('ok')
      return
    }
    setStatus('pending')
    try {
      const result = await recordConversion()
      if (!result.ok) {
        setStatus('error')
      } else if (result.counted === false) {
        setStatus('already')
      } else {
        setStatus('ok')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={status === 'pending'}
        onClick={handleClick}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {label}
      </button>
      <p className="max-w-md text-sm text-muted-foreground">
        {status === 'pending'
          ? 'Registrando conversión...'
          : status === 'ok'
            ? isPreview
              ? 'Vista previa: no se registra conversión.'
              : '¡Conversión anotada!'
            : status === 'already'
              ? 'Ya habías convertido antes. No se duplica.'
              : status === 'error'
                ? 'No se pudo anotar la conversión.'
                : 'La conversión se anota solo acá. Cargar la página no cuenta.'}
      </p>
    </div>
  )
}
