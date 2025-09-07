import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive helper functions
const wp = (percentage: number): number => (screenWidth * percentage) / 100;
const hp = (percentage: number): number => (screenHeight * percentage) / 100;

// Font scaling based on screen width
const getFontSize = (size: number): number => {
  const scale = screenWidth / 375; // Base width (iPhone X/11/12/13 width)
  const newSize = size * scale;
  return Math.max(12, Math.min(newSize, size * 1.2)); // Min 12, max 20% larger than original
};

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

const Todo = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchUserAndTasks();
  }, []);

  const fetchUserAndTasks = async () => {
    try {
      // Get authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error fetching user:', userError.message);
        return;
      }

      const phone = userData.user?.phone;
      if (phone) {
        setUserPhone(phone);
        await fetchTasks(phone);
      }
    } catch (error) {
      console.error('Error fetching user and tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (phone: string) => {
    try {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("sender_phone", phone)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching tasks:", error.message);
        return;
      }

      if (data) {
        const formattedTasks: Task[] = data.map(task => ({
          id: task.id.toString(),
          title: task.title,
          completed: task.completed || false,
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const addTask = async () => {
    if (input.trim() === "") {
      Alert.alert("Error", "Task cannot be empty");
      return;
    }

    if (!userPhone) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      const newTask = {
        sender_phone: userPhone,
        title: input.trim(),
        completed: false,
      };

      const { data, error } = await supabase
        .from("todos")
        .insert(newTask)
        .select()
        .single();

      if (error) {
        console.error("Error adding task:", error.message);
        Alert.alert("Error", "Failed to add task");
        return;
      }

      if (data) {
        const taskToAdd: Task = {
          id: data.id.toString(),
          title: data.title,
          completed: data.completed || false,
        };
        
        setTasks(prev => [taskToAdd, ...prev]);
        setInput("");
      }
    } catch (error) {
      console.error("Error adding task:", error);
      Alert.alert("Error", "Failed to add task");
    }
  };

  const toggleTask = async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const { error } = await supabase
        .from("todos")
        .update({ completed: !task.completed })
        .eq("id", id)
        .eq("sender_phone", userPhone);

      if (error) {
        console.error("Error updating task:", error.message);
        Alert.alert("Error", "Failed to update task");
        return;
      }

      setTasks(prev => 
        prev.map(t => 
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      );
    } catch (error) {
      console.error("Error toggling task:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", id)
        .eq("sender_phone", userPhone);

      if (error) {
        console.error("Error deleting task:", error.message);
        Alert.alert("Error", "Failed to delete task");
        return;
      }

      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Failed to delete task");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userPhone) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please authenticate{'\n'}to use the todo app</Text>
        </View>
      </SafeAreaView>
    );
  }

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Tasks</Text>
      </View>

      {/* Progress Indicators */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {completedCount} of {tasks.length} completed
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Today's Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{tasks.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedCount}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{tasks.length - completedCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Add Task Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Add New Task</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              placeholderTextColor="#6f634f"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={addTask}
            />
            <TouchableOpacity style={styles.addButton} onPress={addTask}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tasks List */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Your Tasks</Text>
          
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.taskCard, item.completed && styles.completedTaskCard]}
                onPress={() => toggleTask(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.taskContent}>
                  <View style={[styles.checkbox, item.completed && styles.checkedBox]}>
                    {item.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[
                    styles.taskText,
                    item.completed && styles.completedTaskText
                  ]}>
                    {item.title}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  onPress={() => deleteTask(item.id)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No tasks yet!</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first task above{'\n'}to get started
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Bottom Indicator */}
      <View style={styles.bottomIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#dcd0a8',
    paddingHorizontal: wp(5),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  title: {
    fontSize: getFontSize(24),
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    color: '#000',
  },
  progressContainer: {
    marginBottom: hp(3),
    alignItems: 'center',
  },
  progressBar: {
    width: wp(60),
    height: 4,
    backgroundColor: '#f1dea9',
    borderRadius: 2,
    marginBottom: hp(1),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#b2ffe2',
    borderRadius: 2,
  },
  progressText: {
    fontSize: getFontSize(14),
    color: '#6f634f',
    fontFamily: 'Kreon-Regular',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#f1dea9',
    padding: wp(5),
    borderRadius: 15,
    marginBottom: hp(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: getFontSize(18),
    fontFamily: 'Kreon-Bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: hp(2),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: getFontSize(24),
    fontFamily: 'Kreon-Bold',
    color: '#000',
  },
  statLabel: {
    fontSize: getFontSize(12),
    fontFamily: 'Kreon-Regular',
    color: '#6f634f',
    marginTop: 2,
  },
  inputSection: {
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: getFontSize(16),
    fontFamily: 'Kreon-Bold',
    color: '#000',
    marginBottom: hp(1.5),
  },
  inputContainer: {
    flexDirection: 'row',
    gap: wp(3),
  },
  input: {
    flex: 1,
    backgroundColor: '#f1dea9',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: 12,
    fontSize: getFontSize(16),
    fontFamily: 'Kreon-Regular',
    color: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButton: {
    backgroundColor: '#b2ffe2',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    fontSize: getFontSize(24),
    fontFamily: 'Kreon-Bold',
    color: '#000',
  },
  tasksSection: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: hp(2),
  },
  taskCard: {
    backgroundColor: '#f1dea9',
    padding: wp(4),
    borderRadius: 12,
    marginBottom: hp(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedTaskCard: {
    backgroundColor: '#e8dcc0',
    opacity: 0.8,
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6f634f',
    marginRight: wp(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#b2ffe2',
    borderColor: '#b2ffe2',
  },
  checkmark: {
    fontSize: getFontSize(14),
    fontFamily: 'Kreon-Bold',
    color: '#000',
  },
  taskText: {
    fontSize: getFontSize(16),
    fontFamily: 'Kreon-Regular',
    color: '#000',
    flex: 1,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    color: '#6f634f',
  },
  deleteButton: {
    padding: wp(2),
  },
  deleteButtonText: {
    fontSize: getFontSize(20),
    color: '#6f634f',
    fontFamily: 'Kreon-Bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: hp(6),
  },
  emptyTitle: {
    fontSize: getFontSize(18),
    fontFamily: 'Kreon-Bold',
    color: '#000',
    marginBottom: hp(1),
  },
  emptySubtitle: {
    fontSize: getFontSize(14),
    fontFamily: 'Kreon-Regular',
    color: '#6f634f',
    textAlign: 'center',
    lineHeight: getFontSize(20),
  },
  bottomIndicator: {
    width: Math.min(wp(35), 150), // Max width for larger screens
    height: hp(0.6),
    minHeight: 4,
    maxHeight: 8,
    backgroundColor: '#f1dea9',
    borderRadius: hp(0.3),
    alignSelf: 'center',
    marginBottom: hp(1.2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
  },
  loadingText: {
    fontSize: getFontSize(18),
    fontFamily: 'Kreon-Regular',
    color: '#6f634f',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
  },
  errorText: {
    fontSize: getFontSize(16),
    fontFamily: 'Kreon-Regular',
    color: '#6f634f',
    textAlign: 'center',
    lineHeight: getFontSize(22),
    maxWidth: 300, // Prevent text from becoming too wide on tablets
  },
});

export default Todo;