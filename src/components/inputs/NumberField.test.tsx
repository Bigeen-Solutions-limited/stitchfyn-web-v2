import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { NumberField } from './NumberField'

// Stores the value as a string, like the New Order measurement rows do
function Harness({ onValue }: { onValue?: (v: number | '') => void }) {
  const [value, setValue] = useState('')
  return (
    <>
      <NumberField
        label="Shoulder"
        value={value}
        onChange={(v) => { onValue?.(v); setValue(v === '' ? '' : v.toString()) }}
      />
      <button onClick={() => setValue('')}>clear</button>
      <button onClick={() => setValue('40.5')}>keypad</button>
    </>
  )
}

const input = () => screen.getByLabelText('Shoulder') as HTMLInputElement
const type = (text: string) => fireEvent.change(input(), { target: { value: text } })

describe('NumberField', () => {
  it('lets a decimal be typed one key at a time', () => {
    const onValue = vi.fn()
    render(<Harness onValue={onValue} />)
    type('12'); type('12.'); type('12.5')
    expect(input().value).toBe('12.5')
    expect(onValue).toHaveBeenLastCalledWith(12.5)
  })

  it('keeps a leading point on screen without sending NaN', () => {
    const onValue = vi.fn()
    render(<Harness onValue={onValue} />)
    type('.')
    expect(input().value).toBe('.')
    expect(onValue).toHaveBeenLastCalledWith('')
    type('.5')
    expect(onValue).toHaveBeenLastCalledWith(0.5)
  })

  it('can be corrected after a mistake', () => {
    render(<Harness />)
    type('455'); type('45'); type('42')
    expect(input().value).toBe('42')
  })

  it('ignores letters', () => {
    render(<Harness />)
    type('4'); type('4a')
    expect(input().value).toBe('4')
  })

  it('follows changes made outside the box', () => {
    render(<Harness />)
    type('12')
    fireEvent.click(screen.getByText('keypad'))
    expect(input().value).toBe('40.5')
    fireEvent.click(screen.getByText('clear'))
    expect(input().value).toBe('')
  })
})
