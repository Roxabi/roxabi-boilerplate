import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { m } from '@/paraglide/messages'

export function PrivacyDataSection() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch('/api/gdpr/export', {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error('Export failed')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/)
      const filename =
        filenameMatch?.[1] ?? `roxabi-data-export-${new Date().toISOString().slice(0, 10)}.json`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('GDPR export failed', error)
      toast.error(m.auth_toast_error())
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.privacy_section_title()}</CardTitle>
        <CardDescription>{m.privacy_section_description()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          onClick={handleExport}
          loading={loading}
          loadingText={m.privacy_downloading()}
        >
          <Download />
          {m.privacy_download_data()}
        </Button>
      </CardContent>
    </Card>
  )
}
