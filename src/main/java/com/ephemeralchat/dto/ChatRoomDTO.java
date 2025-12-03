package com.ephemeralchat.dto;

import com.ephemeralchat.model.ChatRoom;
import java.time.LocalDateTime;

public class ChatRoomDTO {
    private String roomId;
    private String roomName;
    private String hostUsername;
    private LocalDateTime createdAt;
    private int participantCount;
    private boolean isActive;

    public ChatRoomDTO(ChatRoom room) {
        this.roomId = room.getRoomId();
        this.roomName = room.getRoomName();
        this.hostUsername = room.getHostUsername();
        this.createdAt = room.getCreatedAt();
        this.participantCount = room.getParticipantCount();
        this.isActive = room.isActive();
    }

    // Getters
    public String getRoomId() {
        return roomId;
    }

    public String getRoomName() {
        return roomName;
    }

    public String getHostUsername() {
        return hostUsername;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public int getParticipantCount() {
        return participantCount;
    }

    public boolean isActive() {
        return isActive;
    }
}
