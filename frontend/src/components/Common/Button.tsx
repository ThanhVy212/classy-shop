import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

const Button = ({ className = "", children, ...props }: ButtonProps) => {
    return (
        <button
            className={`cursor-pointer disabled:cursor-not-allowed ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export { Button };
export default Button;
