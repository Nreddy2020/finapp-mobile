import { View, Pressable } from 'react-native';
import { twMerge } from 'tailwind-merge';

export function Card({ children, className, variant = 'default', onPress }) {
    const baseStyles = "rounded-2xl border border-white/10 bg-surface/80 p-5 shadow-sm backdrop-blur-xl";

    const variants = {
        default: "bg-surface/80",
        glass: "bg-white/5 border-white/20",
        interactive: "active:scale-[0.98] active:bg-white/10",
        highlight: "bg-primary/10 border-primary/20"
    };

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                className={twMerge(baseStyles, variants.interactive, variants[variant], className)}
            >
                {children}
            </Pressable>
        );
    }

    return (
        <View className={twMerge(baseStyles, variants[variant], className)}>
            {children}
        </View>
    );
}
