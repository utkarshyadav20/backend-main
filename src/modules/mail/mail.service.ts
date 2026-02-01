import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) { }

  async sendUserConfirmation(user: any, token: string) {
    const url = `example.com/auth/confirm?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      // from: '"Support Team" <support@example.com>', // override default from
      subject: 'Welcome to Pixby! Confirm your Email',
      text: `Welcome ${user.username}, please enter this OTP to verify your account: ${token}`,
      html: `
        <p>Hey ${user.username},</p>
        <p>Please use this OTP to verify your account</p>
        <p>
          <b>${token}</b>
        </p>
      `,
    });
  }
}
