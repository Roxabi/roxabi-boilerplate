import { describe, expect, it, vi } from 'vitest'
import { printJson, printSingle, printTable } from './output.js'

describe('output', () => {
  it('printJson outputs formatted JSON', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printJson({ name: 'test' })
    expect(spy).toHaveBeenCalledWith(JSON.stringify({ name: 'test' }, null, 2))
    spy.mockRestore()
  })

  it('printTable formats a table with headers and rows', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printTable(
      [{ name: 'Alice', role: 'admin' }],
      [
        { key: 'name', header: 'Name' },
        { key: 'role', header: 'Role' },
      ]
    )
    const calls = spy.mock.calls.map((c) => c[0])
    expect(calls[0]).toContain('Name')
    expect(calls[0]).toContain('Role')
    expect(calls[2]).toContain('Alice')
    expect(calls[2]).toContain('admin')
    spy.mockRestore()
  })

  it('printTable shows message for empty rows', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printTable([], [{ key: 'name', header: 'Name' }])
    expect(spy).toHaveBeenCalledWith('No results found.')
    spy.mockRestore()
  })

  it('printSingle formats key-value pairs', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printSingle({ id: '123', name: 'Alice' }, [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
    ])
    const calls = spy.mock.calls.map((c) => c[0])
    expect(calls[0]).toContain('ID')
    expect(calls[0]).toContain('123')
    expect(calls[1]).toContain('Name')
    expect(calls[1]).toContain('Alice')
    spy.mockRestore()
  })

  it('printSingle shows em-dash for missing fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printSingle({ id: '123' }, [
      { key: 'id', label: 'ID' },
      { key: 'missing', label: 'Missing' },
    ])
    const calls = spy.mock.calls.map((c) => c[0])
    expect(calls[1]).toContain('—')
    spy.mockRestore()
  })
})
