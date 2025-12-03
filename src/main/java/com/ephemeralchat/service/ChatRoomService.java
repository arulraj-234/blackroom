package com.ephemeralchat.service;

import com.ephemeralchat.model.ChatRoom;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.UUID;
import java.util.Set;

@Service
public class ChatRoomService {
    private final ConcurrentHashMap<String, ChatRoom> chatRooms = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> userToRoomMapping = new ConcurrentHashMap<>();

    // Scheduler for room expiration
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private final ConcurrentHashMap<String, ScheduledFuture<?>> roomExpirationTasks = new ConcurrentHashMap<>();

    // Grace period in minutes
    private static final long ROOM_GRACE_PERIOD_MINUTES = 5;

    public String createRoom(String roomName, String hostUsername) {
        String roomId = generateRoomId();
        ChatRoom room = new ChatRoom(roomId, roomName, hostUsername);
        chatRooms.put(roomId, room);
        return roomId;
    }

    public ChatRoom getRoomById(String roomId) {
        return chatRooms.get(roomId);
    }

    public boolean roomExists(String roomId) {
        return chatRooms.containsKey(roomId) && chatRooms.get(roomId).isActive();
    }

    public void addUserToRoom(String roomId, String username, WebSocketSession session, String userId) {
        ChatRoom room = chatRooms.get(roomId);
        if (room != null && room.isActive()) {
            // Cancel any pending expiration task for this room
            ScheduledFuture<?> task = roomExpirationTasks.remove(roomId);
            if (task != null) {
                task.cancel(false);
                System.out.println("Cancelled expiration for room: " + roomId);
            }

            room.addParticipant(username, session, userId);
            userToRoomMapping.put(username, roomId);
        }
    }

    public void removeUserFromRoom(String username, WebSocketSession session) {
        String roomId = userToRoomMapping.get(username);
        if (roomId != null) {
            ChatRoom room = chatRooms.get(roomId);
            if (room != null) {
                // Only remove if the session matches (fixes race condition on reconnect)
                WebSocketSession activeSession = room.getParticipants().get(username);
                if (activeSession != null && activeSession.getId().equals(session.getId())) {
                    room.removeParticipant(username);
                    userToRoomMapping.remove(username);

                    // If room is empty, schedule removal instead of removing immediately
                    if (room.isEmpty()) {
                        scheduleRoomExpiration(roomId);
                    } else if (room.isHost(username)) {
                        // Host left, transfer ownership to a random participant
                        // Check if there are any participants left
                        Set<String> participants = room.getParticipantUsernames();
                        if (!participants.isEmpty()) {
                            String newHost = participants.iterator().next();
                            room.setHostUsername(newHost);
                            // Ideally, notify the room about the new host
                        }
                    }
                }
            }
        }
    }

    private void scheduleRoomExpiration(String roomId) {
        // If a task already exists, don't schedule another one (or cancel and
        // reschedule)
        if (roomExpirationTasks.containsKey(roomId)) {
            return;
        }

        System.out.println(
                "Scheduling expiration for empty room: " + roomId + " in " + ROOM_GRACE_PERIOD_MINUTES + " minutes");

        ScheduledFuture<?> task = scheduler.schedule(() -> {
            ChatRoom room = chatRooms.get(roomId);
            if (room != null && room.isEmpty()) {
                System.out.println("Room expired and removed: " + roomId);
                chatRooms.remove(roomId);
                roomExpirationTasks.remove(roomId);
            }
        }, ROOM_GRACE_PERIOD_MINUTES, TimeUnit.MINUTES);

        roomExpirationTasks.put(roomId, task);
    }

    public String getRoomIdByUsername(String username) {
        return userToRoomMapping.get(username);
    }

    public void closeRoom(String roomId) {
        ChatRoom room = chatRooms.get(roomId);
        if (room != null) {
            room.setActive(false);

            // Cancel any pending expiration task
            ScheduledFuture<?> task = roomExpirationTasks.remove(roomId);
            if (task != null) {
                task.cancel(false);
            }

            // Remove all users from mapping
            for (String username : room.getParticipantUsernames()) {
                userToRoomMapping.remove(username);
            }
            chatRooms.remove(roomId);
        }
    }

    public boolean isUserHost(String username, String roomId) {
        ChatRoom room = chatRooms.get(roomId);
        return room != null && room.isHost(username);
    }

    public Set<String> getActiveRooms() {
        return chatRooms.keySet();
    }

    public boolean canJoin(String roomId, String username, String userId) {
        ChatRoom room = chatRooms.get(roomId);
        if (room == null)
            return false;

        // If username not taken, allow
        if (!room.getParticipantUsernames().contains(username)) {
            return true;
        }

        // If username taken, check if it's the same user (reconnect)
        String storedUserId = room.getParticipantId(username);
        // If no ID stored (legacy) or IDs match, allow reconnect
        return storedUserId == null || storedUserId.equals(userId);
    }

    private String generateRoomId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}