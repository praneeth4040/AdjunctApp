import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import {supabase} from '../../lib/supabase'

type Task = {
  id: string;
  title: string;
  time: Date | null;
  repeat: "once" | "daily" | "weekly";
};
// ✅ Notification handler (ensures alerts show)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Todo = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [time, setTime] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingTask, setPendingTask] = useState<Omit<Task, "repeat"> | null>(
    null
  );
  const [repeatModal, setRepeatModal] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);

  useEffect(() => {
    fetchUserPhone();
  }, []);
  
  const fetchUserPhone = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error fetching user:', error.message);
      return;
    }
  
    const phone = data.user?.phone;
    if (phone) {
      setUserPhone(phone);
    }
  };
  
  // ✅ Ask permission for notifications
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "Enable notifications in settings.");
        }
      }
    })();
  }, []);

  // ✅ Schedule reminder - Fixed TypeScript issues
  async function scheduleReminder(task: Task) {
    if (!task.time) return;

    try {
      let trigger: any; // Using any to avoid TypeScript issues with expo-notifications types

      if (task.repeat === "daily") {
        // For daily reminders
        trigger = {
          hour: task.time.getHours(),
          minute: task.time.getMinutes(),
          repeats: true,
        };
      } else if (task.repeat === "weekly") {
        // For weekly reminders
        trigger = {
          weekday: task.time.getDay() + 1, // Sunday=1
          hour: task.time.getHours(),
          minute: task.time.getMinutes(),
          repeats: true,
        };
      } else {
        // For one-time reminders
        const now = new Date();
        const scheduledTime = new Date(task.time);
        
        if (scheduledTime <= now) {
          Alert.alert("Error", "Cannot schedule notification for past time");
          return;
        }

        trigger = {
          date: scheduledTime,
        };
      }
      

     const notificationId= await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Task Reminder",
          body: task.title,
          sound: true,
        },
        trigger,
      });

      Alert.alert("Success", "Reminder scheduled successfully!");
      return notificationId
    } catch (error) {
      console.error("Error scheduling notification:", error);
      Alert.alert("Error", "Failed to schedule reminder");
    }
  }

  // ✅ Add task (opens time picker)
  const addTask = () => {
    if (input.trim() === "") {
      Alert.alert("Error", "Task cannot be empty");
      return;
    }
    setShowPicker(true);
  };

  // ✅ Finalize task with repeat option
 const finalizeTask = async (repeat: "once" | "daily" | "weekly") => {
  if (pendingTask && userPhone) {
    const newTask: Task = { ...pendingTask, repeat };

    // 🔔 Schedule reminder and get the notification ID
    const notificationId = await scheduleReminder(newTask);

    if (!notificationId) return;

    // 🟢 Save to Supabase
    const { error } = await supabase.from("todos").insert({
      sender_phone: userPhone,
      title: newTask.title,
      time: newTask.time?.toISOString() ?? null,
      repeat: newTask.repeat,
      notification_id: notificationId,
    });

    if (error) {
      console.error("Error inserting into Supabase:", error.message);
      Alert.alert("Error", "Failed to save task to database");
    } else {
      setTasks((prev) => [...prev, newTask]);
      setInput("");
      setPendingTask(null);
      setRepeatModal(false);
      Alert.alert("Success", "Task saved and reminder scheduled!");
    }
  }
};


  // ✅ Delete task
 // ✅ Delete task (from state, Supabase, and cancel notification)
const deleteTask = async (id: string) => {
  try {
    // Find task
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;

    // 1. Cancel notification(s)
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const taskNotifications = scheduledNotifications.filter(
      (notification) =>
        notification.content.body === taskToDelete.title
    );

    for (const notification of taskNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    // 2. Delete from Supabase
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("title", taskToDelete.title) // ⚠️ safer to use notification_id instead
      .eq("sender_phone", userPhone);

    if (error) {
      console.error("Error deleting task from Supabase:", error.message);
      Alert.alert("Error", "Failed to delete task from database");
      return;
    }

    // 3. Remove locally
    setTasks((prev) => prev.filter((t) => t.id !== id));
    Alert.alert("Deleted", "Task deleted successfully!");
  } catch (error) {
    console.error("Error canceling notifications:", error);
  }
};

  // ✅ Handle time selection
  const onTimeChange = (_: any, selectedTime?: Date) => {
    setShowPicker(false);
    if (selectedTime) {
      setTime(selectedTime);
      setPendingTask({ id: Date.now().toString(), title: input, time: selectedTime });
      setRepeatModal(true); // ask repeat option
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>📋 To-Do List</Text>

      {/* Input + Add */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter task..."
          value={input}
          onChangeText={setInput}
        />
        <Button title="Add" onPress={addTask} />
      </View>

      {/* List of tasks */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskRow}>
            <Text style={styles.taskText}>
              {item.title}{" "}
              {item.time
                ? `⏰ ${item.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : ""}
              {item.repeat !== "once" ? ` (${item.repeat})` : ""}
            </Text>
            <TouchableOpacity onPress={() => deleteTask(item.id)}>
              <Text style={styles.deleteBtn}>❌</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Time Picker */}
      {showPicker && (
        <DateTimePicker
          mode="time"
          value={new Date()}
          onChange={onTimeChange}
        />
      )}

      {/* Repeat Option Modal */}
      <Modal visible={repeatModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 15 }}>
              Repeat this task?
            </Text>
            <View style={styles.buttonContainer}>
              <Button title="Once" onPress={() => finalizeTask("once")} />
              <Button title="Daily" onPress={() => finalizeTask("daily")} />
              <Button title="Weekly" onPress={() => finalizeTask("weekly")} />
              <Button
                title="Cancel"
                color="red"
                onPress={() => {
                  setRepeatModal(false);
                  setPendingTask(null);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Todo;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f9f9f9" },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  inputRow: { flexDirection: "row", marginBottom: 15 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  taskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taskText: { fontSize: 16, flex: 1 },
  deleteBtn: { fontSize: 18 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 10,
  },
});