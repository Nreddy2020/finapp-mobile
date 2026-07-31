import { Pressable, Text, View } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Button({
    variant = 'primary',
    size = 'default',
    children,
    onPress,
    className,
    disabled
}) {
    const baseStyles = "rounded-xl flex-row items-center justify-center transition-all active:scale-95";

    const variants = {
        primary: "bg-primary shadow-lg shadow-primary/30",
        secondary: "bg-secondary shadow-lg shadow-secondary/30",
        ghost: "bg-transparent hover:bg-white/5",
        outline: "border border-white/20 bg-transparent",
        danger: "bg-error shadow-lg shadow-error/30"
    };

    const sizes = {
        default: "h-12 px-6",
        sm: "h-9 px-3",
        icon: "h-10 w-10 p-0"
    };

    const textStyles = {
        primary: "text-white font-bold",
        secondary: "text-white font-bold",
        ghost: "text-gray-300",
        outline: "text-white",
        danger: "text-white font-bold"
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            className={twMerge(
                baseStyles,
                variants[variant],
                sizes[size],
                disabled && "opacity-50",
                className
            )}
        >
            {typeof children === 'string' ? (
                <Text className={textStyles[variant]}>{children}</Text>
            ) : children}
        </Pressable>
    );
}
