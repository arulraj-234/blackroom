package com.ephemeralchat.handler;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import com.ephemeralchat.model.ChatMessage;
import com.ephemeralchat.model.ChatRoom;
import com.ephemeralchat.service.ChatRoomService;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class ChatWebSocketHandler implements WebSocketHandler {

    @Autowired
    private ChatRoomService chatRoomService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConcurrentHashMap<String, String> sessionToUsername = new ConcurrentHashMap<>();
    // Map<SessionId, Map<UploadId, StringBuilder>>
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, StringBuilder>> sessionUploads = new ConcurrentHashMap<>();
    // Map<SessionId, Map<UploadId, String>> to store file type for final message
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, String>> sessionUploadTypes = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
        System.out.println("WebSocket connection established: " + session.getId());
    }

    @Override
    public void handleMessage(@NonNull WebSocketSession session, @NonNull WebSocketMessage<?> message)
            throws Exception {
        String payload = message.getPayload().toString();
        ChatMessage chatMessage;
        try {
            chatMessage = objectMapper.readValue(payload, ChatMessage.class);
        } catch (Exception e) {
            System.err.println("Error parsing JSON message: " + e.getMessage());
            return;
        }

        String sessionId = session.getId();
        String username = chatMessage.getSender();
        String roomId = chatMessage.getRoomId();

        switch (chatMessage.getType()) {
            case JOIN:
                handleJoinRoom(session, sessionId, username, roomId, chatMessage.getUserId());
                break;
            case CHAT:
            case AUDIO:
            case IMAGE:
            case VIDEO:
            case FILE:
                handleChatMessage(chatMessage, roomId);
                break;
            case UPLOAD_START:
            case UPLOAD_CHUNK:
            case UPLOAD_END:
                handleFileUpload(session, chatMessage, roomId);
                break;
            case LEAVE:
                handleLeaveRoom(session, username);
                break;
            case ROOM_CLOSED:
                handleCloseRoom(username, roomId);
                break;
            default:
                break;
        }
    }

    private void handleJoinRoom(WebSocketSession session, String sessionId, String username, String roomId,
            String userId)
            throws IOException {
        if (!chatRoomService.roomExists(roomId)) {
            // Send error message back to user
            ChatMessage errorMessage = new ChatMessage(ChatMessage.MessageType.CHAT,
                    "Room not found or inactive", "System", roomId);
            session.sendMessage(
                    new TextMessage(java.util.Objects.requireNonNull(objectMapper.writeValueAsString(errorMessage))));
            return;
        }

        if (chatRoomService.roomExists(roomId) && !chatRoomService.canJoin(roomId, username, userId)) {
            System.out.println(
                    "Join denied for user: " + username + " in room: " + roomId + " (Duplicate/Invalid Reconnect)");
            ChatMessage errorMessage = new ChatMessage(ChatMessage.MessageType.CHAT,
                    "Username '" + username + "' is already taken in this room", "System", roomId);
            session.sendMessage(
                    new TextMessage(java.util.Objects.requireNonNull(objectMapper.writeValueAsString(errorMessage))));
            return;
        }

        System.out.println("User joined: " + username + " in room: " + roomId);
        sessionToUsername.put(sessionId, username);
        chatRoomService.addUserToRoom(roomId, username, session, userId);

        // Notify room about new user
        ChatMessage joinMessage = new ChatMessage(ChatMessage.MessageType.JOIN,
                username + " joined the room", username, roomId);
        broadcastToRoom(roomId, joinMessage);

        // Send updated user list
        sendUserListToRoom(roomId);
    }

    private void handleChatMessage(ChatMessage chatMessage, String roomId) throws IOException {
        if (chatRoomService.roomExists(roomId)) {
            broadcastToRoom(roomId, chatMessage);
        }
    }

    private void handleLeaveRoom(WebSocketSession session, String username) throws IOException {
        String roomId = chatRoomService.getRoomIdByUsername(username);
        if (roomId != null) {
            chatRoomService.removeUserFromRoom(username, session);
            sessionToUsername.remove(session.getId());

            // Notify room about user leaving
            ChatMessage leaveMessage = new ChatMessage(ChatMessage.MessageType.LEAVE,
                    username + " left the room", username, roomId);
            broadcastToRoom(roomId, leaveMessage);

            // Send updated user list
            sendUserListToRoom(roomId);
        }
    }

    private void handleCloseRoom(String username, String roomId) throws IOException {
        if (chatRoomService.isUserHost(username, roomId)) {
            // Notify all users that room is closing
            ChatMessage closeMessage = new ChatMessage(ChatMessage.MessageType.ROOM_CLOSED,
                    "Room has been closed by the host", "System", roomId);
            broadcastToRoom(roomId, closeMessage);

            // Close the room
            chatRoomService.closeRoom(roomId);
        }
    }

    private void broadcastToRoom(String roomId, ChatMessage message) throws IOException {
        ChatRoom room = chatRoomService.getRoomById(roomId);
        if (room != null) {
            String messageJson = objectMapper.writeValueAsString(message);
            for (WebSocketSession session : room.getParticipants().values()) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(java.util.Objects.requireNonNull(messageJson)));
                }
            }
        }
    }

    private void handleFileUpload(WebSocketSession session, ChatMessage message, String roomId) throws IOException {
        String sessionId = session.getId();
        String uploadId = message.getUploadId();

        sessionUploads.putIfAbsent(sessionId, new ConcurrentHashMap<>());
        sessionUploadTypes.putIfAbsent(sessionId, new ConcurrentHashMap<>());

        switch (message.getType()) {
            case UPLOAD_START:
                sessionUploads.get(sessionId).put(uploadId, new StringBuilder());
                sessionUploadTypes.get(sessionId).put(uploadId, message.getFileType());
                System.out.println("Upload started: " + message.getFileName() + " (" + message.getFileType() + ")");
                break;

            case UPLOAD_CHUNK:
                StringBuilder buffer = sessionUploads.get(sessionId).get(uploadId);
                if (buffer != null && message.getContent() != null) {
                    buffer.append(message.getContent());
                }
                break;

            case UPLOAD_END:
                StringBuilder finalBuffer = sessionUploads.get(sessionId).remove(uploadId);
                String originalMessageType = sessionUploadTypes.get(sessionId).remove(uploadId);

                if (finalBuffer != null && originalMessageType != null) {
                    System.out.println("Upload finished: " + message.getFileName() + ", Size: " + finalBuffer.length());

                    ChatMessage fullMessage = new ChatMessage();
                    fullMessage.setType(ChatMessage.MessageType.valueOf(originalMessageType));

                    String mimeType = message.getFileType();
                    if (mimeType == null || mimeType.isEmpty()) {
                        // Try to guess from extension
                        String fileName = message.getFileName();
                        if (fileName != null) {
                            String lower = fileName.toLowerCase();
                            if (lower.endsWith(".png"))
                                mimeType = "image/png";
                            else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
                                mimeType = "image/jpeg";
                            else if (lower.endsWith(".gif"))
                                mimeType = "image/gif";
                            else if (lower.endsWith(".mp4"))
                                mimeType = "video/mp4";
                            else if (lower.endsWith(".webm"))
                                mimeType = "video/webm";
                        }
                        if (mimeType == null || mimeType.isEmpty()) {
                            mimeType = "application/octet-stream";
                        }
                    }

                    String dataUrl = "data:" + mimeType + ";base64," + finalBuffer.toString();

                    fullMessage.setContent(dataUrl);
                    fullMessage.setSender(message.getSender());
                    fullMessage.setRoomId(roomId);
                    fullMessage.setFileName(message.getFileName());
                    fullMessage.setFileType(mimeType);

                    broadcastToRoom(roomId, fullMessage);
                }
                break;
            default:
                break;
        }
    }

    private void sendUserListToRoom(String roomId) throws IOException {
        ChatRoom room = chatRoomService.getRoomById(roomId);
        if (room != null) {
            String userList = String.join(", ", room.getParticipantUsernames());
            ChatMessage userListMessage = new ChatMessage(ChatMessage.MessageType.USER_LIST,
                    userList, "System", roomId);
            broadcastToRoom(roomId, userListMessage);
        }
    }

    @Override
    public void handleTransportError(@NonNull WebSocketSession session, @NonNull Throwable exception) throws Exception {
        System.err.println("WebSocket transport error: " + exception.getMessage());
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus closeStatus)
            throws Exception {
        String username = sessionToUsername.get(session.getId());
        if (username != null) {
            handleLeaveRoom(session, username);
        }
        System.out.println("WebSocket connection closed: " + session.getId());
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }
}