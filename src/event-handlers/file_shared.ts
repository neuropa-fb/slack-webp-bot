import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { mkdtempSync } from "fs";
import { join } from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { readFile, unlink } from "fs/promises";
import { promisify } from 'util';
import {logger} from "../index";

const execFileAsync = promisify(execFile);

const tmpdir = mkdtempSync(join(os.tmpdir(), 'slack-webp-bot-'));


export const fileSharedHandler = async (args: SlackEventMiddlewareArgs<"file_shared"> & AllMiddlewareArgs): Promise<void> => {
  try {
    const { event, client } = args;
    const { file_id, channel_id, user_id } = event as any;
    logger.info({
      msg: 'Event received',
      event,
    })
    const fileInfo = await client.files.info({ file: file_id })
    if (fileInfo.file?.name?.toLowerCase().endsWith('.webp')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const file = fileInfo.file!;
      logger.info({
        msg: 'Webp file found',
        file,
      })
      const { url_private, name } = file;
      if (!url_private) {
        logger.error({
          msg: 'File lacks url_private',
          url_private,
          file
        });
        return;
      }
      const webpPath = (join(tmpdir, name!));

      await execFileAsync('curl', [url_private, '-H', `Authorization: Bearer ${process.env.SLACK_BOT_TOKEN}`, '-J', '-L', '-o', webpPath])

      const outPath = `${webpPath}.png`;

      await execFileAsync('dwebp', [webpPath, '-o', outPath]);
      const uploadResult = await client.files.upload({
        channels: channel_id as string,
        initial_comment: ` <@${user_id}> Konwersja z Webp udana`,
        file: await readFile(outPath),
        filetype: 'png',
        filename: outPath.split('/').pop()!,
      });
      const tesseractResult = await execFileAsync('tesseract', ['-l', 'pol+eng', outPath, '-']).catch(() => null);

      const messageId = uploadResult?.file?.shares?.public?.[channel_id]?.[0]?.ts;
      if (messageId && tesseractResult && tesseractResult.stdout.trim()) {
        await client.chat.postMessage({
          thread_ts: messageId,
          channel: channel_id,
          text: `OCR: ${tesseractResult.stdout.trim()}`,
        });
      }

      logger.info({
        msg: 'Uploaded file and response',
        tesseractResult,
        uploadResult,
      });
      await Promise.all([outPath, webpPath].map(p => unlink(p)))

    } else {
      logger.info(`Ignoring file ${fileInfo.file?.name}`);
    }
  } catch (err) {
    logger.error({ err });
  }
}
