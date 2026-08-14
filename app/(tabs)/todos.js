import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { CheckSquare, Plus, CalendarDays as Calendar, Sparkles, Circle, Trash2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TodoService } from '../../services/todos';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';

export default function TodosScreen() {
    const [todos, setTodos] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [task, setTask] = useState('');
    const [deadline, setDeadline] = useState('');
    const [priority, setPriority] = useState('normal');

    const fetchTodos = async () => {
        const data = await TodoService.getTodos();
        setTodos(Array.isArray(data) ? data : []);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchTodos();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTodos();
    };

    const handleAddTodo = async () => {
        if (!task.trim()) return;

        await TodoService.addTodo({ task, deadline, priority });
        setTask('');
        setDeadline('');
        setPriority('normal');
        setModalVisible(false);
        fetchTodos();
    };

    const handleToggle = async (id) => {
        const updated = await TodoService.toggleStatus(id);
        setTodos(Array.isArray(updated) ? updated : []);
    };

    const handleDelete = async (id) => {
        const updated = await TodoService.deleteTodo(id);
        setTodos(Array.isArray(updated) ? updated : []);
    };

    const pendingCount = (todos || []).filter(t => t && t.status === 'pending').length;
    const THEME_COLOR = '#8B5CF6'; // Violet

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={THEME_COLOR}
                        colors={[THEME_COLOR]}
                        progressBackgroundColor="#18181B"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLabel}>Productivity</Text>
                        <Text style={styles.title}>Tasks</Text>
                    </View>
                </View>

                {/* Hero Stats */}
                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Pending Tasks</Text>
                            <Text style={styles.heroAmount}>{pendingCount}</Text>
                            <View style={styles.heroFooter}>
                                <View style={styles.heroIconBadge}>
                                    <CheckSquare size={14} color="#FFFFFF" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.heroSubtext}>
                                    {pendingCount === 0 ? 'All caught up' : 'Action items remaining'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Todo List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>To-Do List</Text>

                    {todos.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <CheckSquare size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No tasks</Text>
                            <Text style={styles.emptySubtext}>Enjoy your free time or add a new task.</Text>
                        </View>
                    ) : (
                        todos.map((todo, index) => {
                            const isHighPri = todo.priority === 'high';
                            const isDone = todo.status === 'completed';

                            return (
                                <LuxuryCard
                                    key={todo.id}
                                    index={index}
                                    style={[styles.todoCard, isDone && { opacity: 0.6 }]}
                                    onPress={() => handleToggle(todo.id)}
                                >
                                    <LinearGradient
                                        colors={[`${THEME_COLOR}10`, '#00000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.cardGlow}
                                    />
                                    <View style={styles.cardIcon}>
                                        {isDone ?
                                            <CheckSquare size={24} color={THEME_COLOR} strokeWidth={2.5} /> :
                                            <Circle size={24} color={isHighPri ? '#EF4444' : '#71717A'} strokeWidth={2.5} />
                                        }
                                    </View>
                                    <View style={styles.cardContent}>
                                        <Text style={[styles.taskName, isDone && styles.taskDone]}>{todo.task}</Text>
                                        <Text style={styles.deadline}>Deadline: {todo.deadline}</Text>
                                    </View>
                                    <View style={styles.cardRight}>
                                        <View style={[styles.priorityBadge, { backgroundColor: isHighPri ? '#EF444420' : '#10B98120' }]}>
                                            <Text style={[styles.priorityText, { color: isHighPri ? '#EF4444' : '#10B981' }]}>
                                                {String(todo?.priority || 'NORMAL').toUpperCase()}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation(); handleDelete(todo.id); }}
                                            style={styles.deleteBtn}
                                        >
                                            <Trash2 size={16} color="#52525B" />
                                        </TouchableOpacity>
                                    </View>
                                </LuxuryCard>
                            );
                        })
                    )}
                </View>

                {/* Add Button */}
                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                    index={todos.length + 1}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Add Task</Text>
                </LuxuryCard>
            </ScrollView>

            {/* Add Task Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Task</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Task Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Pay Internet Bill"
                            placeholderTextColor="#52525B"
                            value={task}
                            onChangeText={setTask}
                            autoFocus
                        />

                        <Text style={styles.inputLabel}>Deadline (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Tomorrow 5 PM"
                            placeholderTextColor="#52525B"
                            value={deadline}
                            onChangeText={setDeadline}
                        />

                        <Text style={styles.inputLabel}>Priority</Text>
                        <View style={styles.priorityRow}>
                            <TouchableOpacity
                                style={[styles.priorityBtn, priority === 'normal' && styles.priorityBtnActive]}
                                onPress={() => setPriority('normal')}
                            >
                                <Text style={[styles.priorityBtnText, priority === 'normal' && { color: '#FFF' }]}>Normal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.priorityBtn, priority === 'high' && { borderColor: '#EF4444' }, priority === 'high' && styles.priorityBtnActiveHigh]}
                                onPress={() => setPriority('high')}
                            >
                                <Text style={[styles.priorityBtnText, priority === 'high' && { color: '#FFF' }]}>High</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleAddTodo}>
                            <Text style={styles.saveBtnText}>Save Task</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24 },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    todoCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#8B5CF610', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: '#8B5CF620' },
    cardContent: { flex: 1 },
    taskName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
    taskDone: { textDecorationLine: 'line-through', color: '#71717A' },
    deadline: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    cardRight: { alignItems: 'flex-end', gap: 12 },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    deleteBtn: { padding: 8 },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#8B5CF608', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#8B5CF615' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#8B5CF650' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#8B5CF6', letterSpacing: 0.5 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#18181B', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF20' },
    modalHeader: { flexDirection: 'row', justifyConent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#FFF' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
    input: { backgroundColor: '#000', color: '#FFF', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#3F3F46' },
    priorityRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    priorityBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', alignItems: 'center' },
    priorityBtnActive: { backgroundColor: '#27272A', borderColor: '#FFF' },
    priorityBtnActiveHigh: { backgroundColor: '#EF444420', borderColor: '#EF4444' },
    priorityBtnText: { color: '#71717A', fontWeight: '700' },
    saveBtn: { backgroundColor: '#8B5CF6', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
