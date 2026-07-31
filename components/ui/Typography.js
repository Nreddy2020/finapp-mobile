import { Text } from 'react-native';

export function Typography({ variant = 'body', className, children, ...props }) {
    const baseStyles = "text-white";

    const variants = {
        h1: "font-heading text-4xl mb-4",
        h2: "font-heading text-3xl mb-3",
        h3: "font-heading text-2xl mb-2",
        h4: "font-heading text-xl mb-2",
        body: "font-body text-base text-gray-300",
        caption: "font-body text-sm text-gray-400",
        mono: "font-mono text-sm text-accent",
    };

    return (
        <Text className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
            {children}
        </Text>
    );
}
