import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(
      this.configService.getOrThrow<string>('resend.apiKey'),
    );
    this.fromEmail = this.configService.getOrThrow<string>('resend.fromEmail');
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}
