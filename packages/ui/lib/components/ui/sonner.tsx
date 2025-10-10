import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export const ToasterProvider = ({ ...props }: ToasterProps) => <Sonner position="top-center" {...props} />;
