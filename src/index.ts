import { App } from '@slack/bolt';
import pino from 'pino';
import { fileSharedHandler } from './event-handlers/file_shared';
import { SlackLogger } from "./slack-logger";

export const logger = pino({
  mixin: () => ({ time: (new Date()).toLocaleString() })
});

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_WEBSOCKET_TOKEN,
  logger: new SlackLogger(logger),
});

app.event('file_shared' as const, fileSharedHandler);

(async () => {
  // Start the app
  await app.start(Number(process.env.PORT) || 3000);
  logger.info({ msg: 'Listening as bot' });
  try {
    const { channels } = await app.client.conversations.list({
      exclude_archived: true,
      types: 'public_channel',
      limit: 500,
    });
    for (const channel of channels!) {
      if (channel.is_member) {
        continue;
      }
      logger.info(({
        msg: 'Joining channel',
        channel: {
          id: channel.id,
          name: channel.name,
        }
      }));
      await app.client.conversations.join({
        channel: channel.id!,
      });
    }
  } catch (e) {
    logger.warn({ err: e });
  }
  await new Promise((resolve, reject) => {
    app.error((err) => Promise.resolve(err).then(reject))
  });
})()
  .catch(err => {
    logger.fatal({ err });
    setTimeout(() => process.exit(1), 50);
  });
