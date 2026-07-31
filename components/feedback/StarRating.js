import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Star } from 'lucide-react-native';

export default function StarRating({ rating, onRatingChange, maxStars = 5 }) {
    return (
        <View style={styles.container}>
            {[...Array(maxStars)].map((_, index) => {
                const starValue = index + 1;
                const isSelected = starValue <= rating;

                return (
                    <TouchableOpacity
                        key={index}
                        onPress={() => onRatingChange(starValue)}
                        activeOpacity={0.7}
                    >
                        <Star
                            size={40}
                            fill={isSelected ? '#F59E0B' : 'transparent'}
                            color={isSelected ? '#F59E0B' : '#52525B'}
                            strokeWidth={isSelected ? 0 : 2}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginVertical: 20 }
});
