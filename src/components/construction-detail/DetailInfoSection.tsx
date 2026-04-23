import type { ReactNode } from 'react'

type DetailInfoSectionProps = {
  title: string
  copy?: string
  children: ReactNode
}

export function DetailInfoSection({ title, copy, children }: DetailInfoSectionProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h3 className="panel__title">{title}</h3>
          {copy ? <p className="panel__copy">{copy}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}
