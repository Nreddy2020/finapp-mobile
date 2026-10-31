import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { 
    Eye, 
    EyeOff, 
    Lock, 
    Calendar, 
    User, 
    Users, 
    FileText, 
    Edit2, 
    Archive, 
    Trash2 
} from 'lucide-react-native';
import DocumentCategoryPill from './DocumentCategoryPill.js';
import DocumentExpiryBadge from './DocumentExpiryBadge.js';
import { DocumentStatus } from '../../../services/family/familyContracts.js';

export default function DocumentCard({
    document,
    personName = null,
    isPersonArchived = false,
    onEdit = null,
    onArchive = null,
    onDelete = null
}) {
    const [isRevealed, setIsRevealed] = useState(false);

    if (!document) return null;

    const isArchived = document.status === DocumentStatus.ARCHIVED;
    const hasIdentifier = Boolean(document.identifierNumber && document.identifierNumber.trim());

    // Subject display label
    let subjectLabel = 'Household Wide';
    let isHouseholdWide = true;
    if (document.personId) {
        isHouseholdWide = false;
        if (personName) {
            subjectLabel = isPersonArchived ? `${personName} (Archived)` : personName;
        } else {
            subjectLabel = isPersonArchived ? 'Archived Member' : 'Assigned Member';
        }
    }

    return (
        <View style={[styles.card, isArchived && styles.cardArchived]}>
            {/* Header row: Category Pill + Expiry Badge + Archived Badge */}
            <View style={styles.topRow}>
                <View style={styles.badgeGroup}>
                    <DocumentCategoryPill category={document.category} />
                    {isArchived && (
                        <View style={styles.archivedBadge}>
                            <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
                        </View>
                    )}
                </View>
                <DocumentExpiryBadge 
                    expiryStatus={document.expiryStatus} 
                    daysRemaining={document.daysRemaining} 
                />
            </View>

            {/* Title & Document Type */}
            <View style={styles.titleSection}>
                <Text style={styles.title} numberOfLines={2}>{document.title}</Text>
                {document.documentType ? (
                    <Text style={styles.documentType}>{document.documentType}</Text>
                ) : null}
            </View>

            {/* Subject Assignment */}
            <View style={styles.metaRow}>
                {isHouseholdWide ? (
                    <Users size={14} color="#A1A1AA" />
                ) : (
                    <User size={14} color={isPersonArchived ? '#71717A' : '#60A5FA'} />
                )}
                <Text style={[
                    styles.metaText,
                    isPersonArchived && styles.archivedPersonText,
                    isHouseholdWide && styles.householdWideText
                ]}>
                    {subjectLabel}
                </Text>
            </View>

            {/* Masked Identifier Number with Tap-to-Reveal */}
            {hasIdentifier && (
                <View style={styles.identifierBox}>
                    <View style={styles.identifierInfo}>
                        <Text style={styles.identifierLabel}>ID Number</Text>
                        <Text style={styles.identifierValue}>
                            {isRevealed ? document.identifierNumber : document.maskedIdentifier}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.revealBtn}
                        onPress={() => setIsRevealed(prev => !prev)}
                        activeOpacity={0.7}
                        accessibilityLabel={isRevealed ? 'Hide document number' : 'Show document number'}
                    >
                        {isRevealed ? (
                            <EyeOff size={16} color="#A1A1AA" />
                        ) : (
                            <Eye size={16} color="#A1A1AA" />
                        )}
                        <Text style={styles.revealText}>{isRevealed ? 'Hide' : 'Reveal'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Physical Storage Location */}
            {document.physicalLocation ? (
                <View style={styles.locationRow}>
                    <Lock size={13} color="#FBBF24" />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {document.physicalLocation}
                    </Text>
                </View>
            ) : null}

            {/* Date Details */}
            {(document.issuedDate || document.expiryDate) && (
                <View style={styles.datesRow}>
                    {document.issuedDate && (
                        <View style={styles.dateItem}>
                            <Calendar size={12} color="#71717A" />
                            <Text style={styles.dateLabel}>Issued: {document.issuedDate}</Text>
                        </View>
                    )}
                    {document.expiryDate && (
                        <View style={styles.dateItem}>
                            <Calendar size={12} color="#71717A" />
                            <Text style={styles.dateLabel}>Expires: {document.expiryDate}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Notes if present */}
            {document.notes ? (
                <Text style={styles.notes} numberOfLines={2}>{document.notes}</Text>
            ) : null}

            {/* Tags */}
            {Array.isArray(document.tags) && document.tags.length > 0 && (
                <View style={styles.tagsRow}>
                    {document.tags.map((tag, idx) => (
                        <View key={`${tag}_${idx}`} style={styles.tagChip}>
                            <Text style={styles.tagText}>#{tag}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Card Action Controls */}
            <View style={styles.actionsRow}>
                {onEdit && (
                    <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => onEdit(document)}
                        activeOpacity={0.7}
                    >
                        <Edit2 size={14} color="#A1A1AA" />
                        <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                )}

                {onArchive && (
                    <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => onArchive(document)}
                        activeOpacity={0.7}
                    >
                        <Archive size={14} color="#A1A1AA" />
                        <Text style={styles.actionText}>{isArchived ? 'Restore' : 'Archive'}</Text>
                    </TouchableOpacity>
                )}

                {onDelete && (
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.deleteBtn]} 
                        onPress={() => onDelete(document)}
                        activeOpacity={0.7}
                    >
                        <Trash2 size={14} color="#EF4444" />
                        <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#18181B',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 16,
        marginBottom: 12
    },
    cardArchived: {
        opacity: 0.65,
        borderColor: '#3F3F46'
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    badgeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    archivedBadge: {
        backgroundColor: '#3F3F4630',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#71717A50'
    },
    archivedBadgeText: {
        color: '#A1A1AA',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    titleSection: {
        marginBottom: 8
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 22
    },
    documentType: {
        fontSize: 12,
        color: '#A1A1AA',
        marginTop: 2
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10
    },
    metaText: {
        fontSize: 12,
        color: '#D4D4D8',
        fontWeight: '500'
    },
    householdWideText: {
        color: '#A1A1AA'
    },
    archivedPersonText: {
        color: '#71717A',
        fontStyle: 'italic'
    },
    identifierBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#09090B',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 10
    },
    identifierInfo: {
        flex: 1
    },
    identifierLabel: {
        fontSize: 10,
        color: '#71717A',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    identifierValue: {
        fontSize: 13,
        color: '#F4F4F5',
        fontWeight: '600',
        fontFamily: 'monospace'
    },
    revealBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#27272A50'
    },
    revealText: {
        fontSize: 11,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#78350F15',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#B4530930',
        marginBottom: 10
    },
    locationText: {
        fontSize: 12,
        color: '#FBBF24',
        fontWeight: '500',
        flex: 1
    },
    datesRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 10
    },
    dateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    dateLabel: {
        fontSize: 11,
        color: '#71717A'
    },
    notes: {
        fontSize: 12,
        color: '#A1A1AA',
        lineHeight: 18,
        marginBottom: 8
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12
    },
    tagChip: {
        backgroundColor: '#27272A',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4
    },
    tagText: {
        fontSize: 11,
        color: '#D4D4D8'
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 10
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#27272A30'
    },
    actionText: {
        fontSize: 12,
        color: '#D4D4D8',
        fontWeight: '600'
    },
    deleteBtn: {
        backgroundColor: '#450A0A30'
    },
    deleteText: {
        color: '#EF4444'
    }
});
