import { Resend } from 'resend';

let resendClient;

const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  resendClient ||= new Resend(process.env.RESEND_API_KEY);
  return resendClient;
};

export const sendEmail = async ({ from, ...message }) => {
  const sender = from || process.env.RESEND_FROM;
  if (!sender) throw new Error('RESEND_FROM is not configured');

  const { data, error } = await getResend().emails.send({
    from: sender,
    ...message,
  });

  if (error) {
    throw new Error(`Resend rejected email: ${error.message || 'unknown error'}`);
  }

  return data;
};
