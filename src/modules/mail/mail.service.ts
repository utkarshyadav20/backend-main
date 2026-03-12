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

  async sendApprovalRequest(user: any) {
    const adminEmails = [
      process.env.MAIL_USER || 'redapeconsulting@gmail.com',
      '20022002utkarsh@gmail.com'
    ];

    await this.mailerService.sendMail({
      to: adminEmails,
      subject: 'New Account Approval Request',
      text: `A new user is requesting account approval.\n\nUsername: ${user.username}\nEmail: ${user.email}`,
      html: `
        <h3>Account Approval Request</h3>
        <p>A new user has verified their email and is awaiting account approval.</p>
        <ul>
          <li><strong>Username:</strong> ${user.username}</li>
          <li><strong>Email:</strong> ${user.email}</li>
        </ul>
        <p>Please log in to the admin panel to review and approve their account.</p>
      `,
    });
  }
}
