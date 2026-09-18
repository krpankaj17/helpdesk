package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreateUserRequest;
import com.datansh.HelpDesk.dto.CreateUserResponse;
import com.datansh.HelpDesk.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserController {
    private final UserService userService;
    public UserController(UserService userService){
        this.userService = userService;
    }
    @PostMapping
    public ResponseEntity<CreateUserResponse> createUser(@Valid @RequestBody CreateUserRequest request){

        return ResponseEntity.ok().body(userService.createUser(request));


    }
    @GetMapping
    public ResponseEntity<Page<CreateUserResponse>> getAllUser(@PageableDefault (size = 10,sort = "createdAt",direction = Sort.Direction.DESC)
                                                                   Pageable pageable){
        return ResponseEntity.ok().body(userService.getAllUsers(pageable));
    }
    @DeleteMapping("/{publicId}")
    public ResponseEntity<?>  deleteUser(@PathVariable UUID publicId){
        userService.deleteUser(publicId);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/{publicId}")
    public ResponseEntity<CreateUserResponse> updateUser(@PathVariable UUID publicId , @RequestBody CreateUserRequest request ) {
         return ResponseEntity.ok(userService.updateUser(publicId,request))  ;
    }
}
