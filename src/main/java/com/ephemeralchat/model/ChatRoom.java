package com.ephemeralchat.model;

import org.springframework.web.socket.WebSocketSession;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Set;

public class ChatRoom {
    private String roomId;
    private String roomName;
    private String hostUsername;
    private LocalDateTime createdAt;
    private ConcurrentHashMap<String, WebSocketSession> participants;
    private ConcurrentHashMap<String, String> participantIds; // username -> userId
    private boolean isActive;

    public ChatRoom(String roomId, String roomName, String hostUsername) {
        this.roomId = roomId;
        this.roomName = roomName;
        this.hostUsername = hostUsername;
        this.createdAt = LocalDateTime.now();
        this.participants = new ConcurrentHashMap<>();
        this.participantIds = new ConcurrentHashMap<>();
        this.isActive = true;
    }

    public void addParticipant(String username, WebSocketSession session, String userId) {
        participants.put(username, session);
        if (userId != null) {
            participantIds.put(username, userId);
        }
    }

    public void removeParticipant(String username) {
        participants.remove(username);
        participantIds.remove(username);
    }

    public Set<String> getParticipantUsernames() {
        return participants.keySet();
    }

    public WebSocketSession getParticipantSession(String username) {
        return participants.get(username);
    }

    public String getParticipantId(String username) {
        return participantIds.get(username);
    }

    public int getParticipantCount() {
        return participants.size();
    }

    public boolean isEmpty() {
        return participants.isEmpty();
    }

    public boolean isHost(String username) {
        return hostUsername.equals(username);
    }

    // Getters and Setters
    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getRoomName() {
        return roomName;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }

    public String getHostUsername() {
        return hostUsername;
    }

    public void setHostUsername(String hostUsername) {
        this.hostUsername = hostUsername;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public ConcurrentHashMap<String, WebSocketSession> getParticipants() {
        return participants;
    }

    public void setParticipants(ConcurrentHashMap<String, WebSocketSession> participants) {
        this.participants = participants;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }
}