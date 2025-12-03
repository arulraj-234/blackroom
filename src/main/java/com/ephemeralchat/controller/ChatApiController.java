package com.ephemeralchat.controller;

import com.ephemeralchat.dto.ChatRoomDTO;
import com.ephemeralchat.model.ChatRoom;
import com.ephemeralchat.service.ChatRoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*") // Allow all origins for development
public class ChatApiController {

    @Autowired
    private ChatRoomService chatRoomService;

    @PostMapping("/create")
    public ResponseEntity<?> createRoom(@RequestBody Map<String, String> payload) {
        String roomName = payload.get("roomName");
        String username = payload.get("username");

        if (roomName == null || username == null) {
            return ResponseEntity.badRequest().body("Missing roomName or username");
        }

        String roomId = chatRoomService.createRoom(roomName, username);
        return ResponseEntity.ok(Map.of("roomId", roomId));
    }

    @GetMapping("/room/{roomId}")
    public ResponseEntity<?> getRoomInfo(@PathVariable String roomId) {
        ChatRoom room = chatRoomService.getRoomById(roomId);
        if (room == null || !room.isActive()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new ChatRoomDTO(room));
    }

    @GetMapping("/check/{roomId}")
    public ResponseEntity<?> checkRoom(@PathVariable String roomId) {
        boolean exists = chatRoomService.roomExists(roomId);
        return ResponseEntity.ok(Map.of("exists", exists));
    }
}
