import { serveDispatchJob } from '../_shared/notifications/handler.ts'

Deno.serve(serveDispatchJob('breaking'))
