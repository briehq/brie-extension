import * as React from 'react';

type LinearIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

const LinearIcon = React.forwardRef<SVGSVGElement, LinearIconProps>(({ size = 24, className, ...rest }, ref) => (
  <svg
    {...rest}
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none">
    <path
      d="M1.04279 13.1844C1.30291 15.6872 2.41795 18.0237 4.19993 19.8002C5.97609 21.5819 8.31213 22.6969 10.8144 22.9573L1.04279 13.1844Z"
      fill="#5E6AD2"
    />
    <path
      d="M1 11.4161L12.5839 23C13.5721 22.9447 14.5482 22.7562 15.486 22.4399L1.56138 8.51279C1.24447 9.45089 1.05564 10.4275 1 11.4161Z"
      fill="#5E6AD2"
    />
    <path
      d="M2.05807 7.28627L16.7137 21.9419C17.4862 21.5715 18.2125 21.1115 18.8775 20.5714L3.42857 5.12131C2.88838 5.78669 2.42839 6.51335 2.05807 7.28627Z"
      fill="#5E6AD2"
    />
    <path
      d="M4.24988 4.21701C6.30969 2.15719 9.10341 1 12.0164 1C14.9294 1 17.7232 2.15719 19.783 4.21701C21.8428 6.27683 23 9.07054 23 11.9836C23 14.8966 21.8428 17.6903 19.783 19.7501L4.24988 4.21701Z"
      fill="#5E6AD2"
    />
  </svg>
));

LinearIcon.displayName = 'LinearIcon';

export { LinearIcon };
