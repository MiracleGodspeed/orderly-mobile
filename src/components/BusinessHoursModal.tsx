import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    Pressable,
    Switch,
    ScrollView,
    Platform,
} from "react-native";
import AntDesign from '@expo/vector-icons/AntDesign';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WorkingHours } from "../../context/VendorContext";

interface Props {
    visible: boolean;
    onClose: () => void;
    initialHours?: WorkingHours[] | null;
    onSave: (hours: WorkingHours[]) => void;
}

const DEFAULT_HOURS: WorkingHours[] = [
    { day: "Monday", isOpen: true, openTime: "09:00 am", closeTime: "05:00 pm" },
    { day: "Tuesday", isOpen: true, openTime: "09:00 am", closeTime: "05:00 pm" },
    { day: "Wednesday", isOpen: true, openTime: "09:00 am", closeTime: "05:00 pm" },
    { day: "Thursday", isOpen: true, openTime: "09:00 am", closeTime: "05:00 pm" },
    { day: "Friday", isOpen: true, openTime: "09:00 am", closeTime: "05:00 pm" },
    { day: "Saturday", isOpen: true, openTime: "10:00 am", closeTime: "04:00 pm" },
    { day: "Sunday", isOpen: false, openTime: "10:00 am", closeTime: "04:00 pm" },
];

export default function BusinessHoursModal({ visible, onClose, initialHours, onSave }: Props) {
    const [hours, setHours] = useState<WorkingHours[]>(DEFAULT_HOURS);

    // Picker state
    const [showPicker, setShowPicker] = useState(false);
    const [currentEdit, setCurrentEdit] = useState<{ index: number, field: 'openTime' | 'closeTime' } | null>(null);
    const [tempDate, setTempDate] = useState<Date>(new Date());

    useEffect(() => {
        if (visible) {
            if (initialHours && initialHours.length > 0) {
                const merged = DEFAULT_HOURS.map(defaultDay => {
                    const found = initialHours.find(h => h.day === defaultDay.day);
                    return found ? found : defaultDay;
                });
                setHours(merged);
            } else {
                setHours(DEFAULT_HOURS);
            }
        }
    }, [visible, initialHours]);

    const toggleDay = (index: number) => {
        const newHours = [...hours];
        newHours[index].isOpen = !newHours[index].isOpen;
        setHours(newHours);
    };

    const parseTime = (timeStr: string): Date => {
        const date = new Date();
        // Expected format: "09:00 am"
        const [time, period] = timeStr.split(' ');
        if (!time || !period) return date;

        let [hours, minutes] = time.split(':').map(Number);
        if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
        if (period.toLowerCase() === 'am' && hours === 12) hours = 0;

        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(0);
        return date;
    };

    const formatTime = (date: Date): string => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';

        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours < 10 ? '0' + hours : hours}:${minutesStr} ${ampm}`;
    };

    const openPicker = (index: number, field: 'openTime' | 'closeTime') => {
        const timeStr = hours[index][field];
        setTempDate(parseTime(timeStr));
        setCurrentEdit({ index, field });
        setShowPicker(true);
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (selectedDate && currentEdit) {
            if (Platform.OS === 'android') {
                const formatted = formatTime(selectedDate);
                const newHours = [...hours];
                newHours[currentEdit.index][currentEdit.field] = formatted;
                setHours(newHours);
                setCurrentEdit(null);
            } else {
                // For iOS, inline update
                const formatted = formatTime(selectedDate);
                const newHours = [...hours];
                newHours[currentEdit.index][currentEdit.field] = formatted;
                setHours(newHours);
                setTempDate(selectedDate);
            }
        } else {
            if (Platform.OS === 'android') setCurrentEdit(null);
        }
    };

    const handleSave = () => {
        onSave(hours);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
        >
            <View className="flex-1 bg-black/40 justify-end">
                <View className="bg-white rounded-t-3xl h-[85%] w-full">

                    <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
                        <Text className="text-base font-semibold">Business Hours Configuration</Text>
                        <Pressable onPress={onClose}>
                            <AntDesign name="close" size={24} color="black" />
                        </Pressable>
                    </View>

                    <View className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <Text className="text-sm text-gray-500">
                            Set the days and times your store is open for business.
                        </Text>
                    </View>

                    <ScrollView className="flex-1 px-4 pt-4">
                        {hours.map((item, index) => (
                            <View key={item.day} className="mb-4 border border-gray-200 rounded-xl p-4 bg-white">
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-row items-center">
                                        <Switch
                                            value={item.isOpen}
                                            onValueChange={() => toggleDay(index)}
                                            trackColor={{ false: "#e5e7eb", true: "#2563eb" }}
                                        />
                                        <Text className="ml-3 text-base font-medium text-gray-900">{item.day}</Text>
                                    </View>
                                </View>

                                {item.isOpen && (
                                    <View className="flex-row items-center gap-3">
                                        <Pressable
                                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                                            onPress={() => openPicker(index, 'openTime')}
                                        >
                                            <Text className="text-xs text-gray-400 mb-0.5">Open</Text>
                                            <Text className="text-gray-900 font-medium">{item.openTime}</Text>
                                        </Pressable>

                                        <Text className="text-gray-400">-</Text>

                                        <Pressable
                                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                                            onPress={() => openPicker(index, 'closeTime')}
                                        >
                                            <Text className="text-xs text-gray-400 mb-0.5">Close</Text>
                                            <Text className="text-gray-900 font-medium">{item.closeTime}</Text>
                                        </Pressable>
                                    </View>
                                )}
                                {!item.isOpen && (
                                    <Text className="text-gray-400 text-sm italic ml-14">Closed</Text>
                                )}
                            </View>
                        ))}
                        <View className="h-20" />
                    </ScrollView>

                    <View className="px-4 py-4 border-t border-gray-200 bg-white shadow-lg">
                        <Pressable
                            onPress={handleSave}
                            className="w-full bg-[#FFD700] py-4 items-center justify-center rounded-xl"
                            style={{ backgroundColor: '#FCD34D' }}
                        >
                            <Text className="text-gray-900 font-semibold text-base">Done</Text>
                        </Pressable>
                    </View>
                </View>

                {showPicker && (
                    Platform.OS === 'ios' ? (
                        <View className="absolute bottom-0 w-full bg-white border-t border-gray-200 pb-8 rounded-t-2xl shadow-2xl z-50">
                            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                                <Text className="text-gray-500 font-medium">Select Time</Text>
                                <Pressable onPress={() => setShowPicker(false)}>
                                    <Text className="text-blue-600 font-bold text-base">Done</Text>
                                </Pressable>
                            </View>
                            <View className="items-center justify-center py-4 bg-white">
                                <DateTimePicker
                                    value={tempDate}
                                    mode="time"
                                    display="spinner"
                                    onChange={onTimeChange}
                                    textColor="black"
                                />
                            </View>
                        </View>
                    ) : (
                        <DateTimePicker
                            value={tempDate}
                            mode="time"
                            display="default"
                            onChange={onTimeChange}
                        />
                    )
                )}
            </View>
        </Modal>
    );
}
