# Chats Components Documentation

This directory contains the modular components that make up the chats functionality of the AdjunctApp. The original monolithic `chats.tsx` file has been broken down into smaller, reusable, and maintainable components.

## 📁 Directory Structure

```
components/chats/
├── ChatItem.tsx           # Individual chat item component
├── ChatList.tsx           # List container for chat items
├── Header.tsx             # Main header with status and actions
├── PasswordModal.tsx      # Modal for setting/verifying passwords
├── PlusButton.tsx         # Floating action button
├── SelectionHeader.tsx    # Header for selection modes
├── StatusIndicator.tsx    # User status indicator
├── UnlockIndicator.tsx    # Indicator for locked chats
├── UnlockModal.tsx        # Modal for unlocking chats
├── index.ts               # Export barrel file
└── README.md              # This documentation
```

## 🔧 Components Overview

### ChatItem.tsx
**Purpose**: Renders individual chat conversation items
**Props**:
- `item`: Conversation data
- `isSelected`: Selection state for lock mode
- `isUnlockSelected`: Selection state for unlock mode
- `selectionMode`: Whether in selection mode
- `unlockSelectionMode`: Whether in unlock selection mode
- `onPress`: Callback for item press
- `onLongPress`: Callback for long press

### ChatList.tsx
**Purpose**: Container component that manages the list of conversations
**Features**:
- Handles visible vs locked conversations
- Manages selection states
- Provides empty state messaging
- Integrates with ChatItem components

### Header.tsx
**Purpose**: Main header component with conditional rendering
**Modes**:
- Normal mode: Shows greeting, search, status, profile
- Selection mode: Shows selection controls for locking
- Unlock mode: Shows selection controls for unlocking

### PasswordModal.tsx
**Purpose**: Modal for password setup and verification
**Features**:
- Supports both password creation and verification
- Confirmation field for new passwords
- Secure text input

### PlusButton.tsx
**Purpose**: Floating action button for creating new chats
**Features**:
- Positioned absolutely in bottom right
- Styled with shadow and elevation

### SelectionHeader.tsx
**Purpose**: Header component for selection modes
**Features**:
- Supports both lock and unlock modes
- Shows selection count
- Provides cancel and confirm actions

### StatusIndicator.tsx
**Purpose**: Visual indicator for user status
**Features**:
- Color-coded status dots (active, semiactive, offline)
- Touchable for status changes

### UnlockIndicator.tsx
**Purpose**: Shows locked chat count and unlock options
**Features**:
- Displays count of hidden chats
- Provides swipe instruction
- Quick access to selection mode

### UnlockModal.tsx
**Purpose**: Modal for password verification to unlock chats
**Features**:
- Secure password input
- Cancel and confirm actions

## 🎯 Design Principles

### 1. Single Responsibility
Each component has a single, well-defined purpose and responsibility.

### 2. Reusability
Components are designed to be reusable across different parts of the app.

### 3. Props Interface
Clear, typed interfaces for all component props.

### 4. Separation of Concerns
UI components are separated from business logic (handled in custom hooks).

### 5. Consistent Styling
All components use consistent styling patterns and the Kreon font family.

## 🔄 Integration with Custom Hooks

The components work seamlessly with custom hooks that handle:

- **useContacts**: Contact management and phone number normalization
- **useUserProfile**: User profile data and initialization
- **useUserStatus**: User status management and real-time updates
- **useConversations**: Conversation data and message handling
- **useChatLock**: Chat locking/unlocking functionality

## 📱 Usage Example

```tsx
import {
  Header,
  ChatList,
  UnlockIndicator,
  PasswordModal,
  UnlockModal,
  PlusButton,
} from '../../components/chats';

// In your component
<Header
  userName={userName}
  userStatus={userStatus}
  selectionMode={selectionMode}
  // ... other props
/>

<ChatList
  conversations={conversations}
  selectedChats={selectedChats}
  // ... other props
/>
```

## 🚀 Benefits of Modular Architecture

1. **Maintainability**: Easier to locate and fix issues
2. **Testability**: Individual components can be unit tested
3. **Reusability**: Components can be used in other parts of the app
4. **Readability**: Clear separation makes code easier to understand
5. **Performance**: Smaller components enable better optimization
6. **Team Development**: Multiple developers can work on different components
7. **Code Review**: Smaller files are easier to review

## 🔧 Customization

Each component can be easily customized by:

1. **Styling**: Modify the StyleSheet in each component
2. **Behavior**: Adjust props and callbacks
3. **Layout**: Modify the JSX structure
4. **Features**: Add new props and functionality

## 📝 Future Enhancements

Potential improvements for the components:

1. **Accessibility**: Add accessibility labels and hints
2. **Animations**: Add smooth transitions and micro-interactions
3. **Theming**: Implement theme support for light/dark modes
4. **Internationalization**: Add support for multiple languages
5. **Performance**: Implement React.memo for optimization
6. **Testing**: Add comprehensive unit and integration tests

## 🐛 Troubleshooting

Common issues and solutions:

1. **Import Errors**: Ensure all components are exported in index.ts
2. **Type Errors**: Check that all props are properly typed
3. **Styling Issues**: Verify StyleSheet.create() usage
4. **Performance**: Use React.memo for expensive components
5. **Memory Leaks**: Ensure proper cleanup in useEffect hooks
