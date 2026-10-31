import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { 
    Shield, 
    User, 
    Users, 
    CheckSquare, 
    Edit2, 
    Archive, 
    Trash2,
    Wrench,
    HeartPulse,
    GraduationCap,
    DollarSign,
    Car,
    Dog,
    Layers
} from 'lucide-react-native';
import { ResponsibilityCategory, ResponsibilityStatus } from '../../../services/family/familyContracts.js';

export default function ResponsibilityCard({
    responsibility,
    onEdit,
    onArchive,
    onDelete
}) {
    if (!responsibility) return null;

    const isArchived = responsibility.status === ResponsibilityStatus.ARCHIVED;

    // Category icon and label mapping
    const getCategoryMeta = (cat) => {
        switch (cat) {
            case ResponsibilityCategory.HOME_MAINTENANCE:
                return { label: 'Home Maintenance', color: '#F97316', icon: Wrench };
            case ResponsibilityCategory.CHORES_PANTRY:
                return { label: 'Chores & Pantry', color: '#EAB308', icon: Layers };
            case ResponsibilityCategory.HEALTH_WELLNESS:
                return { label: 'Health & Wellness', color: '#EC4899', icon: HeartPulse };
            case ResponsibilityCategory.EDUCATION_ACTIVITIES:
                return { label: 'Education & Activities', color: '#8B5CF6', icon: GraduationCap };
            case ResponsibilityCategory.FINANCIAL_ADMIN:
                return { label: 'Financial Admin', color: '#10B981', icon: DollarSign };
            case ResponsibilityCategory.VEHICLE_LOGISTICS:
                return { label: 'Vehicle & Logistics', color: '#3B82F6', icon: Car };
            case ResponsibilityCategory.PET_CARE:
                return { label: 'Pet Care', color: '#14B8A6', icon: Dog };
            case ResponsibilityCategory.OTHER:
            default:
                return { label: 'General Area', color: '#71717A', icon: Shield };
        }
    };

    const catMeta = getCategoryMeta(responsibility.category);
    const CategoryIcon = catMeta.icon;

    return (
        <View style={[styles.card, isArchived && styles.cardArchived]}>
            {/* Top Row: Category Pill & Status */}
            <View style={styles.topRow}>
                <View style={[styles.categoryPill, { backgroundColor: `${catMeta.color}20`, borderColor: `${catMeta.color}60` }]}>
                    <CategoryIcon size={11} color={catMeta.color} />
                    <Text style={[styles.categoryText, { color: catMeta.color }]}>{catMeta.label}</Text>
                </View>

                {isArchived ? (
                    <View style={styles.archivedPill}>
                        <Text style={styles.archivedText}>ARCHIVED</Text>
                    </View>
                ) : (
                    <View style={styles.activePill}>
                        <Text style={styles.activeText}>ACTIVE</Text>
                    </View>
                )}
            </View>

            {/* Title & Description */}
            <View style={styles.titleSection}>
                <Text style={styles.title} numberOfLines={2}>{responsibility.title}</Text>
                {responsibility.description ? (
                    <Text style={styles.description} numberOfLines={2}>
                        {responsibility.description}
                    </Text>
                ) : null}
            </View>

            {/* People Accountability Row */}
            <View style={styles.peopleRow}>
                <View style={styles.personItem}>
                    <User size={12} color="#60A5FA" />
                    <Text style={styles.personRole}>Lead:</Text>
                    <Text style={styles.personName}>{responsibility.leadPersonName || 'Unassigned'}</Text>
                </View>

                {responsibility.backupPersonName ? (
                    <View style={styles.personItem}>
                        <Users size={12} color="#A1A1AA" />
                        <Text style={styles.personRole}>Backup:</Text>
                        <Text style={styles.personName}>{responsibility.backupPersonName}</Text>
                    </View>
                ) : null}
            </View>

            {/* Linked Tasks Metrics */}
            <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                    <CheckSquare size={12} color="#10B981" />
                    <Text style={styles.metricText}>
                        <Text style={styles.metricNumber}>{responsibility.activeTasksCount || 0}</Text> active tasks
                    </Text>
                </View>

                <View style={styles.actionsGroup}>
                    {!isArchived && onEdit && (
                        <TouchableOpacity onPress={() => onEdit(responsibility)} style={styles.actionBtn}>
                            <Edit2 size={13} color="#A1A1AA" />
                        </TouchableOpacity>
                    )}

                    {!isArchived && onArchive && (
                        <TouchableOpacity onPress={() => onArchive(responsibility)} style={styles.actionBtn}>
                            <Archive size={13} color="#A1A1AA" />
                        </TouchableOpacity>
                    )}

                    {onDelete && (
                        <TouchableOpacity onPress={() => onDelete(responsibility)} style={styles.actionBtn}>
                            <Trash2 size={13} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#18181B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 14,
        marginBottom: 10
    },
    cardArchived: {
        opacity: 0.65,
        borderColor: '#3F3F46'
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    activePill: {
        backgroundColor: '#10B98115',
        borderWidth: 1,
        borderColor: '#10B98140',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    activeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#34D399'
    },
    archivedPill: {
        backgroundColor: '#3F3F4630',
        borderWidth: 1,
        borderColor: '#71717A50',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    archivedText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#A1A1AA'
    },
    titleSection: {
        marginBottom: 10
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    description: {
        fontSize: 12,
        color: '#A1A1AA',
        marginTop: 3,
        lineHeight: 16
    },
    peopleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
        backgroundColor: '#121214',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    personItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    personRole: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '600'
    },
    personName: {
        fontSize: 11,
        color: '#F4F4F5',
        fontWeight: '600'
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    metricText: {
        fontSize: 12,
        color: '#A1A1AA'
    },
    metricNumber: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    actionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    actionBtn: {
        padding: 4
    }
});
