import { Alert, AlertDescription } from '@extension/ui';

interface InternalPageNoticeProps {
  message: string;
}

export const InternalPageView: React.FC<InternalPageNoticeProps> = ({ message }) => (
  <Alert className="text-center">
    <AlertDescription className="text-[12px]">{message}</AlertDescription>
  </Alert>
);
