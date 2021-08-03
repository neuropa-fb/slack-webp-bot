import { App } from '@slack/bolt';
import { mkdtempSync } from "fs";
import { join } from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { readFile } from "fs/promises";
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const tmpdir = mkdtempSync(join(os.tmpdir(), 'slack-webp-bot-'));

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_WEBSOCKET_TOKEN,
  socketMode: true,
  developerMode: true,
});


app.event('file_shared' as const, async args => {
  try {
    const { event, client } = args;
    const { file_id, channel_id, user_id } = event as any;
    console.log(JSON.stringify(event));
    const fileInfo = await client.files.info({ file: file_id })
    if (fileInfo.file?.name?.toLowerCase().endsWith('.webp')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const file = fileInfo.file!;
      console.log(JSON.stringify({ file }));
      const { url_private, name } = file;
      if (!url_private) {
        console.error({ url_private, file });
        return;
      }
      const webpPath = (join(tmpdir, name!));

      await execFileAsync('curl', [url_private, '-H', `Authorization: Bearer ${process.env.SLACK_BOT_TOKEN}`, '-J', '-L', '-o', webpPath])

      const outPath = `${webpPath}.png`;

      await execFileAsync('dwebp', [webpPath, '-o', outPath]);
      const tesseractResult = await execFileAsync('tesseract', ['-l', 'pol+eng', outPath, '-']).catch(() => null);
      const uploadResult = await client.files.upload({
        channels: channel_id as string,
        initial_comment: ` <@${user_id}> Konwersja z Webp udana`,
        file: await readFile(outPath),
        filetype: 'png',
        filename: outPath.split('/').pop()!,
      });

      const messageId = uploadResult?.file?.shares?.public?.[channel_id]?.[0]?.ts;
      if (messageId && tesseractResult && tesseractResult.stdout.trim()) {
        await client.chat.postMessage({
          thread_ts: messageId,
          channel: channel_id,
          text: `OCR: ${tesseractResult.stdout.trim()}`,
        });
      }

      console.log(JSON.stringify({ uploadResult, tesseractResult }));

    } else {
      console.log(`Ignoring file ${fileInfo.file?.name}`);
    }
  } catch (e) {
    console.error(e);
  }
});

(async () => {
  // Start the app
  await app.start(Number(process.env.PORT) || 3000);

  console.log('⚡️ Bolt app is running!');
})();
