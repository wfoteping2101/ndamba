// Vercel Node function: paid video hosting on Ndamba (« Envoyer sur Ndamba »). STUB for now.
//
//   POST { plan: "pass" | "club", fileName, sizeMB, durationS, contentType } -> 501 { error: "storage_not_configured" }
//
// Until a storage provider is connected, this answers 501 and the app runs the upload as a demonstration
// (the file stays on the device, nothing is sent, nothing is billed). Prices: VIDEO_HOSTING in src/lib/config.ts.
//
// Intended design, once VIDEO_STORAGE is set (an S3-compatible bucket such as Cloudflare R2, no egress fee):
//   1. The browser POSTs the metadata above. The server checks the payment (Pass match, or an active Club vidéo
//      subscription with hours left this month) and the limits (Pass match: up to 2 h and 4 GB per file).
//   2. The server creates an object key `clubs/<clubId>/<videoId>.<ext>` and returns a presigned PUT URL
//      (valid about 15 minutes, Content-Type and Content-Length pinned), or a presigned multipart upload
//      (one URL per 64 MB part) for large files, so the video never transits through this function.
//   3. The browser uploads straight to the bucket with progress, then POSTs { videoId, done: true }; the server
//      checks the object exists (HEAD), records the expiry (12 months) and returns a playback URL.
//   4. Playback uses short-lived presigned GET URLs (or a CDN in front of the bucket with signed cookies), so
//      only club members with the right to see the video can open it. A daily job deletes expired objects.
// Configuration (Vercel > Project > Settings > Environment Variables), set by the owner, never in the code:
//   VIDEO_STORAGE            the bucket endpoint, e.g. https://<account>.r2.cloudflarestorage.com/<bucket>
//   VIDEO_STORAGE_KEY_ID     access key id
//   VIDEO_STORAGE_SECRET     secret access key
import type { IncomingMessage, ServerResponse } from 'node:http'

type Req = IncomingMessage & { body?: unknown }

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST')
    return send(res, 405, { error: 'method_not_allowed' })
  }
  if (!process.env.VIDEO_STORAGE) return send(res, 501, { error: 'storage_not_configured' })
  // Storage is configured but the presigned-URL flow described above is not written yet.
  return send(res, 501, { error: 'upload_not_implemented' })
}
