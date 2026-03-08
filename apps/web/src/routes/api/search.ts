import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ error: 'Search not available' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
