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
  socketMode: true,
  developerMode: true,
  logger: new SlackLogger(logger),
});

app.event('file_shared' as const, fileSharedHandler);

(async () => {
  // Start the app
  await app.start(Number(process.env.PORT) || 3000);

  logger.info({ msg: 'Listening as bot' });
  await new Promise((resolve, reject) => {
    app.error((err) => Promise.resolve(err).then(reject))
  });
})()
  .catch(err => {
    logger.fatal({ err });
    setTimeout(() => process.exit(1), 50);
  });
