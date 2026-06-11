import type { VercelRequest, VercelResponse } from '@vercel/node';

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

interface NotifyPayload {
  userId: string;
  tournamentName: string;
  eventDate: string;  // YYYY-MM-DD
  venue: string;
  teamName: string;
  representativeName: string;
  isWaitlisted: boolean;
  entryId: string;
}

async function pushMessage(to: string, text: string): Promise<void> {
  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE API error ${res.status}: ${body}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    userId, tournamentName, eventDate, venue,
    teamName, representativeName, isWaitlisted, entryId,
  } = req.body as NotifyPayload;

  const formattedDate = eventDate.replace(/-/g, '/');
  const shortId = entryId.slice(0, 8).toUpperCase();
  const statusLabel = isWaitlisted ? 'キャンセル待ち' : '本予約';

  const waitlistNote = isWaitlisted
    ? `
※ 現在この大会は出場枠が埋まっているため、キャンセル待ちでの受付です。
出場枠に空きが出た場合、LINEにてご連絡いたします。
`
    : '';

  const userMsg = `【エントリー受付（デモ）】

${representativeName} 様

以下の内容でエントリーを受け付けました。

━━━━━━━━━━━━━━
大　会：${tournamentName}
開催日：${formattedDate}
会　場：${venue}
チーム：${teamName}
受付区分：${statusLabel}
受付番号：${shortId}
━━━━━━━━━━━━━━
${waitlistNote}
※ こちらは大会予約システムのデモです。
実際のエントリーは登録されておりませんのでご安心ください ✨`;

  const adminMsg = `【デモエントリーが入りました】

大　会：${tournamentName}（${formattedDate}）
チーム：${teamName}
代表者：${representativeName}
受付区分：${statusLabel}
受付番号：${shortId}`;

  try {
    const tasks: Promise<void>[] = [pushMessage(userId, userMsg)];

    const adminId = process.env.ADMIN_LINE_USER_ID;
    if (adminId) tasks.push(pushMessage(adminId, adminMsg));

    await Promise.all(tasks);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('LINE notify error:', err);
    return res.status(500).json({ error: 'Notification failed' });
  }
}
