import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Users, Plus, ChevronRight, ArrowLeft, ArrowDownLeft, ArrowUpRight, CheckCircle, Trash2, Utensils, Car, Home, Receipt, DollarSign, Calendar as CalendarIcon, Tag, ChevronDown, Camera, Image as ImageIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GroupService } from '../../services/groups';

const STANDARD_CATEGORIES = [
    { id: 'Food', icon: Utensils, color: '#F59E0B' },
    { id: 'Travel', icon: Car, color: '#3B82F6' },
    { id: 'Home', icon: Home, color: '#10B981' },
    { id: 'General', icon: Receipt, color: '#6366F1' },
    { id: 'Custom', icon: Tag, color: '#EC4899' }
];

export default function SplitwiseView() {
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [balances, setBalances] = useState({});
    
    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);
    
    // Create Form
    const [newGroupName, setNewGroupName] = useState('');
    const [newMemberName, setNewMemberName] = useState('');
    const [newMembers, setNewMembers] = useState(['You']);
    
    // Expense Form
    const [expDesc, setExpDesc] = useState('');
    const [expAmt, setExpAmt] = useState('');
    const [expLink, setExpLink] = useState('');
    
    const [expDate, setExpDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [expCategory, setExpCategory] = useState('General');
    const [customCategoryInput, setCustomCategoryInput] = useState('');

    const [expPaidBy, setExpPaidBy] = useState('You'); // Can be 'MULTIPLE'
    const [paidByDetails, setPaidByDetails] = useState({}); // { member: amount }

    const [splitType, setSplitType] = useState('EQUAL'); // EQUAL, EXACT, PERCENTAGE
    const [splitDetails, setSplitDetails] = useState({}); // { memberName: value }

    // Settle Form
    const [settlePaidBy, setSettlePaidBy] = useState('You');
    const [settlePaidTo, setSettlePaidTo] = useState('');
    const [settleAmt, setSettleAmt] = useState('');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const data = await GroupService.getGroups();
            setGroups(data || []);
            if (selectedGroup) {
                const updatedSelected = data.find(g => g.id === selectedGroup.id);
                if (updatedSelected) {
                    setSelectedGroup(updatedSelected);
                    setBalances(GroupService.calculateBalances(updatedSelected));
                } else {
                    setSelectedGroup(null);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            Alert.alert("Error", "Please enter a group name");
            return;
        }
        if (newMembers.length < 2) {
            Alert.alert("Error", "Please add at least one other member");
            return;
        }
        await GroupService.createGroup({ name: newGroupName, members: newMembers });
        setNewGroupName('');
        setNewMembers(['You']);
        setShowCreateModal(false);
        loadGroups();
    };

    const handleAddMember = () => {
        if (newMemberName.trim() && !newMembers.includes(newMemberName.trim())) {
            setNewMembers([...newMembers, newMemberName.trim()]);
            setNewMemberName('');
        }
    };

    const removeMember = (m) => {
        if (m === 'You') return;
        setNewMembers(newMembers.filter(mem => mem !== m));
    };

    const handleDateChange = (event, selectedDate) => {
        if (event.type === 'dismissed') {
            setShowDatePicker(false);
            return;
        }
        if (selectedDate) {
            setShowDatePicker(false);
            setExpDate(selectedDate);
        }
    };


    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission denied", "Camera access is required");
            return;
        }
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setExpLink(result.assets[0].uri);
        }
    };

    const handleAddExpense = async () => {
        if (!expDesc.trim() || !expAmt || isNaN(parseFloat(expAmt))) {
            Alert.alert("Error", "Please enter valid details");
            return;
        }
        const amount = parseFloat(expAmt);

        // Validation for Multiple Payers
        if (expPaidBy === 'MULTIPLE') {
            const paidSum = Object.values(paidByDetails).reduce((a, b) => a + (parseFloat(b) || 0), 0);
            if (Math.abs(paidSum - amount) > 0.1) {
                Alert.alert("Error", `Multiple payers total must equal expense amount (${paidSum} != ${amount})`);
                return;
            }
        }

        // Validation for Split
        if (splitType === 'EXACT') {
            const sum = Object.values(splitDetails).reduce((a, b) => a + (parseFloat(b) || 0), 0);
            if (Math.abs(sum - amount) > 0.1) {
                Alert.alert("Error", `Split amounts must equal total (${sum} != ${amount})`);
                return;
            }
        } else if (splitType === 'PERCENTAGE') {
            const sum = Object.values(splitDetails).reduce((a, b) => a + (parseFloat(b) || 0), 0);
            if (Math.abs(sum - 100) > 0.1) {
                Alert.alert("Error", `Percentages must equal 100% (currently ${sum}%)`);
                return;
            }
        }

        const finalCategory = expCategory === 'Custom' ? (customCategoryInput.trim() || 'Custom') : expCategory;

        await GroupService.addExpense(selectedGroup.id, {
            description: expDesc,
            amount: amount,
            paidBy: expPaidBy,
            paidByObj: expPaidBy === 'MULTIPLE' ? paidByDetails : {},
            category: finalCategory,
            splitType: splitType,
            splitDetails: splitDetails,
            date: expDate.toISOString(),
            link: expLink.trim()
        });
        
        setExpDesc('');
        setExpAmt('');
        setExpLink('');
        setSplitDetails({});
        setPaidByDetails({});
        setShowExpenseModal(false);
        loadGroups();
    };

    const handleAddSettlement = async () => {
        if (!settlePaidTo || !settleAmt || isNaN(parseFloat(settleAmt))) {
            Alert.alert("Error", "Please enter valid settlement details");
            return;
        }
        if (settlePaidBy === settlePaidTo) {
            Alert.alert("Error", "You cannot settle with yourself");
            return;
        }
        await GroupService.addSettlement(selectedGroup.id, {
            amount: parseFloat(settleAmt),
            paidBy: settlePaidBy,
            paidTo: settlePaidTo
        });
        setSettleAmt('');
        setShowSettleModal(false);
        loadGroups();
    };

    const handleDeleteGroup = async (id) => {
        Alert.alert("Delete Group", "Are you sure you want to delete this group and all its expenses?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                await GroupService.deleteGroup(id);
                setSelectedGroup(null);
                loadGroups();
            }}
        ]);
    };

    const getUserNetBalance = (group) => {
        const bals = GroupService.calculateBalances(group);
        return bals['You'] || 0;
    };

    const renderSplitDetailsInputs = () => {
        if (splitType === 'EQUAL') return null;

        return (
            <View style={{ marginTop: 10 }}>
                <Text style={styles.inputLabel}>
                    {splitType === 'EXACT' ? 'Enter exact amounts' : 'Enter percentages'}
                </Text>
                {(selectedGroup.members || []).map(m => (
                    <View key={m} style={styles.splitDetailRow}>
                        <Text style={styles.splitDetailName}>{m}</Text>
                        <View style={styles.splitDetailInputWrapper}>
                            <Text style={styles.splitDetailSymbol}>{splitType === 'EXACT' ? '₹' : '%'}</Text>
                            <TextInput 
                                style={styles.splitDetailInput}
                                placeholder="0"
                                placeholderTextColor="#52525B"
                                keyboardType="numeric"
                                value={splitDetails[m] ? String(splitDetails[m]) : ''}
                                onChangeText={(val) => setSplitDetails({...splitDetails, [m]: val})}
                            />
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderPaidByInputs = () => {
        if (expPaidBy !== 'MULTIPLE') return null;

        return (
            <View style={{ marginTop: 10 }}>
                <Text style={styles.inputLabel}>Enter amounts each person paid</Text>
                {(selectedGroup.members || []).map(m => (
                    <View key={`pb-${m}`} style={styles.splitDetailRow}>
                        <Text style={styles.splitDetailName}>{m}</Text>
                        <View style={styles.splitDetailInputWrapper}>
                            <Text style={styles.splitDetailSymbol}>₹</Text>
                            <TextInput 
                                style={styles.splitDetailInput}
                                placeholder="0"
                                placeholderTextColor="#52525B"
                                keyboardType="numeric"
                                value={paidByDetails[m] ? String(paidByDetails[m]) : ''}
                                onChangeText={(val) => setPaidByDetails({...paidByDetails, [m]: val})}
                            />
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    if (selectedGroup) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => setSelectedGroup(null)} style={styles.backBtn}>
                        <ArrowLeft size={20} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{selectedGroup.name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteGroup(selectedGroup.id)}>
                        <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                {/* Balances Card */}
                <View style={styles.card}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>Who owes whom?</Text>
                        <TouchableOpacity onPress={() => {
                            setSettlePaidBy('You');
                            setSettlePaidTo((selectedGroup.members || []).find(m => m !== 'You') || '');
                            setShowSettleModal(true);
                        }} style={[styles.smallAddBtn, { backgroundColor: '#10B981' }]}>
                            <DollarSign size={16} color="#FFF" />
                            <Text style={styles.smallAddBtnText}>Settle Up</Text>
                        </TouchableOpacity>
                    </View>

                    {Object.keys(balances).length === 0 && (
                        <Text style={styles.emptyText}>No expenses yet. You are all settled up!</Text>
                    )}
                    {Object.entries(balances).map(([member, balance]) => {
                        const amount = Math.abs(balance);
                        if (amount < 0.01) return null;
                        
                        const isOwed = balance > 0;
                        return (
                            <View key={member} style={styles.balanceRow}>
                                <View style={styles.balanceMember}>
                                    <View style={styles.avatar}><Text style={styles.avatarText}>{member.charAt(0).toUpperCase()}</Text></View>
                                    <Text style={styles.memberName}>{member}</Text>
                                </View>
                                <View style={styles.balanceAmount}>
                                    <Text style={{ color: isOwed ? '#10B981' : '#F59E0B', fontSize: 13, fontWeight: '700' }}>
                                        {isOwed ? 'gets back' : 'owes'}
                                    </Text>
                                    <Text style={{ color: isOwed ? '#10B981' : '#F59E0B', fontSize: 16, fontWeight: '900' }}>
                                        ₹{amount.toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Expenses List */}
                <View style={styles.card}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>Activity Feed</Text>
                        <TouchableOpacity onPress={() => {
                            setExpDate(new Date());
                            setExpPaidBy('You');
                            setPaidByDetails({});
                            setSplitType('EQUAL');
                            setSplitDetails({});
                            setExpCategory('General');
                            setCustomCategoryInput('');
                            setExpLink('');
                            setShowExpenseModal(true);
                        }} style={styles.smallAddBtn}>
                            <Plus size={16} color="#FFF" />
                            <Text style={styles.smallAddBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {(selectedGroup.expenses || []).length === 0 ? (
                        <Text style={styles.emptyText}>No activity yet.</Text>
                    ) : (
                        (selectedGroup.expenses || []).map(exp => {
                            const isSettlement = exp.type === 'SETTLEMENT';
                            // Look for standard icon, else it's a custom category, use the Tag icon
                            const stdCat = CATEGORIES.find(c => c.id === exp.category);
                            const CatIcon = isSettlement ? DollarSign : (stdCat ? stdCat.icon : Tag);
                            const catColor = isSettlement ? '#10B981' : (stdCat ? stdCat.color : '#EC4899');
                            
                            const paidByText = exp.paidBy === 'MULTIPLE' ? 'Paid by Multiple' : `Paid by ${exp.paidBy}`;

                            return (
                                <View key={exp.id} style={styles.expenseRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={[styles.expIcon, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
                                            <CatIcon size={18} color={catColor} />
                                        </View>
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={styles.expDesc}>{exp.description}</Text>
                                            <Text style={styles.expPaidBy}>
                                                {isSettlement ? exp.date.split('T')[0] : paidByText}
                                            </Text>
                                            {exp.link ? (
                                                <View style={{ marginTop: 6 }}>
                                                    <Image source={{ uri: exp.link }} style={{ width: 40, height: 40, borderRadius: 6, borderWidth: 1, borderColor: '#FFFFFF20' }} />
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.expAmount, isSettlement && { color: '#10B981' }]}>₹{exp.amount.toFixed(2)}</Text>
                                        {!isSettlement && <Text style={{ color: '#52525B', fontSize: 10, marginTop: 2, fontWeight: '700' }}>{exp.splitType}</Text>}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Add Expense Modal */}
                <Modal visible={showExpenseModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <Text style={styles.modalTitle}>Add Expense</Text>
                            
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="e.g. Dinner, Movie"
                                placeholderTextColor="#52525B"
                                value={expDesc}
                                onChangeText={setExpDesc}
                            />

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Total Amount (₹)</Text>
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="0.00"
                                        placeholderTextColor="#52525B"
                                        keyboardType="numeric"
                                        value={expAmt}
                                        onChangeText={setExpAmt}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Date</Text>
                                    <TouchableOpacity 
                                        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={{ color: '#FFF' }}>
                                            {expDate.toLocaleDateString()}
                                        </Text>
                                        <CalendarIcon size={16} color="#A1A1AA" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={expDate}
                                    mode="date"
                                    display="default"
                                    onChange={handleDateChange}
                                />
                            )}

                            {/* Custom Category Dropdown Logic */}
                            <Text style={styles.inputLabel}>Category</Text>
                            <TouchableOpacity 
                                style={styles.dropdownBtn}
                                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            >
                                <Text style={styles.dropdownBtnText}>
                                    {expCategory === 'Custom' ? (customCategoryInput || 'Custom...') : expCategory}
                                </Text>
                                <ChevronDown size={18} color="#A1A1AA" />
                            </TouchableOpacity>

                            {showCategoryDropdown && (
                                <View style={styles.dropdownMenu}>
                                    {STANDARD_CATEGORIES.map(c => (
                                        <TouchableOpacity 
                                            key={c.id} 
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setExpCategory(c.id);
                                                setShowCategoryDropdown(false);
                                            }}
                                        >
                                            <c.icon size={16} color={c.color} style={{ marginRight: 10 }} />
                                            <Text style={styles.dropdownItemText}>{c.id === 'Custom' ? 'Add Custom...' : c.id}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {expCategory === 'Custom' && (
                                <TextInput 
                                    style={[styles.input, { marginTop: 10 }]} 
                                    placeholder="Enter custom category name"
                                    placeholderTextColor="#52525B"
                                    value={customCategoryInput}
                                    onChangeText={setCustomCategoryInput}
                                />
                            )}

                            <Text style={styles.inputLabel}>Receipt / Bill (Optional)</Text>
                            {expLink ? (
                                <View style={{ position: 'relative', marginBottom: 16 }}>
                                    <Image source={{ uri: expLink }} style={{ width: '100%', height: 150, borderRadius: 12, borderWidth: 1, borderColor: '#27272A' }} resizeMode="cover" />
                                    <TouchableOpacity 
                                        style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20 }}
                                        onPress={() => setExpLink('')}
                                    >
                                        <Trash2 size={16} color="#F87171" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 }]} onPress={handlePickImage}>
                                    <Camera size={20} color="#A1A1AA" />
                                    <Text style={{ color: '#A1A1AA', fontWeight: '600' }}>Attach Photo or Bill</Text>
                                </TouchableOpacity>
                            )}

                            <Text style={styles.inputLabel}>Paid By</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                {(selectedGroup.members || []).map(m => (
                                    <TouchableOpacity 
                                        key={m}
                                        onPress={() => setExpPaidBy(m)}
                                        style={[styles.memberPill, expPaidBy === m && styles.memberPillActive]}
                                    >
                                        <Text style={[styles.memberPillText, expPaidBy === m && styles.memberPillTextActive]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity 
                                    onPress={() => setExpPaidBy('MULTIPLE')}
                                    style={[styles.memberPill, expPaidBy === 'MULTIPLE' && styles.memberPillActive]}
                                >
                                    <Text style={[styles.memberPillText, expPaidBy === 'MULTIPLE' && styles.memberPillTextActive]}>Multiple People</Text>
                                </TouchableOpacity>
                            </ScrollView>

                            {renderPaidByInputs()}

                            <Text style={styles.inputLabel}>Split Options</Text>
                            <View style={styles.splitTypeRow}>
                                {['EQUAL', 'EXACT', 'PERCENTAGE'].map(t => (
                                    <TouchableOpacity 
                                        key={t}
                                        onPress={() => setSplitType(t)}
                                        style={[styles.splitTypeBtn, splitType === t && styles.splitTypeBtnActive]}
                                    >
                                        <Text style={[styles.splitTypeText, splitType === t && styles.splitTypeTextActive]}>
                                            {t === 'PERCENTAGE' ? '%' : t}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {renderSplitDetailsInputs()}

                            <View style={styles.modalBtns}>
                                <TouchableOpacity onPress={() => setShowExpenseModal(false)} style={styles.cancelBtn}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleAddExpense} style={styles.submitBtn}>
                                    <Text style={styles.submitBtnText}>Add Expense</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </Modal>

                {/* Settle Up Modal */}
                <Modal visible={showSettleModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Settle Up Debt</Text>
                            
                            <Text style={styles.inputLabel}>Who paid?</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                {(selectedGroup.members || []).map(m => (
                                    <TouchableOpacity 
                                        key={`spb-${m}`}
                                        onPress={() => setSettlePaidBy(m)}
                                        style={[styles.memberPill, settlePaidBy === m && { backgroundColor: '#10B981' }]}
                                    >
                                        <Text style={[styles.memberPillText, settlePaidBy === m && styles.memberPillTextActive]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.inputLabel}>Who received the money?</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                {(selectedGroup.members || []).map(m => (
                                    <TouchableOpacity 
                                        key={`spt-${m}`}
                                        onPress={() => setSettlePaidTo(m)}
                                        style={[styles.memberPill, settlePaidTo === m && { backgroundColor: '#F59E0B' }]}
                                    >
                                        <Text style={[styles.memberPillText, settlePaidTo === m && styles.memberPillTextActive]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.inputLabel}>Amount (₹)</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="0.00"
                                placeholderTextColor="#52525B"
                                keyboardType="numeric"
                                value={settleAmt}
                                onChangeText={setSettleAmt}
                            />

                            <View style={styles.modalBtns}>
                                <TouchableOpacity onPress={() => setShowSettleModal(false)} style={styles.cancelBtn}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleAddSettlement} style={[styles.submitBtn, { backgroundColor: '#10B981' }]}>
                                    <Text style={styles.submitBtnText}>Record Payment</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Your Groups</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addBtn}>
                    <Plus size={18} color="#FFF" />
                    <Text style={styles.addBtnText}>New Group</Text>
                </TouchableOpacity>
            </View>

            {groups.length === 0 ? (
                <View style={styles.emptyState}>
                    <Users size={48} color="#27272A" />
                    <Text style={styles.emptyStateTitle}>No groups yet</Text>
                    <Text style={styles.emptyStateSub}>Create a group to split expenses with friends.</Text>
                </View>
            ) : (
                groups.map(g => {
                    const netBalance = getUserNetBalance(g);
                    return (
                        <TouchableOpacity 
                            key={g.id} 
                            style={styles.groupCard}
                            onPress={() => {
                                setSelectedGroup(g);
                                setBalances(GroupService.calculateBalances(g));
                            }}
                        >
                            <View style={styles.groupCardLeft}>
                                <View style={styles.groupIcon}><Users size={20} color="#6366F1" /></View>
                                <View>
                                    <Text style={styles.groupName}>{g.name || 'Unnamed Group'}</Text>
                                    <Text style={styles.groupMeta}>{(g.members || []).length} members • {(g.expenses || []).length} expenses</Text>
                                </View>
                            </View>
                            
                            <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                                {Math.abs(netBalance) > 0.01 ? (
                                    <>
                                        <Text style={{ color: '#71717A', fontSize: 10, fontWeight: '700' }}>
                                            {netBalance > 0 ? 'you are owed' : 'you owe'}
                                        </Text>
                                        <Text style={{ color: netBalance > 0 ? '#10B981' : '#F59E0B', fontSize: 14, fontWeight: '900' }}>
                                            ₹{Math.abs(netBalance).toFixed(2)}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={{ color: '#71717A', fontSize: 12, fontWeight: '700' }}>Settled up</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })
            )}

            {/* Create Group Modal */}
            <Modal visible={showCreateModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create New Group</Text>
                        
                        <Text style={styles.inputLabel}>Group Name</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. Goa Trip, Roommates"
                            placeholderTextColor="#52525B"
                            value={newGroupName}
                            onChangeText={setNewGroupName}
                        />

                        <Text style={styles.inputLabel}>Add Members</Text>
                        <View style={styles.addMemberRow}>
                            <TextInput 
                                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                                placeholder="Member Name"
                                placeholderTextColor="#52525B"
                                value={newMemberName}
                                onChangeText={setNewMemberName}
                            />
                            <TouchableOpacity onPress={handleAddMember} style={styles.addMemberBtn}>
                                <Plus size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.membersList}>
                            {newMembers.map(m => (
                                <View key={m} style={styles.memberChip}>
                                    <Text style={styles.memberChipText}>{m}</Text>
                                    {m !== 'You' && (
                                        <TouchableOpacity onPress={() => removeMember(m)}>
                                            <Trash2 size={14} color="#EF4444" style={{ marginLeft: 6 }} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateGroup} style={styles.submitBtn}>
                                <Text style={styles.submitBtnText}>Create Group</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const CATEGORIES = STANDARD_CATEGORIES;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 40
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFF'
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366F1',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6
    },
    addBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700'
    },
    smallAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366F1',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4
    },
    smallAddBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700'
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#101012',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    emptyStateTitle: {
        color: '#A1A1AA',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 12
    },
    emptyStateSub: {
        color: '#52525B',
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center'
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#101012',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    groupCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12
    },
    groupIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#6366F115',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#6366F130'
    },
    groupName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800'
    },
    groupMeta: {
        color: '#71717A',
        fontSize: 12,
        marginTop: 2
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        backgroundColor: '#101012',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    backBtn: {
        padding: 6,
        backgroundColor: '#27272A',
        borderRadius: 8
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800'
    },
    card: {
        backgroundColor: '#101012',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    cardTitle: {
        color: '#F4F4F5',
        fontSize: 14,
        fontWeight: '800'
    },
    emptyText: {
        color: '#71717A',
        fontSize: 13,
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 10
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#FFFFFF05'
    },
    balanceMember: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3B82F615',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#3B82F630'
    },
    avatarText: {
        color: '#3B82F6',
        fontWeight: '800',
        fontSize: 14
    },
    memberName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700'
    },
    balanceAmount: {
        alignItems: 'flex-end'
    },
    expenseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#FFFFFF05'
    },
    expIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1
    },
    expDesc: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700'
    },
    expPaidBy: {
        color: '#A1A1AA',
        fontSize: 11,
        marginTop: 2
    },
    expAmount: {
        color: '#F87171',
        fontSize: 15,
        fontWeight: '800'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 20
    },
    inputLabel: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        marginTop: 10
    },
    input: {
        backgroundColor: '#09090B',
        color: '#FFF',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 10,
        fontSize: 14
    },
    addMemberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    addMemberBtn: {
        backgroundColor: '#10B981',
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    membersList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
        marginBottom: 20
    },
    memberChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    memberChipText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600'
    },
    memberPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#27272A',
        borderRadius: 20,
        marginRight: 8
    },
    memberPillActive: {
        backgroundColor: '#6366F1'
    },
    memberPillText: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '700'
    },
    memberPillTextActive: {
        color: '#FFF'
    },
    dropdownBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#09090B',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 10
    },
    dropdownBtnText: {
        color: '#FFF',
        fontSize: 14
    },
    dropdownMenu: {
        backgroundColor: '#18181B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 10,
        overflow: 'hidden'
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#FFFFFF05'
    },
    dropdownItemText: {
        color: '#FFF',
        fontSize: 14
    },
    splitTypeRow: {
        flexDirection: 'row',
        backgroundColor: '#09090B',
        borderRadius: 10,
        padding: 4,
        borderWidth: 1,
        borderColor: '#27272A',
        marginTop: 4
    },
    splitTypeBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8
    },
    splitTypeBtnActive: {
        backgroundColor: '#27272A'
    },
    splitTypeText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '700'
    },
    splitTypeTextActive: {
        color: '#FFF'
    },
    splitDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#101012',
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#FFFFFF05'
    },
    splitDetailName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700'
    },
    splitDetailInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#09090B',
        borderRadius: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#27272A',
        width: 100
    },
    splitDetailSymbol: {
        color: '#71717A',
        fontSize: 12,
        marginRight: 4
    },
    splitDetailInput: {
        flex: 1,
        color: '#FFF',
        paddingVertical: 8,
        fontSize: 14,
        fontWeight: '700'
    },
    modalBtns: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#27272A',
        alignItems: 'center'
    },
    cancelBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700'
    },
    submitBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#6366F1',
        alignItems: 'center'
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800'
    }
});
