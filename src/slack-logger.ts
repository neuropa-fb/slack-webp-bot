import { Logger, LogLevel } from '@slack/logger';
import { Logger as PinoLogger } from 'pino';

function normalizeArgs(...v: unknown[]): unknown[] {
  return v.map(v => typeof v === 'string' ? { msg: v } : v);
}

export class SlackLogger implements Logger {
  constructor(private pinoLogger: PinoLogger) {
  }

  public debug(...msg: any[]): void {
    this.pinoLogger.debug(Object.assign({ msg: 'debug' }, ...normalizeArgs(...msg)));
  }

  public error(...msg: any[]): void {
    this.pinoLogger.error(Object.assign({ msg: 'error' }, ...normalizeArgs(...msg)));
  }

  public getLevel(): LogLevel {
    return LogLevel.INFO;
  }

  public info(...msg: any[]): void {
    this.pinoLogger.info(Object.assign({ msg: 'info' }, ...normalizeArgs(...msg)));
  }

  public setLevel(level: LogLevel): void {
    return;
  }

  public setName(name: string): void {
    this.pinoLogger = this.pinoLogger.child({
      name,
    });
  }

  public warn(...msg: any[]): void {
    this.pinoLogger.warn(Object.assign({ msg: 'warm' }, ...normalizeArgs(...msg)));
  }

}
